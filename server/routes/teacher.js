import express from 'express';
import Schedule from '../models/Schedule.js';
import Enrollment from '../models/Enrollment.js';
import Attendance from '../models/Attendance.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import ExamAttempt from '../models/ExamAttempt.js';
import User from '../models/User.js';
import Classroom from '../models/Classroom.js';
import { notifyUsers } from '../utils/notify.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { requireScheduleOwnership } from '../middleware/ownershipMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(allowRoles('teacher'));

// Normalize a date to midnight UTC
const normalizeDate = (d) => {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

// @desc    Get teacher's own weekly schedule
// @route   GET /api/teacher/schedule
// @access  Private (teacher)
router.get('/schedule', async (req, res) => {
    try {
        const schedules = await Schedule.find({
            schoolId: req.user.schoolId,
            teacherId: req.user._id
        })
        .populate('classroomId', 'name')
        .populate('subjectId', 'title')
        .sort({ dayOfWeek: 1, startTime: 1 });

        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get active students in an assigned classroom
// @route   GET /api/teacher/classrooms/:id/students
// @access  Private (teacher)
router.get('/classrooms/:id/students', async (req, res) => {
    try {
        // Verify teacher is scheduled for this classroom
        const isScheduled = await Schedule.findOne({
            schoolId: req.user.schoolId,
            teacherId: req.user._id,
            classroomId: req.params.id
        });

        if (!isScheduled) {
            return res.status(403).json({ message: 'Access denied: You are not scheduled to teach this classroom' });
        }

        // Get student enrollments
        const enrollments = await Enrollment.find({
            schoolId: req.user.schoolId,
            classroomId: req.params.id,
            status: 'active'
        }).populate('studentId', 'name email');

        const students = enrollments.map(e => ({
            _id: e.studentId._id,
            name: e.studentId.name,
            email: e.studentId.email,
            enrollmentId: e._id
        }));

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// ATTENDANCE ENDPOINTS
// ==========================================

// @desc    Submit bulk attendance for a classroom
// @route   POST /api/teacher/attendance
// @access  Private (teacher)
router.post('/attendance', requireScheduleOwnership, async (req, res) => {
    const { classroomId, date, records } = req.body; // records is [{ studentId, status }]

    try {
        if (!classroomId || !records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Classroom ID and records array are required' });
        }

        const attendanceDate = date ? normalizeDate(date) : normalizeDate(new Date());

        const ops = records.map(record => ({
            updateOne: {
                filter: {
                    schoolId: req.user.schoolId,
                    classroomId,
                    studentId: record.studentId,
                    date: attendanceDate
                },
                update: {
                    $set: {
                        status: record.status,
                        takenBy: req.user._id
                    }
                },
                upsert: true
            }
        }));

        await Attendance.bulkWrite(ops);

        // ---- Auto attendance alert: notify parents of absent/late students ----
        try {
            const flagged = records.filter(r => r.status === 'absent' || r.status === 'late');
            if (flagged.length) {
                const studentIds = flagged.map(r => r.studentId);
                const [students, classroom] = await Promise.all([
                    User.find({ _id: { $in: studentIds } }).select('name').lean(),
                    Classroom.findById(classroomId).select('name').lean(),
                ]);
                const nameById = Object.fromEntries(students.map(s => [String(s._id), s.name]));
                const statusById = Object.fromEntries(flagged.map(r => [String(r.studentId), r.status]));
                const dayStr = attendanceDate.toISOString().slice(0, 10);
                // parents of these students (User.parentOf contains the student id)
                const parents = await User.find({
                    schoolId: req.user.schoolId, role: 'parent', parentOf: { $in: studentIds }
                }).select('parentOf').lean();
                await Promise.all(parents.map(p => {
                    const child = (p.parentOf || []).map(String).find(id => statusById[id]);
                    if (!child) return null;
                    const st = statusById[child] === 'late' ? 'late' : 'absent';
                    return notifyUsers(req.user.schoolId, [p._id], {
                        type: 'attendance',
                        title: st === 'late' ? 'Your child was late today' : 'Your child was absent today',
                        body: `${nameById[child] || 'Student'} was marked ${st} in ${classroom?.name || 'class'} on ${dayStr}.`,
                    });
                }));
            }
        } catch (e) { console.error('attendance alert failed:', e.message); }

        res.json({ message: 'Attendance records updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get attendance report for a classroom
// @route   GET /api/teacher/attendance/:classroomId
// @access  Private (teacher)
router.get('/attendance/:classroomId', requireScheduleOwnership, async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        const query = {
            schoolId: req.user.schoolId,
            classroomId: req.params.classroomId
        };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = normalizeDate(startDate);
            if (endDate) query.date.$lte = normalizeDate(endDate);
        }

        const attendanceRecords = await Attendance.find(query)
            .populate('studentId', 'name email')
            .populate('takenBy', 'name')
            .sort({ date: -1 });

        res.json(attendanceRecords);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// EXAM ENDPOINTS
// ==========================================

// @desc    Create a new exam with questions
// @route   POST /api/teacher/exams
// @access  Private (teacher)
router.post('/exams', async (req, res) => {
    const { subjectId, classroomId, title, passingScore, timeLimit, questions } = req.body;

    try {
        if (!subjectId || !classroomId || !title || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ message: 'Subject, Classroom, Title, and Questions are required' });
        }

        // Verify teacher is scheduled for this classroom
        const isScheduled = await Schedule.findOne({
            schoolId: req.user.schoolId,
            teacherId: req.user._id,
            classroomId
        });

        if (!isScheduled) {
            return res.status(403).json({ message: 'Access denied: You are not scheduled to teach this classroom' });
        }

        // Create the Exam — published by default so students see it immediately
        // (a teacher creating an exam means it's ready to take). Override with
        // isPublished:false in the body to save a draft.
        const exam = await Exam.create({
            schoolId: req.user.schoolId,
            subjectId,
            teacherId: req.user._id,
            classroomId,
            title,
            passingScore: passingScore || 70,
            timeLimit: timeLimit || null,
            isPublished: req.body.isPublished !== undefined ? req.body.isPublished : true
        });

        // Create Questions
        const questionDocs = questions.map((q, idx) => ({
            schoolId: req.user.schoolId,
            examId: exam._id,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            order: q.order !== undefined ? q.order : idx
        }));

        await Question.insertMany(questionDocs);

        res.status(201).json({
            message: 'Exam and questions created successfully',
            exam
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Edit/Update an exam details or questions
// @route   PATCH /api/teacher/exams/:id
// @access  Private (teacher)
router.patch('/exams/:id', async (req, res) => {
    const { title, passingScore, timeLimit, isPublished, questions } = req.body;

    try {
        const exam = await Exam.findOne({ _id: req.params.id, schoolId: req.user.schoolId, teacherId: req.user._id });
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found or you are not authorized' });
        }

        if (title) exam.title = title;
        if (passingScore !== undefined) exam.passingScore = passingScore;
        if (timeLimit !== undefined) exam.timeLimit = timeLimit;
        if (isPublished !== undefined) exam.isPublished = isPublished;

        await exam.save();

        // If new questions array is passed, replace the old ones
        if (questions && Array.isArray(questions)) {
            await Question.deleteMany({ examId: exam._id, schoolId: req.user.schoolId });
            
            const questionDocs = questions.map((q, idx) => ({
                schoolId: req.user.schoolId,
                examId: exam._id,
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                order: q.order !== undefined ? q.order : idx
            }));

            await Question.insertMany(questionDocs);
        }

        res.json({ message: 'Exam updated successfully', exam });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all exams created by the teacher
// @route   GET /api/teacher/exams
// @access  Private (teacher)
router.get('/exams', async (req, res) => {
    try {
        const query = {
            schoolId: req.user.schoolId,
            teacherId: req.user._id
        };
        if (req.query.classroomId) {
            query.classroomId = req.query.classroomId;
        }
        const exams = await Exam.find(query)
            .populate('subjectId', 'title')
            .populate('classroomId', 'name')
            .sort({ createdAt: -1 });
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get student attempts/results for an exam
// @route   GET /api/teacher/exams/:id/results
// @access  Private (teacher)
router.get('/exams/:id/results', async (req, res) => {
    try {
        // Verify teacher ownership of exam
        const exam = await Exam.findOne({ _id: req.params.id, schoolId: req.user.schoolId, teacherId: req.user._id });
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found or you are not authorized' });
        }

        const attempts = await ExamAttempt.find({
            schoolId: req.user.schoolId,
            examId: exam._id
        })
        .populate('userId', 'name email')
        .sort({ score: -1, takenAt: -1 });

        res.json(attempts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
