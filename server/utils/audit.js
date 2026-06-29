import AuditLog from '../models/AuditLog.js';

/**
 * Security/compliance audit logging. Other features (auth, user management,
 * payments, password resets, ...) call logAudit() instead of touching the model.
 *
 * Logging is fire-and-forget safe: it never throws and never blocks the caller's
 * happy path. On failure it logs to the console and returns null, so a broken
 * audit write can never break the action that triggered it.
 */

// Create a single audit record. Safe to call without awaiting.
export async function logAudit({
    schoolId = null,
    userId = null,
    userRole = '',
    action,
    entity = '',
    entityId = '',
    meta = {},
    ip = '',
}) {
    try {
        return await AuditLog.create({
            schoolId, userId, userRole, action, entity, entityId, meta, ip,
        });
    } catch (e) {
        console.error('audit failed:', e.message);
        return null;
    }
}

// Best-effort client IP for callers to pass as `ip` (honours proxy header).
export function getIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
}
