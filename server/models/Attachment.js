import mongoose from 'mongoose';

// A stored file/attachment uploaded by a user, scoped to a school.
const attachmentSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filename: { type: String },        // the name as stored on disk
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    context: { type: String, default: 'general' },
    refId: { type: String, default: '' },
}, { timestamps: true });

attachmentSchema.index({ schoolId: 1, createdAt: -1 });

export default mongoose.model('Attachment', attachmentSchema);
