import mongoose from 'mongoose';

const busRideSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BusRoute'
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: { type: Date, required: true, index: true },
    willRide: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['expected', 'picked_up', 'arrived', 'absent'],
        default: 'expected'
    },
    pickedUpAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null }
}, { timestamps: true });

busRideSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.model('BusRide', busRideSchema);
