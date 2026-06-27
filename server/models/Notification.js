import mongoose from 'mongoose';

// A single in-app notification delivered to ONE user. Broadcasts (to a role
// or the whole school) are fanned out into one document per recipient so that
// read-state (readAt) stays per-user. Shared foundation used by attendance
// alerts, announcements, leave approvals, fee reminders, tasks, etc.
const notificationSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['attendance', 'announcement', 'leave', 'fee', 'task', 'incident', 'general'],
        default: 'general',
        required: true
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    link: { type: String, default: '' },          // optional in-app deep link
    readAt: { type: Date, default: null },         // null = unread
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
