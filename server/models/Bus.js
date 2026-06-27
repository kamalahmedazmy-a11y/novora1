import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    busNumber: { type: String, required: true },
    plate: { type: String, default: '' },
    capacity: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Bus', busSchema);
