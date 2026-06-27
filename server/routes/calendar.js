import express from 'express';
import CalendarEvent from '../models/CalendarEvent.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { notifyRole } from '../utils/notify.js';

const router = express.Router();
router.use(protect);

const schoolOf = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;

// Create (admin) — notifies the targeted audience
// POST /api/calendar { title, description, date, endDate, type, audience }
router.post('/', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { title, description = '', date, endDate = null, type = 'event', audience = 'all' } = req.body;
        if (!title || !date) return res.status(400).json({ message: 'title and date are required' });
        const event = await CalendarEvent.create({
            schoolId, title, description, date, endDate, type, audience, createdBy: req.user._id,
        });

        const roles = audience === 'all' ? ['teacher', 'parent', 'student'] : [audience.replace(/s$/, '')];
        await Promise.all(roles.map(r => notifyRole(schoolId, r, {
            type: 'announcement', title: `📅 ${title}`, body: (description || '').slice(0, 140),
        })));
        res.status(201).json(event);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List — audience-filtered for non-admins, optional ?from=&to= date range
// GET /api/calendar
router.get('/', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const role = req.user.role;
        const query = { schoolId };
        if (role !== 'school_admin' && role !== 'super_admin') {
            const aud = role === 'teacher' ? 'teachers' : role === 'parent' ? 'parents' : 'students';
            query.audience = { $in: ['all', aud] };
        }
        const { from, to } = req.query;
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }
        const list = await CalendarEvent.find(query).sort({ date: 1 }).limit(200)
            .populate('createdBy', 'name').lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete (admin)
// DELETE /api/calendar/:id
router.delete('/:id', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const r = await CalendarEvent.deleteOne({ _id: req.params.id, schoolId });
        if (!r.deletedCount) return res.status(404).json({ message: 'Not found' });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
