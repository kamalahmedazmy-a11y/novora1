import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
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
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    dayOfWeek: {
        type: Number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        min: 0,
        max: 6,
        required: true
    },
    startTime: {
        type: String, // HH:MM (e.g. "08:30")
        required: true
    },
    endTime: {
        type: String, // HH:MM (e.g. "09:45")
        required: true
    },
    room: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// A teacher cannot be scheduled in multiple classes at the same day & time
// We can enforce a simple unique constraint on teacherId + dayOfWeek + startTime
scheduleSchema.index({ schoolId: 1, teacherId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

// A classroom also cannot have two classes scheduled at the same day & time
scheduleSchema.index({ schoolId: 1, classroomId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
