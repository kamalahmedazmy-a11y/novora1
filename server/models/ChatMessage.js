import mongoose from 'mongoose';

// A 1:1 message between any two users in the same school (admin↔parent,
// teacher↔parent, admin↔teacher, etc.). Generalises the old admin-only
// messaging so every role can hold a real two-way conversation.
const chatMessageSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    fromId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, trim: true },
    attachmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attachment', default: null },
    readAt: { type: Date, default: null },
}, { timestamps: true });

chatMessageSchema.index({ schoolId: 1, fromId: 1, toId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
