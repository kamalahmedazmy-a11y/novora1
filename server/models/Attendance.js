import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    takenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Teacher who took attendance
        required: true
    },
    date: {
        type: Date, // Normalized to midnight UTC to prevent duplicates per day
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        required: true
    }
}, { timestamps: true });

// Ensure a student only has one attendance entry per classroom per day
attendanceSchema.index({ classroomId: 1, studentId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
