import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    id: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    content: {
        type: String, // Markdown content
        required: true
    },
    contentType: {
        type: String,
        enum: ['markdown', 'html', 'interactive'],
        default: 'markdown'
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Ensure id (and order) are unique within a single subject
chapterSchema.index({ subjectId: 1, id: 1 }, { unique: true });
chapterSchema.index({ subjectId: 1, order: 1 });

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter;
