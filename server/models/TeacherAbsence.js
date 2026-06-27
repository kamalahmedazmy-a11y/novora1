import mongoose from 'mongoose';

// A teacher being absent on a given day. The admin then assigns substitutes
// for that teacher's periods via SubstituteAssignment (the master Schedule is
// never mutated — substitutions are per-date overrides).
const teacherAbsenceSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true }, // normalized to midnight
    reason: { type: String, default: '' },
    status: { type: String, enum: ['reported', 'fully_covered', 'partially_covered'], default: 'reported' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

teacherAbsenceSchema.index({ schoolId: 1, teacherId: 1, date: 1 }, { unique: true });

export default mongoose.model('TeacherAbsence', teacherAbsenceSchema);
