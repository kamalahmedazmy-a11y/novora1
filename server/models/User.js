import mongoose from 'mongoose';

// 'bus_supervisor' added for the transport module. Extend this list to add
// future employee roles without touching existing logic.
const ROLES = ['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'bus_supervisor'];

const userSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        default: null,
        index: true
        // null for super_admin (not tied to any school)
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ROLES,
        default: 'student',
        required: true
    },
    parentOf: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    phone: {
        type: String,
        default: ''
    },
    employeeId: {
        type: String,
        default: ''   // for staff-type roles (bus_supervisor, etc.)
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Email must be unique within the same school (or globally for super_admin)
userSchema.index({ schoolId: 1, email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export { ROLES };
export default User;
