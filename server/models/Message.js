import mongoose from 'mongoose';

// Simple two-way messaging between a school admin and a parent.
// Each document is one message in the thread for a given parent.
const messageSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // the parent this thread belongs to
        required: true,
        index: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // the admin participating in the thread
        default: null
    },
    sender: {
        type: String,
        enum: ['admin', 'parent'],
        required: true
    },
    subject: {
        type: String,
        default: '',
        trim: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    },
    readAt: {
        type: Date, // null = unread by the recipient
        default: null
    }
}, { timestamps: true });

messageSchema.index({ schoolId: 1, parentId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
