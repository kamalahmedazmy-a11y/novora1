import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctAnswer: {
        type: Number, // 0-based index of options array
        required: true
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

export default Question;
