import express from 'express';
import mongoose from 'mongoose';
import Progress from '../models/Progress.js';
import Exam from '../models/Exam.js';
import ExamAttempt from '../models/ExamAttempt.js';
import Enrollment from '../models/Enrollment.js';
import Schedule from '../models/Schedule.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get classroom ranking (XP leaderboard)
// @route   GET /api/ranking/:classroomId
// @access  Private (role-aware)
router.get('/:classroomId', protect, async (req, res) => {
    const { classroomId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(classroomId)) {
            return res.status(400).json({ message: 'Invalid Classroom ID' });
        }

        const classroomObjectId = new mongoose.Types.ObjectId(classroomId);

        // ==========================================
        // 1. AUTHORIZATION CHECK
        // ==========================================
        const userRole = req.user.role;
        let authorized = false;

        if (userRole === 'super_admin' || userRole === 'school_admin') {
            authorized = true;
        } else if (userRole === 'teacher') {
            // Verify teacher teaches this classroom
            const schedule = await Schedule.findOne({
                schoolId: req.user.schoolId,
                teacherId: req.user._id,
                classroomId: classroomObjectId
            });
            if (schedule) authorized = true;
        } else if (userRole === 'student') {
            // Verify student is enrolled in this classroom
            const enrollment = await Enrollment.findOne({
                schoolId: req.user.schoolId,
                studentId: req.user._id,
                classroomId: classroomObjectId,
                status: 'active'
            });
            if (enrollment) authorized = true;
        } else if (userRole === 'parent') {
            // Verify one of the parent's children is enrolled in this classroom
            const enrollment = await Enrollment.findOne({
                schoolId: req.user.schoolId,
                studentId: { $in: req.user.parentOf },
                classroomId: classroomObjectId,
                status: 'active'
            });
            if (enrollment) authorized = true;
        }

        if (!authorized) {
            return res.status(403).json({ message: 'Access denied: You do not have permission to view rankings for this classroom' });
        }

        // ==========================================
        // 2. AGGREGATE XP
        // ==========================================
        // A. Aggregate Progress XP (from chapter readings/quizzes)
        const progressXp = await Progress.aggregate([
            { 
                $match: { 
                    classroomId: classroomObjectId, 
                    schoolId: req.user.schoolId 
                } 
            },
            { 
                $group: { 
                    _id: '$userId', 
                    totalXp: { $sum: '$xp' } 
                } 
            }
        ]);

        // B. Aggregate Standalone Exam XP (exams not tied to a specific chapter)
        const nonChapterExams = await Exam.find({ 
            classroomId: classroomObjectId, 
            chapterId: null 
        }).select('_id');
        
        const nonChapterExamIds = nonChapterExams.map(e => e._id);

        const examXp = await ExamAttempt.aggregate([
            { 
                $match: { 
                    schoolId: req.user.schoolId, 
                    examId: { $in: nonChapterExamIds },
                    passed: true 
                } 
            },
            // Group by userId and examId, taking the max score per exam
            { 
                $group: { 
                    _id: { userId: '$userId', examId: '$examId' }, 
                    maxScore: { $max: '$score' } 
                } 
            },
            // Sum all max scores per student
            { 
                $group: { 
                    _id: '$_id.userId', 
                    totalXp: { $sum: '$maxScore' } 
                } 
            }
        ]);

        // ==========================================
        // 3. FETCH ENROLLED STUDENTS & MERGE
        // ==========================================
        const enrollments = await Enrollment.find({
            schoolId: req.user.schoolId,
            classroomId: classroomObjectId,
            status: 'active'
        }).populate('studentId', 'name email');

        const xpMap = {};
        
        // Initialize all active students
        for (const e of enrollments) {
            if (e.studentId) {
                const sidStr = e.studentId._id.toString();
                xpMap[sidStr] = {
                    userId: sidStr,
                    name: e.studentId.name,
                    email: e.studentId.email,
                    xp: 0,
                    isCurrentUser: sidStr === req.user._id.toString()
                };
            }
        }

        // Add Progress XP
        for (const p of progressXp) {
            const uidStr = p._id.toString();
            if (xpMap[uidStr]) {
                xpMap[uidStr].xp += p.totalXp;
            }
        }

        // Add Exam XP
        for (const e of examXp) {
            const uidStr = e._id.toString();
            if (xpMap[uidStr]) {
                xpMap[uidStr].xp += e.totalXp;
            }
        }

        // Sort by XP (descending)
        const rankings = Object.values(xpMap).sort((a, b) => b.xp - a.xp);

        // Assign ranks (handle ties)
        let rank = 1;
        for (let i = 0; i < rankings.length; i++) {
            if (i > 0 && rankings[i].xp < rankings[i - 1].xp) {
                rank = i + 1;
            }
            rankings[i].rank = rank;
        }

        res.json({
            rankings,
            totalStudents: rankings.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
