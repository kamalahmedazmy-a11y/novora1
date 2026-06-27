import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        required: true,
        index: true
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true,
        index: true
    },
    completionPercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    xp: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// A user has exactly one progress record per chapter
progressSchema.index({ userId: 1, chapterId: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;
