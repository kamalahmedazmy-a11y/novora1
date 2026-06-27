import express from 'express';
import Announcement from '../models/Announcement.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { notifyRole } from '../utils/notify.js';

const router = express.Router();
router.use(protect);

const schoolOf = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;

// Create (admin) — notifies the targeted audience
// POST /api/announcements { title, body, audience, pinned }
router.post('/', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { title, body, audience = 'all', pinned = false } = req.body;
        if (!title || !body) return res.status(400).json({ message: 'title and body are required' });
        const ann = await Announcement.create({ schoolId, title, body, audience, pinned, authorId: req.user._id });

        const roles = audience === 'all' ? ['teacher', 'parent', 'student'] : [audience.replace(/s$/, '')];
        await Promise.all(roles.map(r => notifyRole(schoolId, r, {
            type: 'announcement', title: `📢 ${title}`, body: body.slice(0, 140),
        })));
        res.status(201).json(ann);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List — audience-filtered for the current user's role
// GET /api/announcements
router.get('/', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const role = req.user.role;
        const query = { schoolId };
        if (role !== 'school_admin' && role !== 'super_admin') {
            const aud = role === 'teacher' ? 'teachers' : role === 'parent' ? 'parents' : 'students';
            query.audience = { $in: ['all', aud] };
        }
        const list = await Announcement.find(query).sort({ pinned: -1, createdAt: -1 }).limit(50)
            .populate('authorId', 'name').lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Delete (admin)
router.delete('/:id', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const r = await Announcement.deleteOne({ _id: req.params.id, schoolId });
        if (!r.deletedCount) return res.status(404).json({ message: 'Not found' });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
