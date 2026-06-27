import express from 'express';
import FeeStructure from '../models/FeeStructure.js';
import Invoice from '../models/Invoice.js';
import Enrollment from '../models/Enrollment.js';
import Classroom from '../models/Classroom.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(protect);

const schoolOf = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;

// Find active students whose classroom is at the given grade level.
// Classroom has no gradeLevel field — grade is encoded in the name ("Grade N-X"),
// so we match by an explicit gradeLevel field if present, else by the name pattern.
async function studentsAtGrade(schoolId, gradeLevel) {
    const namePattern = new RegExp(`^Grade\\s*${gradeLevel}[-\\s]`, 'i');
    let classrooms = await Classroom.find({
        schoolId, $or: [{ gradeLevel }, { name: namePattern }],
    }).select('_id').lean();
    if (!classrooms.length) return [];
    const classroomIds = classrooms.map(c => c._id);
    const enrollments = await Enrollment.find({
        schoolId, classroomId: { $in: classroomIds }, status: 'active',
    }).select('studentId').lean();
    return [...new Set(enrollments.map(e => String(e.studentId)))];
}

// Create a fee structure (admin)
// POST /api/finance/fees { gradeLevel, term, label, amount }
router.post('/fees', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { gradeLevel, term, label = 'Tuition', amount } = req.body;
        if (gradeLevel == null || !term || amount == null) {
            return res.status(400).json({ message: 'gradeLevel, term and amount are required' });
        }
        const fee = await FeeStructure.create({ schoolId, gradeLevel, term, label, amount });
        res.status(201).json(fee);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List fee structures (admin)
// GET /api/finance/fees
router.get('/fees', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const list = await FeeStructure.find({ schoolId }).sort({ gradeLevel: 1, term: 1, label: 1 }).lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Generate invoices for all active students at a grade (admin)
// POST /api/finance/invoices/generate { feeStructureId } OR { gradeLevel, term, amount, description, dueDate }
router.post('/invoices/generate', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        let { feeStructureId, gradeLevel, term, amount, description, dueDate } = req.body;

        let feeStructure = null;
        if (feeStructureId) {
            feeStructure = await FeeStructure.findOne({ _id: feeStructureId, schoolId }).lean();
            if (!feeStructure) return res.status(404).json({ message: 'Fee structure not found' });
            gradeLevel = feeStructure.gradeLevel;
            term = feeStructure.term;
            amount = feeStructure.amount;
            description = description || `${feeStructure.label} - ${feeStructure.term}`;
        }

        if (gradeLevel == null || amount == null) {
            return res.status(400).json({ message: 'gradeLevel and amount are required' });
        }
        if (!description) description = term ? `Fee - ${term}` : 'Fee';
        const due = dueDate ? new Date(dueDate) : new Date();

        const studentIds = await studentsAtGrade(schoolId, Number(gradeLevel));

        let created = 0;
        for (const studentId of studentIds) {
            const exists = await Invoice.findOne({
                schoolId, studentId, description, status: 'unpaid',
            }).lean();
            if (exists) continue;
            await Invoice.create({
                schoolId, studentId,
                feeStructureId: feeStructure ? feeStructure._id : null,
                description, amount, dueDate: due,
            });
            created += 1;
        }
        res.status(201).json({ created });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List invoices — scoped by role (admin: all; parent: own children; student: self)
// GET /api/finance/invoices?status=&studentId=
router.get('/invoices', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const role = req.user.role;
        const query = { schoolId };

        if (role === 'school_admin' || role === 'super_admin') {
            if (req.query.status) query.status = req.query.status;
            if (req.query.studentId) query.studentId = req.query.studentId;
        } else if (role === 'parent') {
            query.studentId = { $in: req.user.parentOf || [] };
        } else if (role === 'student') {
            query.studentId = req.user._id;
        } else {
            return res.status(403).json({ message: 'Access denied: insufficient permissions' });
        }

        const list = await Invoice.find(query).sort({ dueDate: 1, createdAt: -1 })
            .populate('studentId', 'name').lean();

        const now = new Date();
        const overdueIds = [];
        for (const inv of list) {
            if (inv.status === 'unpaid' && inv.dueDate && new Date(inv.dueDate) < now) {
                inv.status = 'overdue';
                overdueIds.push(inv._id);
            }
        }
        if (overdueIds.length) {
            await Invoice.updateMany({ _id: { $in: overdueIds } }, { $set: { status: 'overdue' } });
        }

        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Record a payment against an invoice (admin)
// PATCH /api/finance/invoices/:id/pay { amount }
router.patch('/invoices/:id/pay', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { amount } = req.body;
        if (amount == null) return res.status(400).json({ message: 'amount is required' });

        const invoice = await Invoice.findOne({ _id: req.params.id, schoolId });
        if (!invoice) return res.status(404).json({ message: 'Not found' });

        invoice.paidAmount = (invoice.paidAmount || 0) + Number(amount);
        if (invoice.paidAmount >= invoice.amount) {
            invoice.status = 'paid';
            invoice.paidAt = new Date();
        } else {
            invoice.status = 'partial';
        }
        await invoice.save();
        res.json(invoice);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Finance summary across the school (admin)
// GET /api/finance/summary
router.get('/summary', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const sid = typeof schoolId === 'string'
            ? new (await import('mongoose')).default.Types.ObjectId(schoolId)
            : schoolId;

        const now = new Date();
        const [agg] = await Invoice.aggregate([
            { $match: { schoolId: sid } },
            {
                $group: {
                    _id: null,
                    totalInvoiced: { $sum: '$amount' },
                    totalCollected: { $sum: '$paidAmount' },
                    overdueCount: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ['$status', 'overdue'] },
                                        { $and: [{ $eq: ['$status', 'unpaid'] }, { $lt: ['$dueDate', now] }] },
                                    ],
                                },
                                1, 0,
                            ],
                        },
                    },
                },
            },
        ]);

        const totalInvoiced = agg ? agg.totalInvoiced : 0;
        const totalCollected = agg ? agg.totalCollected : 0;
        res.json({
            totalInvoiced,
            totalCollected,
            totalOutstanding: totalInvoiced - totalCollected,
            overdueCount: agg ? agg.overdueCount : 0,
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Online checkout for a single invoice (parent pays own child's, or student self).
// TEST MODE: with no payment-gateway keys configured we simulate a successful
// charge and mark the invoice paid. To go live, set STRIPE_SECRET and create a
// real Checkout Session / PaymentIntent here, then mark paid in the webhook.
// POST /api/finance/invoices/:id/checkout
router.post('/invoices/:id/checkout', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const invoice = await Invoice.findOne({ _id: req.params.id, schoolId });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // authorization
        const role = req.user.role;
        const ownsIt =
            role === 'school_admin' || role === 'super_admin' ||
            (role === 'parent' && (req.user.parentOf || []).map(String).includes(String(invoice.studentId))) ||
            (role === 'student' && String(invoice.studentId) === String(req.user._id));
        if (!ownsIt) return res.status(403).json({ message: 'Not allowed to pay this invoice' });

        const live = !!process.env.STRIPE_SECRET;
        if (live) {
            // SEAM: create a real Stripe Checkout Session and return its URL.
            // const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET);
            // const session = await stripe.checkout.sessions.create({ ... });
            // return res.json({ testMode: false, url: session.url });
        }

        // TEST MODE: simulate a successful payment.
        const due = invoice.amount - (invoice.paidAmount || 0);
        invoice.paidAmount = invoice.amount;
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        await invoice.save();
        res.json({
            testMode: true,
            reference: 'TEST-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
            charged: due,
            invoice,
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
