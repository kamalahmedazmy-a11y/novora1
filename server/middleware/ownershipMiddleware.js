import Schedule from '../models/Schedule.js';
import Enrollment from '../models/Enrollment.js';

export const requireScheduleOwnership = async (req, res, next) => {
    try {
        const classroomId = req.params.classroomId || req.body.classroomId || req.query.classroomId;
        if (!classroomId) {
            return res.status(400).json({ message: 'Classroom ID is required' });
        }

        // School admins and super admins bypass scheduling checks
        if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
            return next();
        }

        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied: Requires teacher role' });
        }

        // Check if there is a schedule entry for this teacher and classroom
        const schedule = await Schedule.findOne({
            schoolId: req.user.schoolId,
            teacherId: req.user._id,
            classroomId
        });

        if (!schedule) {
            return res.status(403).json({ message: 'Access denied: You are not assigned to this classroom' });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const requireEnrollment = async (req, res, next) => {
    try {
        // Only enforce enrollment for students
        if (req.user.role !== 'student') {
            return next();
        }

        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.user._id,
            status: 'active'
        });

        if (!enrollment) {
            return res.status(403).json({ message: 'Access denied: Student is not actively enrolled in any classroom' });
        }

        // Attach classroomId to the request context
        req.classroomId = enrollment.classroomId;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
