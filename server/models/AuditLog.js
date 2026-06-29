import mongoose from 'mongoose';

// An immutable security/compliance audit record. One document per significant
// action (auth, user lifecycle, role changes, payments, password resets, ...).
// Written fire-and-forget via utils/audit.js so logging never blocks or breaks
// the request that triggered it.
const auditLogSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        default: null,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    userRole: { type: String, default: '' },
    // e.g. 'auth.login', 'auth.login_failed', 'auth.logout', 'user.create',
    // 'user.delete', 'user.role_change', 'payment.record', 'password.reset'
    action: { type: String, required: true, index: true },
    entity: { type: String, default: '' },
    entityId: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ schoolId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
