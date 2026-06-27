import express from 'express';
import mongoose from 'mongoose';
import Classroom from '../models/Classroom.js';
import Enrollment from '../models/Enrollment.js';
import Schedule from '../models/Schedule.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Message from '../models/Message.js';
import Staff from '../models/Staff.js';
import Subject from '../models/Subject.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(allowRoles('school_admin', 'super_admin'));

// Resolve the school to operate on:
//  - school_admin -> their own school
//  - super_admin  -> must pass ?schoolId=... (single-school: the only school)
const resolveSchoolId = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Current day/time, overridable via ?day= & ?time= for testing.
const resolveNow = (req) => {
    const now = new Date();
    const day = req.query.day !== undefined ? Number(req.query.day) : now.getDay();
    const time = req.query.time || now.toTimeString().slice(0, 5); // HH:MM
    return { day, time };
};

// ============================================================
// PHASE 1.3 / 1.4 — Class overview + CURRENT period & teacher
// ============================================================
// @route GET /api/dashboard/classes   (optional ?day=&time= for testing)
router.get('/classes', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: 'schoolId is required for super admin' });
        const { day, time } = resolveNow(req);

        const classrooms = await Classroom.find({ schoolId })
            .populate('homeroomTeacherId', 'name email')
            .lean();

        // student counts per classroom (active enrollments)
        const counts = await Enrollment.aggregate([
            { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), status: 'active' } },
            { $group: { _id: '$classroomId', n: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.n]));

        // current period for each classroom right now
        const slots = await Schedule.find({
            schoolId, dayOfWeek: day,
            startTime: { $lte: time }, endTime: { $gte: time }
        })
            .populate('teacherId', 'name email')
            .populate('subjectId', 'title')
            .lean();
        const slotMap = Object.fromEntries(slots.map(s => [String(s.classroomId), s]));

        const result = classrooms.map(c => {
            const slot = slotMap[String(c._id)];
            return {
                classroomId: c._id,
                name: c.name,
                studentCount: countMap[String(c._id)] || 0,
                homeroomTeacher: c.homeroomTeacherId
                    ? { id: c.homeroomTeacherId._id, name: c.homeroomTeacherId.name }
                    : null,
                currentPeriod: slot ? {
                    subject: slot.subjectId ? slot.subjectId.title : null,
                    teacher: slot.teacherId ? slot.teacherId.name : null,
                    teacherId: slot.teacherId ? slot.teacherId._id : null,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    room: slot.room
                } : null
            };
        });

        res.json({
            totalClasses: classrooms.length,
            asOf: { dayOfWeek: day, day: DAY_NAMES[day], time },
            classes: result.sort((a, b) => a.name.localeCompare(b.name))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// PHASE 2.3 — Tasks for teachers (with location snapshot)
// ============================================================

// Helper: figure out where a teacher is at a given day/time, per the timetable.
async function locateTeacher(schoolId, teacherId, day, time) {
    const slot = await Schedule.findOne({
        schoolId, teacherId, dayOfWeek: day,
        startTime: { $lte: time }, endTime: { $gte: time }
    }).populate('classroomId', 'name').lean();
    if (slot && slot.classroomId) {
        return {
            locationClassroomId: slot.classroomId._id,
            locationNote: `Was in ${slot.classroomId.name} during ${slot.startTime}-${slot.endTime} (${DAY_NAMES[day]})`
        };
    }
    return {
        locationClassroomId: null,
        locationNote: `Free period at ${time} (${DAY_NAMES[day]}) — not in any class`
    };
}

// @route POST /api/dashboard/tasks   body: { teacherId, description, dueDate?, day?, time? }
router.post('/tasks', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { teacherId, description, dueDate } = req.body;
        if (!teacherId || !description) {
            return res.status(400).json({ message: 'teacherId and description are required' });
        }
        const teacher = await User.findOne({ _id: teacherId, schoolId, role: 'teacher' });
        if (!teacher) return res.status(404).json({ message: 'Teacher not found in this school' });

        const { day, time } = resolveNow(req);
        const loc = await locateTeacher(schoolId, teacherId, day, time);

        const task = await Task.create({
            schoolId, teacherId, assignedBy: req.user._id,
            description, dueDate: dueDate || null,
            locationClassroomId: loc.locationClassroomId,
            locationNote: loc.locationNote
        });
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/dashboard/tasks   (optional ?teacherId=)
router.get('/tasks', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const query = { schoolId };
        if (req.query.teacherId) query.teacherId = req.query.teacherId;
        const tasks = await Task.find(query)
            .populate('teacherId', 'name email')
            .populate('locationClassroomId', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route PATCH /api/dashboard/tasks/:id   body: { status }
router.patch('/tasks/:id', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { status } = req.body;
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, schoolId },
            { status },
            { new: true, runValidators: true }
        );
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// PHASE 2.4 — Admin <-> Parent messaging
// ============================================================

// @route GET /api/dashboard/messages   -> inbox: latest message + unread count per parent
router.get('/messages', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const inbox = await Message.aggregate([
            { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$parentId',
                    lastMessage: { $first: '$body' },
                    lastSender: { $first: '$sender' },
                    lastAt: { $first: '$createdAt' },
                    unreadFromParent: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'parent'] }, { $eq: ['$readAt', null] }] }, 1, 0] }
                    }
                }
            },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'parent' } },
            { $unwind: '$parent' },
            {
                $project: {
                    parentId: '$_id', _id: 0,
                    parentName: '$parent.name', parentEmail: '$parent.email',
                    lastMessage: 1, lastSender: 1, lastAt: 1, unreadFromParent: 1
                }
            },
            { $sort: { lastAt: -1 } }
        ]);
        res.json(inbox);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/dashboard/messages/:parentId   -> full thread (marks parent msgs read)
