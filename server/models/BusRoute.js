import mongoose from 'mongoose';

const busRouteSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true
    },
    name: { type: String, required: true },
    supervisorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    notifyLeadMinutes: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('BusRoute', busRouteSchema);
