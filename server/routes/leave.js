import express from 'express';
import LeaveRequest from '../models/LeaveRequest.js';
import TeacherAbsence from '../models/TeacherAbsence.js';
import User from '../models/User.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { notifyUsers, notifyUser } from '../utils/notify.js';
import { schoolOf, midnight } from '../utils/requestContext.js';

const router = express.Router();
router.use(protect);


// Submit a leave request (teacher) — notifies all school admins
// POST /api/leave { fromDate, toDate, reason }
router.post('/', allowRoles('teacher'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { fromDate, toDate, reason } = req.body;
        if (!fromDate || !toDate) return res.status(400).json({ message: 'fromDate and toDate required' });
        const lr = await LeaveRequest.create({
            schoolId, requesterId: req.user._id,
            fromDate: midnight(fromDate), toDate: midnight(toDate), reason: reason || '',
        });
        const admins = await User.find({ schoolId, role: 'school_admin' }).select('_id').lean();
        await notifyUsers(schoolId, admins.map(a => a._id), {
            type: 'leave', title: 'New leave request',
            body: `${req.user.name} requested leave ${fromDate} → ${toDate}.`,
        });
        res.status(201).json(lr);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List — admin: all (filter ?status=); teacher: own
// GET /api/leave
router.get('/', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const query = { schoolId };
        if (req.user.role === 'teacher') query.requesterId = req.user._id;
        if (req.query.status) query.status = req.query.status;
        const list = await LeaveRequest.find(query).sort({ createdAt: -1 })
            .populate('requesterId', 'name email').lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Review (admin) — approve/reject. Approval auto-creates TeacherAbsence per day.
// PATCH /api/leave/:id { status }
router.patch('/:id', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'status must be approved|rejected' });
        const lr = await LeaveRequest.findOne({ _id: req.params.id, schoolId });
        if (!lr) return res.status(404).json({ message: 'Not found' });
        lr.status = status; lr.reviewedBy = req.user._id; lr.reviewedAt = new Date();
        await lr.save();

        let absencesCreated = 0;
        if (status === 'approved') {
            // create a TeacherAbsence for every day in [fromDate, toDate]
            for (let d = new Date(lr.fromDate); d <= lr.toDate; d.setUTCDate(d.getUTCDate() + 1)) {
                await TeacherAbsence.findOneAndUpdate(
                    { schoolId, teacherId: lr.requesterId, date: midnight(d) },
                    { reason: lr.reason || 'Approved leave', reportedBy: req.user._id, status: 'reported' },
                    { upsert: true, setDefaultsOnInsert: true }
                );
                absencesCreated++;
            }
        }
        await notifyUser(schoolId, lr.requesterId, {
            type: 'leave', title: `Leave ${status}`,
            body: status === 'approved' ? 'Your leave request was approved.' : 'Your leave request was rejected.',
        });
        res.json({ leave: lr, absencesCreated });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
