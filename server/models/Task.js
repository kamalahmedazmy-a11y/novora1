import mongoose from 'mongoose';

// A task assigned by an admin to a teacher. When created, we snapshot WHERE
// the teacher was (per their timetable) at the chosen day/time, so the log
// stays accurate even if the schedule later changes.
const taskSchema = new mongoose.Schema({
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
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // the admin who created the task
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'done', 'cancelled'],
        default: 'pending',
        required: true
    },
    dueDate: {
        type: Date,
        default: null
    },
    // Location snapshot taken at assignment time
    locationClassroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        default: null
    },
    locationNote: {
        type: String, // e.g. "Was in Grade 3-A during 09:40-10:25 (Sun)"
        default: ''
    }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

export default Task;
