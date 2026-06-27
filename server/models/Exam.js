import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true,
        index: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        default: null,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    passingScore: {
        type: Number,
        default: 70
    },
    timeLimit: {
        type: Number, // in minutes, optional
        default: null
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Exam = mongoose.model('Exam', examSchema);

export default Exam;
