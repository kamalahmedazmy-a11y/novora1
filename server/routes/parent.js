import express from 'express';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Progress from '../models/Progress.js';
import Attendance from '../models/Attendance.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(allowRoles('parent'));

// Normalize a date to midnight UTC
const normalizeDate = (d) => {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

// Middleware to verify that the parent is actually linked to the child requested
const verifyChildLink = (req, res, next) => {
    const childId = req.params.childId;
    if (!req.user.parentOf || !req.user.parentOf.some(id => id.toString() === childId)) {
        return res.status(403).json({ message: 'Access denied: Student is not linked to this parent account' });
    }
    next();
};

// @desc    Get all linked children profiles
// @route   GET /api/parent/children
// @access  Private (parent)
router.get('/children', async (req, res) => {
    try {
        const children = await User.find({
            _id: { $in: req.user.parentOf },
            schoolId: req.user.schoolId
        }).select('-password');
        
        res.json(children);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get a linked child's enrolled classroom
// @route   GET /api/parent/children/:childId/classroom
// @access  Private (parent)
router.get('/children/:childId/classroom', verifyChildLink, async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.params.childId,
            status: 'active'
        }).populate('classroomId');

        if (!enrollment) {
            return res.status(404).json({ message: 'No active enrollment found for this child' });
        }

        res.json(enrollment.classroomId);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get a linked child's progress summary
// @route   GET /api/parent/children/:childId/progress
// @access  Private (parent)
router.get('/children/:childId/progress', verifyChildLink, async (req, res) => {
    try {
        const progress = await Progress.find({
            schoolId: req.user.schoolId,
            userId: req.params.childId
        }).populate('chapterId', 'title description order');

        res.json(progress);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get a linked child's attendance record
// @route   GET /api/parent/children/:childId/attendance
// @access  Private (parent)
router.get('/children/:childId/attendance', verifyChildLink, async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const query = {
            schoolId: req.user.schoolId,
            studentId: req.params.childId
        };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = normalizeDate(startDate);
            if (endDate) query.date.$lte = normalizeDate(endDate);
        }

        const attendance = await Attendance.find(query)
            .populate('takenBy', 'name')
            .sort({ date: -1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
