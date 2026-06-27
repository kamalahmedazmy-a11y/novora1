import mongoose from 'mongoose';

const classroomSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    academicYearId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: true,
        index: true
    },
    name: {
        type: String, // e.g. "Class 10-A"
        required: true,
        trim: true
    },
    homeroomTeacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

// A school cannot have duplicate classrooms in the same academic year
classroomSchema.index({ schoolId: 1, academicYearId: 1, name: 1 }, { unique: true });

const Classroom = mongoose.model('Classroom', classroomSchema);

export default Classroom;
