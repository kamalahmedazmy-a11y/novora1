import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        default: null, // null for global badges
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    criteria: {
        type: mongoose.Schema.Types.Mixed, // JSON specifying rules (e.g. { type: 'complete_chapters', count: 5 })
        required: true
    },
    icon: {
        type: String, // SVG content, URL, or CSS class
        required: true
    }
}, { timestamps: true });

const Badge = mongoose.model('Badge', badgeSchema);

export default Badge;
