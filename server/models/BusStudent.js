import mongoose from 'mongoose';

const busStudentSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BusRoute',
        required: true,
        index: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    stopOrder: { type: Number, default: 0 },
    homeAddress: { type: String, default: '' },
    homeLat: { type: Number, default: null },
    homeLng: { type: Number, default: null }
}, { timestamps: true });

busStudentSchema.index({ routeId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('BusStudent', busStudentSchema);
