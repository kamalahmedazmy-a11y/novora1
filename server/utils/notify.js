import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail, sendSms } from './mailer.js';

/**
 * Shared notification helpers. Other features (attendance alerts, announcements,
 * leave approvals, fee reminders, ...) call these instead of touching the model.
 *
 * Every in-app notification ALSO attempts email + SMS delivery (best-effort,
 * non-blocking) via the pluggable mailer. Without SMTP/Twilio env vars the
 * mailer just logs to the console — so callers never need to change when real
 * delivery is later switched on.
 */

// Fire email + SMS for a set of recipients without blocking the caller.
async function dispatchExternal(recipientIds, payload) {
    try {
        const users = await User.find({ _id: { $in: recipientIds } }).select('email phone').lean();
        const text = `${payload.title}${payload.body ? '\n\n' + payload.body : ''}`;
        await Promise.all(users.flatMap(u => [
            u.email ? sendEmail({ to: u.email, subject: payload.title, text }) : null,
            u.phone ? sendSms({ to: u.phone, body: `${payload.title}: ${payload.body || ''}`.trim() }) : null,
        ].filter(Boolean)));
    } catch (e) {
        console.error('dispatchExternal failed:', e.message);
    }
}

// Notify a single user (in-app + email/SMS).
export async function notifyUser(schoolId, recipientId, { type = 'general', title, body = '', link = '' }) {
    if (!recipientId) return null;
    const doc = await Notification.create({ schoolId, recipientId, type, title, body, link });
    dispatchExternal([recipientId], { title, body }); // fire-and-forget
    return doc;
}

// Notify many users at once (one document each, for per-user read state).
export async function notifyUsers(schoolId, recipientIds, payload) {
    const ids = [...new Set((recipientIds || []).map(String))];
    if (!ids.length) return [];
    const docs = ids.map(recipientId => ({
        schoolId, recipientId,
        type: payload.type || 'general',
        title: payload.title,
        body: payload.body || '',
        link: payload.link || '',
    }));
    const created = await Notification.insertMany(docs);
    dispatchExternal(ids, payload); // fire-and-forget
    return created;
}

// Broadcast to every active user in a role within a school (fan-out).
export async function notifyRole(schoolId, role, payload) {
    const users = await User.find({ schoolId, role, isActive: true }).select('_id').lean();
    return notifyUsers(schoolId, users.map(u => u._id), payload);
}