router.get('/messages/:parentId', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { parentId } = req.params;
        const thread = await Message.find({ schoolId, parentId }).sort({ createdAt: 1 }).lean();
        // mark unread parent messages as read
        await Message.updateMany(
            { schoolId, parentId, sender: 'parent', readAt: null },
            { readAt: new Date() }
        );
        res.json(thread);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route POST /api/dashboard/messages   body: { parentId, body, subject? }  (admin sends)
router.post('/messages', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { parentId, body, subject } = req.body;
        if (!parentId || !body) {
            return res.status(400).json({ message: 'parentId and body are required' });
        }
        const parent = await User.findOne({ _id: parentId, schoolId, role: 'parent' });
        if (!parent) return res.status(404).json({ message: 'Parent not found in this school' });

        const msg = await Message.create({
            schoolId, parentId, adminId: req.user._id,
            sender: 'admin', subject: subject || '', body
        });
        res.status(201).json(msg);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// PHASE 3 — GLOBAL SEARCH
// Searches students, parents, teachers, classes and staff, returning
// quick info for each result.
// @route GET /api/dashboard/search?q=...&limit=
// ============================================================
router.get('/search', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ query: '', results: [] });
        const limit = Math.min(Number(req.query.limit) || 10, 50);
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        // ---- Students ----
        const studentDocs = await User.find({ schoolId, role: 'student', name: rx })
            .limit(limit).select('name email').lean();
        const studentIds = studentDocs.map(s => s._id);
        const enrollments = await Enrollment.find({ schoolId, studentId: { $in: studentIds }, status: 'active' })
            .populate('classroomId', 'name').lean();
        const enrollMap = Object.fromEntries(enrollments.map(e => [String(e.studentId), e.classroomId ? e.classroomId.name : null]));
        const parentsOf = await User.find({ schoolId, role: 'parent', parentOf: { $in: studentIds } })
            .select('name phone parentOf').lean();
        const parentMap = {};
        for (const p of parentsOf) for (const sid of p.parentOf) parentMap[String(sid)] = p.name;
        const students = studentDocs.map(s => ({
            type: 'student', id: s._id, name: s.name,
            info: `Class: ${enrollMap[String(s._id)] || 'n/a'} | Parent: ${parentMap[String(s._id)] || 'n/a'} | ${s.email}`
        }));

        // ---- Parents ----
        const parentDocs = await User.find({ schoolId, role: 'parent', $or: [{ name: rx }, { email: rx }] })
            .limit(limit).select('name email parentOf').lean();
        const childIds = parentDocs.flatMap(p => p.parentOf || []);
        const children = await User.find({ _id: { $in: childIds } }).select('name').lean();
        const childMap = Object.fromEntries(children.map(c => [String(c._id), c.name]));
        const parents = parentDocs.map(p => ({
            type: 'parent', id: p._id, name: p.name,
            info: `Children: ${(p.parentOf || []).map(id => childMap[String(id)]).filter(Boolean).join(', ') || 'n/a'} | ${p.email}`
        }));

        // ---- Teachers (with subjects taught) ----
        const teacherDocs = await User.find({ schoolId, role: 'teacher', $or: [{ name: rx }, { email: rx }] })
            .limit(limit).select('name email').lean();
        const teacherIds = teacherDocs.map(t => t._id);
        const tSchedules = await Schedule.find({ schoolId, teacherId: { $in: teacherIds } })
            .populate('subjectId', 'title').lean();
        const tSubjMap = {};
        for (const s of tSchedules) {
            const key = String(s.teacherId);
            const title = s.subjectId ? s.subjectId.title : null;
            if (title) (tSubjMap[key] = tSubjMap[key] || new Set()).add(title);
        }
        const teachers = teacherDocs.map(t => ({
            type: 'teacher', id: t._id, name: t.name,
            info: `Subjects: ${tSubjMap[String(t._id)] ? [...tSubjMap[String(t._id)]].join(', ') : 'n/a'} | ${t.email}`
        }));

        // ---- Classes ----
        const classDocs = await Classroom.find({ schoolId, name: rx }).limit(limit).lean();
        const classCounts = await Enrollment.aggregate([
            { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), status: 'active' } },
            { $group: { _id: '$classroomId', n: { $sum: 1 } } }
        ]);
        const ccMap = Object.fromEntries(classCounts.map(c => [String(c._id), c.n]));
        const classes = classDocs.map(c => ({
            type: 'class', id: c._id, name: c.name,
            info: `Students: ${ccMap[String(c._id)] || 0}`
        }));

        // ---- Staff (non-teaching) ----
        const staffDocs = await Staff.find({ schoolId, $or: [{ name: rx }, { role: rx }] })
            .limit(limit).lean();
        const staff = staffDocs.map(s => ({
            type: 'staff', id: s._id, name: s.name,
            info: `Role: ${s.role}${s.phone ? ' | ' + s.phone : ''}${s.email ? ' | ' + s.email : ''}`
        }));

        const results = [...students, ...parents, ...teachers, ...classes, ...staff];
        res.json({ query: q, count: results.length, results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// SCHEDULE CONFLICT DETECTION
// @route GET /api/dashboard/schedule/conflicts
// Flags any teacher OR classroom double-booked at the same day+time.
// ============================================================
router.get('/schedule/conflicts', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const sid = new mongoose.Types.ObjectId(schoolId);
        const DAY_NAMES_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const dupGroups = async (field) => Schedule.aggregate([
            { $match: { schoolId: sid } },
            { $group: { _id: { k: `$${field}`, d: '$dayOfWeek', t: '$startTime' }, ids: { $push: '$_id' }, n: { $sum: 1 } } },
            { $match: { n: { $gt: 1 } } },
        ]);

        const [teacherDups, classDups] = await Promise.all([dupGroups('teacherId'), dupGroups('classroomId')]);

        const detail = async (groups, kind) => {
            const out = [];
            for (const g of groups) {
                const slots = await Schedule.find({ _id: { $in: g.ids } })
                    .populate('teacherId', 'name').populate('classroomId', 'name').populate('subjectId', 'title').lean();
                out.push({
                    kind, // 'teacher' | 'classroom'
                    day: DAY_NAMES_FULL[g._id.d], time: g._id.t,
                    entity: kind === 'teacher' ? slots[0]?.teacherId?.name : slots[0]?.classroomId?.name,
                    slots: slots.map(s => ({ class: s.classroomId?.name, subject: s.subjectId?.title, teacher: s.teacherId?.name })),
                });
            }
            return out;
        };

        const conflicts = [...await detail(teacherDups, 'teacher'), ...await detail(classDups, 'classroom')];
        res.json({ count: conflicts.length, conflicts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/dashboard/staff  -> list non-teaching staff
router.get('/staff', async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const staff = await Staff.find({ schoolId }).sort({ role: 1, name: 1 }).lean();
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
