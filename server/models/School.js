import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subdomain: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens']
    },
    subscriptionPlan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        maxStudents: { type: Number, default: 100 },
        maxTeachers: { type: Number, default: 10 },
        features: {
            attendance: { type: Boolean, default: true },
            exams: { type: Boolean, default: true },
            ranking: { type: Boolean, default: true },
            badges: { type: Boolean, default: true }
        }
    }
}, { timestamps: true });

const School = mongoose.model('School', schoolSchema);

export default School;
