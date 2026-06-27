import mongoose from 'mongoose';

// A fee definition for a given grade/term (e.g. Grade 10, Term1, Tuition).
const feeStructureSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    gradeLevel: { type: Number, required: true },
    term: { type: String, required: true }, // e.g. 'Term1'
    label: { type: String, default: 'Tuition' },
    amount: { type: Number, required: true },
}, { timestamps: true });

// One fee definition per school/grade/term/label
feeStructureSchema.index({ schoolId: 1, gradeLevel: 1, term: 1, label: 1 }, { unique: true });

export default mongoose.model('FeeStructure', feeStructureSchema);
