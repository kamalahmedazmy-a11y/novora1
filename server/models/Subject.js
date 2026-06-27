import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// A school can't have duplicate subject titles
subjectSchema.index({ schoolId: 1, title: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
