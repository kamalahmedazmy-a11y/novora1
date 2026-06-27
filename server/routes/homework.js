import express from 'express';
import Homework from '../models/Homework.js';
import Enrollment from '../models/Enrollment.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { notifyUsers } from '../utils/notify.js';

const router = express.Router();
router.use(protect);

const schoolOf = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;

// Create (teacher) — notifies students actively enrolled in the classroom
// POST /api/homework { classroomId, subjectId, title, description, dueDate }
router.post('/', allowRoles('teacher'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { classroomId, subjectId, title, description, dueDate } = req.body;
        if (!classroomId || !title) return res.status(400).json({ message: 'classroomId and title required' });
        const homework = await Homework.create({
            schoolId, classroomId, subjectId,
            teacherId: req.user._id,
            title, description: description || '', dueDate,
        });
        const enrollments = await Enrollment.find({ schoolId, classroomId, status: 'active' })
            .select('studentId').lean();
        const studentIds = enrollments.map(e => e.studentId);
        if (studentIds.length) {
            await notifyUsers(schoolId, studentIds, {
                type: 'general',
                title: 'New homework: ' + title,
                body: (description || '').slice(0, 140),
            });
        }
        res.status(201).json(homework);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List — role-scoped
// GET /api/homework
router.get('/', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const role = req.user.role;
        const query = { schoolId };

        if (role === 'teacher') {
            query.teacherId = req.user._id;
        } else if (role === 'student') {
            const enrollments = await Enrollment.find({ schoolId, studentId: req.user._id, status: 'active' })
                .select('classroomId').lean();
            query.classroomId = { $in: enrollments.map(e => e.classroomId) };
        } else if (role === 'parent') {
            const enrollments = await Enrollment.find({
                schoolId, studentId: { $in: req.user.parentOf || [] }, status: 'active'
            }).select('classroomId').lean();
            query.classroomId = { $in: enrollments.map(e => e.classroomId) };
        } else {
            // admin / super_admin — all in school, optional classroom filter
            if (req.query.classroomId) query.classroomId = req.query.classroomId;
        }

        const list = await Homework.find(query)
            .sort({ dueDate: 1 }).limit(100)
            .populate('classroomId', 'name')
            .populate('subjectId', 'title')
            .populate('teacherId', 'name')
            .lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete (owning teacher, or admin)
// DELETE /api/homework/:id
router.delete('/:id', allowRoles('teacher', 'school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const query = { _id: req.params.id, schoolId };
        if (req.user.role === 'teacher') query.teacherId = req.user._id;
        const r = await Homework.deleteOne(query);
        if (!r.deletedCount) return res.status(404).json({ message: 'Not found' });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
