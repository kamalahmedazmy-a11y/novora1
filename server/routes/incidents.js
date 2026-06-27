import express from 'express';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { notifyUsers } from '../utils/notify.js';

const router = express.Router();
router.use(protect);

const schoolOf = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;

// Create (admin or teacher) — notifies the student's parents
// POST /api/incidents { studentId, type, severity, description, actionTaken, date }
router.post('/', allowRoles('school_admin', 'super_admin', 'teacher'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { studentId, type, severity, description, actionTaken, date } = req.body;
        if (!studentId || !description) return res.status(400).json({ message: 'studentId and description required' });
        const incident = await Incident.create({
            schoolId, studentId, type, severity, description,
            actionTaken: actionTaken || '', reportedBy: req.user._id, date: date || new Date(),
        });
        const [student, parents] = await Promise.all([
            User.findById(studentId).select('name').lean(),
            User.find({ schoolId, role: 'parent', parentOf: studentId }).select('_id').lean(),
        ]);
        if (parents.length && type !== 'achievement') {
            await notifyUsers(schoolId, parents.map(p => p._id), {
                type: 'incident', title: `Incident logged for ${student?.name || 'your child'}`,
                body: description.slice(0, 140),
            });
        }
        res.status(201).json(incident);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List — admin: all (or ?studentId); teacher: their reports; parent: their children
// GET /api/incidents
router.get('/', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const role = req.user.role;
        const query = { schoolId };
        if (role === 'parent') query.studentId = { $in: req.user.parentOf || [] };
        else if (role === 'teacher') query.reportedBy = req.user._id;
        if (req.query.studentId) query.studentId = req.query.studentId;
        const list = await Incident.find(query).sort({ date: -1 }).limit(100)
            .populate('studentId', 'name').populate('reportedBy', 'name').lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete (admin)
router.delete('/:id', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const r = await Incident.deleteOne({ _id: req.params.id, schoolId });
        if (!r.deletedCount) return res.status(404).json({ message: 'Not found' });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
