import express from 'express';
import mongoose from 'mongoose';
import ExamAttempt from '../models/ExamAttempt.js';
import Exam from '../models/Exam.js';
import Subject from '../models/Subject.js';
import Attendance from '../models/Attendance.js';
import Enrollment from '../models/Enrollment.js';
import Classroom from '../models/Classroom.js';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

const round1 = (n) => Math.round(n * 10) / 10;

// GET /:studentId — aggregated report card for a student
router.get('/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'Invalid studentId' });
        }

        const schoolId = req.user.schoolId || req.query.schoolId;
        const role = req.user.role;

        // Authorization
        if (role === 'parent') {
            const allowed = (req.user.parentOf || []).some(id => String(id) === String(studentId));
            if (!allowed) return res.status(403).json({ message: 'Access denied' });
        } else if (role === 'student') {
            if (String(req.user._id) !== String(studentId)) {
                return res.status(403).json({ message: 'Access denied' });
            }
        } else if (!['school_admin', 'super_admin', 'teacher'].includes(role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Resolve student (scoped to school for non-super admins)
        const studentQuery = { _id: studentId };
        if (role !== 'super_admin' && schoolId) studentQuery.schoolId = schoolId;
        const student = await User.findOne(studentQuery).select('name role schoolId').lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const effectiveSchoolId = schoolId || student.schoolId;

        // Active enrollment -> classroom name
        const enrollment = await Enrollment.findOne({
            schoolId: effectiveSchoolId,
            studentId,
            status: 'active',
        }).sort({ createdAt: -1 }).lean();

        let className = null;
        if (enrollment) {
            const classroom = await Classroom.findById(enrollment.classroomId).select('name').lean();
            className = classroom?.name || null;
        }

        // Grades: all attempts for this student in this school
        const attempts = await ExamAttempt.find({
            schoolId: effectiveSchoolId,
            userId: studentId,
        }).select('examId score').lean();

        let subjects = [];
        let overallAverage = null;

        if (attempts.length) {
            const examIds = [...new Set(attempts.map(a => String(a.examId)))]
                .map(id => new mongoose.Types.ObjectId(id));
            const exams = await Exam.find({ _id: { $in: examIds } })
                .select('subjectId').lean();
            const examToSubject = new Map(exams.map(e => [String(e._id), String(e.subjectId)]));

            const subjectIds = [...new Set([...examToSubject.values()])]
                .map(id => new mongoose.Types.ObjectId(id));
            const subjectDocs = await Subject.find({ _id: { $in: subjectIds } })
                .select('title').lean();
            const subjectTitle = new Map(subjectDocs.map(s => [String(s._id), s.title]));

            // Group scores by subject
            const groups = new Map(); // subjectId -> { sum, count }
            let total = 0;
            for (const a of attempts) {
                total += a.score;
                const subId = examToSubject.get(String(a.examId));
                if (!subId) continue;
                const g = groups.get(subId) || { sum: 0, count: 0 };
                g.sum += a.score;
                g.count += 1;
                groups.set(subId, g);
            }

            subjects = [...groups.entries()].map(([subId, g]) => ({
                subject: subjectTitle.get(subId) || 'Unknown',
                average: round1(g.sum / g.count),
                examsCount: g.count,
            }));

            overallAverage = round1(total / attempts.length);
        }

        // Attendance counts
        const attendanceRecords = await Attendance.find({
            schoolId: effectiveSchoolId,
            studentId,
        }).select('status').lean();

        const attendance = { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 };
        for (const r of attendanceRecords) {
            if (attendance[r.status] !== undefined) attendance[r.status] += 1;
            attendance.total += 1;
        }
        attendance.rate = attendance.total
            ? Math.round((attendance.present / attendance.total) * 100)
            : 0;

        // Recent incidents
        const incidentDocs = await Incident.find({
            schoolId: effectiveSchoolId,
            studentId,
        }).sort({ date: -1 }).limit(10).select('type severity description date').lean();

        const incidents = incidentDocs.map(i => ({
            type: i.type,
            severity: i.severity,
            description: i.description,
            date: i.date,
        }));

        res.json({
            student: { id: student._id, name: student.name, class: className },
            subjects,
            overallAverage,
            attendance,
            incidents,
            generatedAt: new Date(),
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

export default router;
