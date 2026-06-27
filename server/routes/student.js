import express from 'express';
import Enrollment from '../models/Enrollment.js';
import Schedule from '../models/Schedule.js';
import Attendance from '../models/Attendance.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import ExamAttempt from '../models/ExamAttempt.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(allowRoles('student'));

// Normalize a date to midnight UTC
const normalizeDate = (d) => {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

// @desc    Get student's own active classroom info
// @route   GET /api/student/classroom
// @access  Private (student)
router.get('/classroom', async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.user._id,
            status: 'active'
        }).populate({
            path: 'classroomId',
            populate: {
                path: 'homeroomTeacherId',
                select: 'name email'
            }
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'No active enrollment found for this student' });
        }

        res.json(enrollment.classroomId);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get student's own class schedule
// @route   GET /api/student/schedule
// @access  Private (student)
router.get('/schedule', async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.user._id,
            status: 'active'
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'No active enrollment found for this student' });
        }

        const schedules = await Schedule.find({
            schoolId: req.user.schoolId,
            classroomId: enrollment.classroomId
        })
        .populate('teacherId', 'name email')
        .populate('subjectId', 'title')
        .sort({ dayOfWeek: 1, startTime: 1 });

        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get student's own attendance history
// @route   GET /api/student/attendance/me
// @access  Private (student)
router.get('/attendance/me', async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const query = {
            schoolId: req.user.schoolId,
            studentId: req.user._id
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

// ==========================================
// STUDENT EXAMS ENDPOINTS
// ==========================================

// @desc    Get all published exams for the student's enrolled classroom
// @route   GET /api/student/exams
// @access  Private (student)
router.get('/exams', async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.user._id,
            status: 'active'
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'No active enrollment found for this student' });
        }

        // Find all published exams for this classroom
        const exams = await Exam.find({
            schoolId: req.user.schoolId,
            classroomId: enrollment.classroomId,
            isPublished: true
        }).populate('subjectId', 'title').populate('teacherId', 'name');

        // Fetch questions for each exam, hiding the correct answer
        const examsWithQuestions = await Promise.all(exams.map(async (exam) => {
            const questions = await Question.find({
                schoolId: req.user.schoolId,
                examId: exam._id
            })
            .select('-correctAnswer') // Crucial security step: hide correct answers
            .sort({ order: 1 });

            // Check if student has already attempted this exam
            const attempts = await ExamAttempt.find({
                schoolId: req.user.schoolId,
                userId: req.user._id,
                examId: exam._id
            }).sort({ takenAt: -1 });

            return {
                ...exam.toObject(),
                questions,
                attempts
            };
        }));

        res.json(examsWithQuestions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Submit answers for an exam
// @route   POST /api/student/exams/:id/submit
// @access  Private (student)
router.post('/exams/:id/submit', async (req, res) => {
    const { answers } = req.body; // Map/Object: { [questionId]: selectedOptionIndex }

    try {
        if (!answers) {
            return res.status(400).json({ message: 'Answers are required' });
        }

        const enrollment = await Enrollment.findOne({
            schoolId: req.user.schoolId,
            studentId: req.user._id,
            status: 'active'
        });

        if (!enrollment) {
            return res.status(403).json({ message: 'You are not enrolled in any classroom' });
        }

        const exam = await Exam.findOne({
            _id: req.params.id,
            schoolId: req.user.schoolId,
            classroomId: enrollment.classroomId,
            isPublished: true
        });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found or not published' });
        }

        // Fetch the questions WITH correct answers to grade
        const questions = await Question.find({
            schoolId: req.user.schoolId,
            examId: exam._id
        });

        let correctCount = 0;
        const gradingDetails = [];

        questions.forEach((q) => {
            const studentSelection = answers[String(q._id)];
            const isCorrect = studentSelection !== undefined && Number(studentSelection) === q.correctAnswer;
            
            if (isCorrect) {
                correctCount++;
            }

            gradingDetails.push({
                questionId: q._id,
                text: q.text,
                selectedOption: studentSelection !== undefined ? Number(studentSelection) : null,
                correctAnswer: q.correctAnswer,
                isCorrect
            });
        });

        const totalQuestions = questions.length;
        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
        const passed = score >= exam.passingScore;

        // Create attempt record
        const attempt = await ExamAttempt.create({
            schoolId: req.user.schoolId,
            userId: req.user._id,
            examId: exam._id,
            answers,
            score,
            passed
        });

        res.json({
            message: passed ? 'Congratulations! You passed the exam.' : 'You did not pass. Keep studying and try again!',
            score,
            passed,
            correctCount,
            totalQuestions,
            attempt,
            gradingDetails // Send details back so they know what they got wrong (optional, but good UX)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
