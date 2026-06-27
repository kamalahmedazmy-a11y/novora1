import express from 'express';
import Notification from '../models/Notification.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect); // every authenticated role can read their own notifications

// @desc   List current user's notifications (newest first) + unread count
// @route  GET /api/notifications?limit=20&unread=1
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const query = { recipientId: req.user._id };
        if (req.query.unread === '1') query.readAt = null;
        const [items, unreadCount] = await Promise.all([
            Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
            Notification.countDocuments({ recipientId: req.user._id, readAt: null }),
        ]);
        res.json({ items, unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc   Unread count only (cheap polling endpoint)
// @route  GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
    try {
        const unreadCount = await Notification.countDocuments({ recipientId: req.user._id, readAt: null });
        res.json({ unreadCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc   Mark one notification read
// @route  PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
    try {
        const n = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipientId: req.user._id },
            { readAt: new Date() },
            { new: true }
        );
        if (!n) return res.status(404).json({ message: 'Notification not found' });
        res.json(n);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc   Mark all read
// @route  PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
    try {
        await Notification.updateMany(
            { recipientId: req.user._id, readAt: null },
            { readAt: new Date() }
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
