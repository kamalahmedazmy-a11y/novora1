import mongoose from 'mongoose';

// A school-wide (or audience-targeted) announcement posted by an admin.
const announcementSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    audience: { type: String, enum: ['all', 'teachers', 'parents', 'students'], default: 'all' },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pinned: { type: Boolean, default: false },
}, { timestamps: true });

announcementSchema.index({ schoolId: 1, createdAt: -1 });

export default mongoose.model('Announcement', announcementSchema);
