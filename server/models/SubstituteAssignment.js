import mongoose from 'mongoose';

// A substitute covering one specific period (scheduleId) on one specific date.
// Per-date override — the master Schedule stays untouched.
const substituteAssignmentSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true, index: true },
    date: { type: Date, required: true, index: true },
    originalTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    substituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// one substitution per period per date
substituteAssignmentSchema.index({ scheduleId: 1, date: 1 }, { unique: true });

export default mongoose.model('SubstituteAssignment', substituteAssignmentSchema);
