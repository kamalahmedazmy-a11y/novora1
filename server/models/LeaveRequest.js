import mongoose from 'mongoose';

// A leave request submitted by a teacher (or staff member) and reviewed by an admin.
// When approved for a teacher, the system auto-creates TeacherAbsence rows for each
// day in range so the substitute workflow picks them up.
const leaveRequestSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('LeaveRequest', leaveRequestSchema);
