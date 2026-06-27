import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    name: {
        type: String, // e.g. "2025-2026"
        required: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// A school cannot have duplicate academic year names
academicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);

export default AcademicYear;
