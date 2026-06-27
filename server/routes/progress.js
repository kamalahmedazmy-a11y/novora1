import express from 'express';
import mongoose from 'mongoose';
import Progress from '../models/Progress.js';
import Chapter from '../models/Chapter.js';
import User from '../models/User.js';
import Exam from '../models/Exam.js';
import ExamAttempt from '../models/ExamAttempt.js';
import Enrollment from '../models/Enrollment.js';
import protect from '../middleware/authMiddleware.js';
import { requireEnrollment } from '../middleware/ownershipMiddleware.js';

const router = express.Router();

// Helper to build legacy progress payload
const buildLegacyProgress = async (schoolId, userId) => {
    const progressDocs = await Progress.find({ schoolId, userId }).populate('chapterId');
    const completedChapters = progressDocs
        .filter(p => p.completionPercent === 100 && p.chapterId)
        .map(p => p.chapterId.id);

    const attempts = await ExamAttempt.find({ schoolId, userId }).populate({
        path: 'examId',
        populate: {
            path: 'chapterId'
        }
    });

    const examScores = {};
    for (const attempt of attempts) {
        if (attempt.examId && attempt.examId.chapterId) {
            const chapId = String(attempt.examId.chapterId.id);
            if (examScores[chapId] === undefined || attempt.score > examScores[chapId]) {
                examScores[chapId] = attempt.score;
            }
        }
    }

    return {
        completedChapters,
        examScores
    };
};

// @desc    Get user progress (mapped to legacy format for frontend compatibility)
// @route   GET /api/progress
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const legacyData = await buildLegacyProgress(req.user.schoolId, req.user._id);
        res.json(legacyData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get classroom-scoped leaderboard (for backwards compatibility with ProgressDashboard)
// @route   GET /api/progress/leaderboard
// @access  Private
router.get('/leaderboard', protect, async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.user._id,
            status: 'active'
        });

        if (!enrollment) {
            return res.json({ leaderboard: [], totalStudents: 0, totalChapters: 0 });
        }

        const classroomId = enrollment.classroomId;

        const progressXp = await Progress.aggregate([
            { $match: { classroomId, schoolId: req.user.schoolId } },
            { $group: { _id: '$userId', totalXp: { $sum: '$xp' } } }
        ]);

        const enrollments = await Enrollment.find({
            schoolId: req.user.schoolId,
            classroomId,
            status: 'active'
        }).populate('studentId', 'name email');

        const xpMap = {};
        for (const e of enrollments) {
            if (e.studentId) {
                const sidStr = e.studentId._id.toString();
                xpMap[sidStr] = {
                    userId: sidStr,
                    name: e.studentId.name,
                    email: e.studentId.email,
                    completionPercent: 0,
                    isCurrentUser: sidStr === req.user._id.toString(),
                    xp: 0
                };
            }
        }

        for (const p of progressXp) {
            const uidStr = p._id.toString();
            if (xpMap[uidStr]) {
                xpMap[uidStr].xp += p.totalXp;
            }
        }

        const rankings = Object.values(xpMap).sort((a, b) => b.xp - a.xp);

        let rank = 1;
        const totalChapters = await Chapter.countDocuments();
        
        for (let i = 0; i < rankings.length; i++) {
            if (i > 0 && rankings[i].xp < rankings[i - 1].xp) {
                rank = i + 1;
            }
            rankings[i].rank = rank;
            rankings[i].completionPercent = Math.min(rankings[i].xp, 100);
        }

        res.json({
            leaderboard: rankings,
            totalStudents: rankings.length,
            totalChapters
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Submit exam score (from chapter quizzes)
// @route   POST /api/progress/submit-exam
// @access  Private
router.post('/submit-exam', protect, requireEnrollment, async (req, res) => {
    const { chapterId, score } = req.body;

    try {
        const chapter = await Chapter.findOne({ id: chapterId });
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        // Find or create classroom enrollment context
        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.user._id,
            status: 'active'
        });

        const classroomId = enrollment ? enrollment.classroomId : null;
        if (!classroomId) {
            return res.status(400).json({ message: 'Student is not actively enrolled in any classroom' });
        }

        // Find or create Exam for this chapter
        let exam = await Exam.findOne({ schoolId: req.user.schoolId, chapterId: chapter._id });
        if (!exam) {
            exam = await Exam.create({
                schoolId: req.user.schoolId,
                subjectId: chapter.subjectId,
                teacherId: req.user._id,
                classroomId,
                title: `${chapter.title} Quiz`,
                passingScore: 70,
                chapterId: chapter._id
            });
        }

        const passed = score >= exam.passingScore;

        // Log attempt
        await ExamAttempt.create({
            schoolId: req.user.schoolId,
            userId: req.user._id,
            examId: exam._id,
            answers: {}, // legacy submission has no detailed answer mapping
            score,
            passed
        });

        // Update progress
        let progress = await Progress.findOne({
            schoolId: req.user.schoolId,
            userId: req.user._id,
            chapterId: chapter._id
        });

        if (!progress) {
            progress = await Progress.create({
                schoolId: req.user.schoolId,
                userId: req.user._id,
                chapterId: chapter._id,
                classroomId,
                completionPercent: 0,
                xp: 0
            });
        }

        if (passed) {
            progress.completionPercent = 100;
            // Award 100 XP for completion, plus extra XP matching their score
            progress.xp = 100 + Math.round(score);
            await progress.save();
        }

        const legacyData = await buildLegacyProgress(req.user.schoolId, req.user._id);

        res.json({
            message: passed ? 'Exam passed!' : 'Keep trying!',
            passed,
            progress: legacyData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
