import mongoose from 'mongoose';

// A behaviour / discipline / health incident logged against a student.
const incidentSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['behavior', 'discipline', 'health', 'achievement', 'other'], default: 'behavior' },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    description: { type: String, required: true, trim: true },
    actionTaken: { type: String, default: '' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

incidentSchema.index({ schoolId: 1, studentId: 1, date: -1 });

export default mongoose.model('Incident', incidentSchema);
