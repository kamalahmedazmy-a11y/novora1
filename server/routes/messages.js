import express from 'express';
import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import Schedule from '../models/Schedule.js';
import Enrollment from '../models/Enrollment.js';
import protect from '../middleware/authMiddleware.js';
import { notifyUser } from '../utils/notify.js';

const router = express.Router();
router.use(protect);

const oid = (v) => new mongoose.Types.ObjectId(v);

// Who is the current user allowed to message?
async function contactsFor(req) {
    const schoolId = req.user.schoolId;
    const role = req.user.role;

    if (role === 'school_admin' || role === 'super_admin') {
        // admins can message all teachers + parents
        return User.find({ schoolId, role: { $in: ['teacher', 'parent'] }, isActive: true }).select('name role').lean();
    }
    if (role === 'teacher') {
        // admins + parents of students in classrooms this teacher teaches
        const classIds = (await Schedule.find({ schoolId, teacherId: req.user._id }).distinct('classroomId'));
        const studentIds = await Enrollment.find({ schoolId, classroomId: { $in: classIds }, status: 'active' }).distinct('studentId');
        const parents = await User.find({ schoolId, role: 'parent', parentOf: { $in: studentIds }, isActive: true }).select('name role').lean();
        const admins = await User.find({ schoolId, role: 'school_admin', isActive: true }).select('name role').lean();
        return [...admins, ...parents];
    }
    if (role === 'parent') {
        // admins + teachers who teach the parent's children
        const classIds = await Enrollment.find({ schoolId, studentId: { $in: req.user.parentOf || [] }, status: 'active' }).distinct('classroomId');
        const teacherIds = await Schedule.find({ schoolId, classroomId: { $in: classIds } }).distinct('teacherId');
        const teachers = await User.find({ schoolId, _id: { $in: teacherIds }, isActive: true }).select('name role').lean();
        const admins = await User.find({ schoolId, role: 'school_admin', isActive: true }).select('name role').lean();
        return [...admins, ...teachers];
    }
    if (role === 'student') {
        const admins = await User.find({ schoolId, role: 'school_admin', isActive: true }).select('name role').lean();
        return admins;
    }
    return [];
}

// GET /api/messages/contacts — people the user can start a chat with
router.get('/contacts', async (req, res) => {
    try {
        const list = await contactsFor(req);
        res.json(list.map(u => ({ id: u._id, name: u.name, role: u.role })));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/messages — inbox: latest message + unread count per counterpart
router.get('/', async (req, res) => {
    try {
        const me = req.user._id;
        const rows = await ChatMessage.aggregate([
            { $match: { schoolId: oid(req.user.schoolId), $or: [{ fromId: oid(me) }, { toId: oid(me) }] } },
            { $sort: { createdAt: -1 } },
            { $addFields: { other: { $cond: [{ $eq: ['$fromId', oid(me)] }, '$toId', '$fromId'] } } },
            { $group: {
                _id: '$other',
                lastBody: { $first: '$body' },
                lastAt: { $first: '$createdAt' },
                lastFrom: { $first: '$fromId' },
                unread: { $sum: { $cond: [{ $and: [{ $eq: ['$toId', oid(me)] }, { $eq: ['$readAt', null] }] }, 1, 0] } },
            } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
            { $unwind: '$u' },
            { $project: { contactId: '$_id', _id: 0, name: '$u.name', role: '$u.role', lastBody: 1, lastAt: 1, unread: 1, mine: { $eq: ['$lastFrom', oid(me)] } } },
            { $sort: { lastAt: -1 } },
        ]);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/messages/:userId — thread with a user; marks their→me messages read
router.get('/:userId', async (req, res) => {
    try {
        const me = req.user._id;
        const other = req.params.userId;
        const thread = await ChatMessage.find({
            schoolId: req.user.schoolId,
            $or: [{ fromId: me, toId: other }, { fromId: other, toId: me }],
        }).sort({ createdAt: 1 }).populate('attachmentId', 'originalName').lean();
        await ChatMessage.updateMany({ schoolId: req.user.schoolId, fromId: other, toId: me, readAt: null }, { readAt: new Date() });
        res.json(thread.map(m => ({ ...m, mine: String(m.fromId) === String(me) })));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/messages — send { toId, body, attachmentId? }
router.post('/', async (req, res) => {
    try {
        const { toId, body, attachmentId } = req.body;
        if (!toId || !(body || attachmentId)) return res.status(400).json({ message: 'toId and body required' });
        const recipient = await User.findOne({ _id: toId, schoolId: req.user.schoolId });
        if (!recipient) return res.status(404).json({ message: 'Recipient not found' });
        const msg = await ChatMessage.create({
            schoolId: req.user.schoolId, fromId: req.user._id, toId,
            body: body || '(attachment)', attachmentId: attachmentId || null,
        });
        await notifyUser(req.user.schoolId, toId, {
            type: 'general', title: `New message from ${req.user.name}`,
            body: (body || '').slice(0, 120),
        });
        res.status(201).json(msg);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
