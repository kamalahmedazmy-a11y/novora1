import mongoose from 'mongoose';

// Non-teaching employees (janitor, security, nurse, etc.). Kept separate from
// the User model because they don't log in / aren't part of the auth roles.
const staffSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['janitor', 'security', 'nurse', 'secretary', 'librarian', 'it_support', 'accountant', 'receptionist'],
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    hireDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);

export default Staff;
