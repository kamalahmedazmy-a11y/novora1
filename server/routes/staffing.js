import express from 'express';
import mongoose from 'mongoose';
import Schedule from '../models/Schedule.js';
import User from '../models/User.js';
import TeacherAbsence from '../models/TeacherAbsence.js';
import SubstituteAssignment from '../models/SubstituteAssignment.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { notifyUser } from '../utils/notify.js';

const router = express.Router();
router.use(protect);

const schoolOf = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;
const midnight = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; };

// ============================================================
// TEACHER ABSENCES (admin)
// ============================================================

// Report a teacher absent on a date
// POST /api/staffing/absences { teacherId, date, reason }
router.post('/absences', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { teacherId, date, reason } = req.body;
        if (!teacherId || !date) return res.status(400).json({ message: 'teacherId and date are required' });
        const day = midnight(date);
        const absence = await TeacherAbsence.findOneAndUpdate(
            { schoolId, teacherId, date: day },
            { reason: reason || '', reportedBy: req.user._id, status: 'reported' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        await notifyUser(schoolId, teacherId, {
            type: 'general', title: 'Absence recorded',
            body: `You were marked absent on ${day.toISOString().slice(0, 10)}.`,
        });
        res.status(201).json(absence);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List absences for a date
// GET /api/staffing/absences?date=YYYY-MM-DD
router.get('/absences', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const query = { schoolId };
        if (req.query.date) query.date = midnight(req.query.date);
        const list = await TeacherAbsence.find(query).populate('teacherId', 'name email').sort({ date: -1 }).lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Remove an absence (and its substitute assignments for that day)
// DELETE /api/staffing/absences/:id
router.delete('/absences/:id', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const abs = await TeacherAbsence.findOne({ _id: req.params.id, schoolId });
        if (!abs) return res.status(404).json({ message: 'Absence not found' });
        await SubstituteAssignment.deleteMany({ schoolId, originalTeacherId: abs.teacherId, date: abs.date });
        await abs.deleteOne();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================================
// UNCOVERED PERIODS + FREE-TEACHER SUGGESTIONS (the core feature)
// GET /api/staffing/uncovered?date=YYYY-MM-DD
// Returns, for every absent teacher's periods that day: the period info,
// whether a sub is assigned, and a list of teachers FREE at that slot.
// ============================================================
router.get('/uncovered', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        if (!req.query.date) return res.status(400).json({ message: 'date is required' });
        const day = midnight(req.query.date);
        const dow = day.getUTCDay();

        const absences = await TeacherAbsence.find({ schoolId, date: day }).lean();
        const absentIds = absences.map(a => String(a.teacherId));
        if (!absentIds.length) return res.json({ date: req.query.date, dayOfWeek: dow, periods: [] });

        // all periods that weekday
        const allSlots = await Schedule.find({ schoolId, dayOfWeek: dow })
            .populate('classroomId', 'name').populate('subjectId', 'title').populate('teacherId', 'name').lean();

        // affected periods = taught by an absent teacher
        const affected = allSlots.filter(s => absentIds.includes(String(s.teacherId?._id)));

        // existing substitute assignments for the date
        const subs = await SubstituteAssignment.find({ schoolId, date: day })
            .populate('substituteId', 'name').lean();
        const subMap = Object.fromEntries(subs.map(s => [String(s.scheduleId), s]));

        // who is busy in each (startTime) on this weekday — from master schedule
        const busyByTime = {};
        for (const s of allSlots) {
            (busyByTime[s.startTime] = busyByTime[s.startTime] || new Set()).add(String(s.teacherId?._id));
        }
        // also subs already placed that date make them busy at that time
        for (const s of subs) {
            const slot = allSlots.find(a => String(a._id) === String(s.scheduleId));
            if (slot) (busyByTime[slot.startTime] = busyByTime[slot.startTime] || new Set()).add(String(s.substituteId?._id));
        }

        const allTeachers = await User.find({ schoolId, role: 'teacher', isActive: true }).select('name').lean();

        const periods = affected.map(s => {
            const busy = busyByTime[s.startTime] || new Set();
            const free = allTeachers.filter(t =>
                !busy.has(String(t._id)) && !absentIds.includes(String(t._id))
            ).map(t => ({ id: t._id, name: t.name }));
            const assigned = subMap[String(s._id)];
            return {
                scheduleId: s._id,
                class: s.classroomId?.name,
                subject: s.subjectId?.title,
                originalTeacher: s.teacherId?.name,
                originalTeacherId: s.teacherId?._id,
                time: `${s.startTime}-${s.endTime}`,
                startTime: s.startTime,
                covered: !!assigned,
                substitute: assigned ? { id: assigned.substituteId?._id, name: assigned.substituteId?.name } : null,
                freeTeachers: free,
            };
        }).sort((a, b) => a.startTime.localeCompare(b.startTime));

        res.json({ date: req.query.date, dayOfWeek: dow, periods });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Assign a substitute to a period on a date
// POST /api/staffing/substitutes { scheduleId, date, substituteId }
router.post('/substitutes', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { scheduleId, date, substituteId } = req.body;
        if (!scheduleId || !date || !substituteId) return res.status(400).json({ message: 'scheduleId, date, substituteId required' });
        const day = midnight(date);
        const slot = await Schedule.findOne({ _id: scheduleId, schoolId });
        if (!slot) return res.status(404).json({ message: 'Schedule slot not found' });

        // conflict check: substitute must be free at that weekday+startTime
        const dow = day.getUTCDay();
        const clash = await Schedule.findOne({ schoolId, teacherId: substituteId, dayOfWeek: dow, startTime: slot.startTime });
        if (clash) return res.status(409).json({ message: 'Substitute already teaches another class at this time' });
        const subClash = await SubstituteAssignment.findOne({
            schoolId, substituteId, date: day, _id: { $ne: null },
        }).populate('scheduleId', 'startTime');
        if (subClash && subClash.scheduleId?.startTime === slot.startTime) {
            return res.status(409).json({ message: 'Substitute already covering another class at this time' });
        }

        const assignment = await SubstituteAssignment.findOneAndUpdate(
            { scheduleId, date: day },
            { schoolId, originalTeacherId: slot.teacherId, substituteId, assignedBy: req.user._id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        await notifyUser(schoolId, substituteId, {
            type: 'general', title: 'Substitute assignment',
            body: `You are covering a class on ${day.toISOString().slice(0, 10)} at ${slot.startTime}.`,
        });
        res.status(201).json(assignment);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Remove a substitute assignment
// DELETE /api/staffing/substitutes/:scheduleId?date=
router.delete('/substitutes/:scheduleId', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const day = midnight(req.query.date);
        await SubstituteAssignment.deleteOne({ schoolId, scheduleId: req.params.scheduleId, date: day });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
