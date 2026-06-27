import mongoose from 'mongoose';

const examAttemptSchema = new mongoose.Schema({
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
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    answers: {
        type: Map,
        of: Number, // maps questionId -> selectedOptionIndex
        required: true
    },
    score: {
        type: Number, // Percentage score (0-100)
        required: true
    },
    passed: {
        type: Boolean,
        required: true
    },
    takenAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index for lookup by user and exam
examAttemptSchema.index({ userId: 1, examId: 1 });

const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);

export default ExamAttempt;
