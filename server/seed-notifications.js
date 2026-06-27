/** Seed a few demo notifications for the school admin so the bell shows data.
 *  Run: node server/seed-notifications.js   (safe/re-runnable) */
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import School from './models/School.js';
import User from './models/User.js';
import Notification from './models/Notification.js';

async function main() {
    await connectDB();
    const school = await School.findOne({ subdomain: 'novora' });
    const admin = await User.findOne({ email: 'admin@novora.com' });

    await Notification.deleteMany({ recipientId: admin._id });
    const now = Date.now();
    const demo = [
        { type: 'attendance', title: '3 students marked absent today', body: 'Grade 1-A, Grade 2-B and Grade 3-A reported absences.', ago: 5 },
        { type: 'leave', title: 'Leave request pending', body: 'A teacher requested leave for Thursday.', ago: 90 },
        { type: 'fee', title: '12 invoices overdue', body: 'Term fees past due for 12 students.', ago: 60 * 24 },
        { type: 'general', title: 'Welcome to Novora notifications', body: 'This is the shared notification system.', ago: 60 * 48 },
    ];
    await Notification.insertMany(demo.map(d => ({
        schoolId: school._id, recipientId: admin._id, type: d.type,
        title: d.title, body: d.body, createdAt: new Date(now - d.ago * 60000),
        readAt: d.type === 'general' ? new Date() : null,
    })));
    console.log(`Seeded ${demo.length} notifications for ${admin.email} (3 unread).`);
    await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
