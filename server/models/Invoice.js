import mongoose from 'mongoose';

// A billable invoice issued to a student, optionally derived from a FeeStructure.
const invoiceSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', default: null },
    description: { type: String },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['unpaid', 'paid', 'overdue', 'partial'], default: 'unpaid' },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date, default: null },
}, { timestamps: true });

invoiceSchema.index({ schoolId: 1, studentId: 1 });
invoiceSchema.index({ schoolId: 1, status: 1 });

export default mongoose.model('Invoice', invoiceSchema);
