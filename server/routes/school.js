import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AcademicYear from '../models/AcademicYear.js';
import Classroom from '../models/Classroom.js';
import Enrollment from '../models/Enrollment.js';
import Schedule from '../models/Schedule.js';
import Subject from '../models/Subject.js';
import Attendance from '../models/Attendance.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(allowRoles('school_admin'));

// ==========================================
// 1. USER MANAGEMENT
// ==========================================

// @desc    Get all users in the school (teachers, students, parents)
// @route   GET /api/school/users
// @access  Private (school_admin)
router.get('/users', async (req, res) => {
    try {
        const { role } = req.query;
        const query = { schoolId: req.user.schoolId };
        
        if (role) {
            query.role = role;
        }

        const users = await User.find(query).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add a new user to the school
// @route   POST /api/school/users
// @access  Private (school_admin)
router.post('/users', async (req, res) => {
    const { name, email, password, role, parentOf } = req.body;

    try {
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        if (role === 'super_admin') {
            return res.status(403).json({ message: 'Cannot create super admin from school route' });
        }

        // Check if user already exists in this school
        const userExists = await User.findOne({ schoolId: req.user.schoolId, email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists in this school' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            schoolId: req.user.schoolId,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
            parentOf: parentOf || [],
        });

        res.status(201).json({
            _id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            schoolId: newUser.schoolId,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a user's details or role
// @route   PATCH /api/school/users/:id
// @access  Private (school_admin)
router.patch('/users/:id', async (req, res) => {
    const { name, email, role, isActive, parentOf } = req.body;

    try {
        const user = await User.findOne({ _id: req.params.id, schoolId: req.user.schoolId });

        if (!user) {
            return res.status(404).json({ message: 'User not found in this school' });
        }

        if (name) user.name = name;
        if (email) user.email = email.toLowerCase();
        if (role && role !== 'super_admin') user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        if (parentOf) user.parentOf = parentOf;

        await user.save();

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            parentOf: user.parentOf,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a user from the school
// @route   DELETE /api/school/users/:id
// @access  Private (school_admin)
router.delete('/users/:id', async (req, res) => {
    try {
        const result = await User.deleteOne({ _id: req.params.id, schoolId: req.user.schoolId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'User not found in this school' });
        }

        res.json({ message: 'User removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 2. ACADEMIC YEARS
// ==========================================

// @desc    Get all academic years
// @route   GET /api/school/academic-years
// @access  Private (school_admin)
router.get('/academic-years', async (req, res) => {
    try {
        const years = await AcademicYear.find({ schoolId: req.user.schoolId }).sort({ order: 1, name: 1 });
        res.json(years);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a new academic year
// @route   POST /api/school/academic-years
// @access  Private (school_admin)
router.post('/academic-years', async (req, res) => {
    const { name, startDate, endDate, isActive, order } = req.body;
    try {
        if (!name || !startDate || !endDate) {
            return res.status(400).json({ message: 'Name, startDate, and endDate are required' });
        }

        // If isActive is true, set all other academic years in this school to inactive
        if (isActive) {
            await AcademicYear.updateMany({ schoolId: req.user.schoolId }, { isActive: false });
        }

        const year = await AcademicYear.create({
            schoolId: req.user.schoolId,
            name,
            startDate,
            endDate,
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0
        });

        res.status(201).json(year);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 3. CLASSROOMS
// ==========================================

// @desc    Get all classrooms for a specific academic year
// @route   GET /api/school/classrooms
// @access  Private (school_admin)
router.get('/classrooms', async (req, res) => {
    try {
        const { academicYearId } = req.query;
        const query = { schoolId: req.user.schoolId };
        if (academicYearId) {
            query.academicYearId = academicYearId;
        }
        const classrooms = await Classroom.find(query).populate('homeroomTeacherId', 'name email');
        res.json(classrooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a new classroom
// @route   POST /api/school/classrooms
// @access  Private (school_admin)
router.post('/classrooms', async (req, res) => {
    const { academicYearId, name, homeroomTeacherId } = req.body;
    try {
        if (!academicYearId || !name) {
            return res.status(400).json({ message: 'Academic Year ID and Name are required' });
        }

        const classroom = await Classroom.create({
            schoolId: req.user.schoolId,
            academicYearId,
            name,
            homeroomTeacherId: homeroomTeacherId || null
        });

        res.status(201).json(classroom);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 4. ENROLLMENTS
// ==========================================

// @desc    Enroll student in classroom
// @route   POST /api/school/enrollments
// @access  Private (school_admin)
router.post('/enrollments', async (req, res) => {
    const { studentId, classroomId, academicYearId, status } = req.body;
    try {
        if (!studentId || !classroomId || !academicYearId) {
            return res.status(400).json({ message: 'Student ID, Classroom ID, and Academic Year ID are required' });
        }

        // Verify student role
        const student = await User.findOne({ _id: studentId, schoolId: req.user.schoolId, role: 'student' });
        if (!student) {
            return res.status(400).json({ message: 'Invalid student ID' });
        }

        // Update or create enrollment (force unique constraint: studentId + academicYearId)
        const enrollment = await Enrollment.findOneAndUpdate(
            { schoolId: req.user.schoolId, studentId, academicYearId },
            { classroomId, status: status || 'active' },
            { new: true, upsert: true }
        );

        res.status(200).json(enrollment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 5. SCHEDULES
// ==========================================

// @desc    Create or update scheduling
// @route   POST /api/school/schedule
// @access  Private (school_admin)
router.post('/schedule', async (req, res) => {
    const { teacherId, classroomId, subjectId, dayOfWeek, startTime, endTime, room } = req.body;
    try {
        if (!teacherId || !classroomId || !subjectId || dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ message: 'Please add all required schedule fields' });
        }

        // Check if teacher is valid
        const teacher = await User.findOne({ _id: teacherId, schoolId: req.user.schoolId, role: 'teacher' });
        if (!teacher) {
            return res.status(400).json({ message: 'Invalid teacher ID' });
        }

        // Check if classroom is valid
        const classroom = await Classroom.findOne({ _id: classroomId, schoolId: req.user.schoolId });
        if (!classroom) {
            return res.status(400).json({ message: 'Invalid classroom ID' });
        }

        // Check if subject is valid
        const subject = await Subject.findOne({ _id: subjectId, schoolId: req.user.schoolId });
        if (!subject) {
            return res.status(400).json({ message: 'Invalid subject ID' });
        }

        // Create Schedule
        const schedule = await Schedule.create({
            schoolId: req.user.schoolId,
            teacherId,
            classroomId,
            subjectId,
            dayOfWeek,
            startTime,
            endTime,
            room: room || ''
        });

        res.status(201).json(schedule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get schedules (optionally filter by classroomId, teacherId)
// @route   GET /api/school/schedule
// @access  Private (school_admin)
router.get('/schedule', async (req, res) => {
    try {
        const { classroomId, teacherId } = req.query;
        const query = { schoolId: req.user.schoolId };

        if (classroomId) query.classroomId = classroomId;
        if (teacherId) query.teacherId = teacherId;

        const schedules = await Schedule.find(query)
            .populate('teacherId', 'name email')
            .populate('classroomId', 'name')
            .populate('subjectId', 'title');

        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 6. SUBJECTS CRUD
// ==========================================

// @desc    Get all subjects
// @route   GET /api/school/subjects
// @access  Private (school_admin)
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find({ schoolId: req.user.schoolId });
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a subject
// @route   POST /api/school/subjects
// @access  Private (school_admin)
router.post('/subjects', async (req, res) => {
    const { title, description } = req.body;
    try {
        if (!title) {
            return res.status(400).json({ message: 'Subject title is required' });
        }

        const subjectExists = await Subject.findOne({ schoolId: req.user.schoolId, title });
        if (subjectExists) {
            return res.status(400).json({ message: 'Subject already exists' });
        }

        const subject = await Subject.create({
            schoolId: req.user.schoolId,
            title,
            description: description || ''
        });

        res.status(201).json(subject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a subject
// @route   PATCH /api/school/subjects/:id
// @access  Private (school_admin)
router.patch('/subjects/:id', async (req, res) => {
    const { title, description, isActive } = req.body;
    try {
        const subject = await Subject.findOne({ _id: req.params.id, schoolId: req.user.schoolId });
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        if (title) subject.title = title;
        if (description !== undefined) subject.description = description;
        if (isActive !== undefined) subject.isActive = isActive;

        await subject.save();
        res.json(subject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a subject
// @route   DELETE /api/school/subjects/:id
// @access  Private (school_admin)
router.delete('/subjects/:id', async (req, res) => {
    try {
        const result = await Subject.deleteOne({ _id: req.params.id, schoolId: req.user.schoolId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 7. ATTENDANCE REPORTS
// ==========================================

// @desc    Get school-wide attendance report
// @route   GET /api/school/reports/attendance
// @access  Private (school_admin)
router.get('/reports/attendance', async (req, res) => {
    const { startDate, endDate, classroomId } = req.query;
    try {
        const query = { schoolId: req.user.schoolId };
        
        if (classroomId) {
            query.classroomId = classroomId;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const attendance = await Attendance.find(query)
            .populate('studentId', 'name email')
            .populate('classroomId', 'name')
            .populate('takenBy', 'name')
            .sort({ date: -1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
