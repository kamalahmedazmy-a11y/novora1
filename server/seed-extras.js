/**
 * seed-extras.js — resets the school_admin password and seeds sample
 * tasks + parent messages so the new dashboard features have data to show.
 * Safe & re-runnable (clears prior samples for the school first).
 *
 * Run: node server/seed-extras.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import User from './models/User.js';
import School from './models/School.js';
import Schedule from './models/Schedule.js';
import Classroom from './models/Classroom.js';
import Task from './models/Task.js';
import Message from './models/Message.js';
import Staff from './models/Staff.js';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function main() {
    await connectDB();
    const school = await School.findOne({ subdomain: 'novora' });
    const schoolId = school._id;

    // 1. reset school_admin password
    const hash = await bcrypt.hash('Admin123!', 10);
    await User.updateOne({ email: 'admin@novora.com' }, { $set: { password: hash } });
    const admin = await User.findOne({ email: 'admin@novora.com' });
    console.log('Reset admin@novora.com password -> Admin123!');

    // 2. sample tasks with location snapshot (test moment: Sunday 10:00)
    const teachers = await User.find({ schoolId, role: 'teacher', email: /@demo\.novora\.com$/ }).limit(4);
    const day = 0, time = '10:00';
    const descs = [
        'Submit term grade reports by Friday.',
        'Cover the morning assembly duty.',
        'Prepare materials for the science fair.',
        'Proctor the make-up exam.',
    ];
    const statuses = ['pending', 'in_progress', 'done', 'pending'];
    await Task.deleteMany({ schoolId });
    let madeTasks = 0;
    for (let i = 0; i < teachers.length; i++) {
        const t = teachers[i];
        const slot = await Schedule.findOne({
            schoolId, teacherId: t._id, dayOfWeek: day,
            startTime: { $lte: time }, endTime: { $gte: time }
        });
        let locId = null;
        let note = `Free period at ${time} (${DAY[day]}) — not in any class`;
        if (slot) {
            const c = await Classroom.findById(slot.classroomId);
            locId = c._id;
            note = `Was in ${c.name} during ${slot.startTime}-${slot.endTime} (${DAY[day]})`;
        }
        await Task.create({
            schoolId, teacherId: t._id, assignedBy: admin._id,
            description: descs[i], status: statuses[i], dueDate: null,
            locationClassroomId: locId, locationNote: note,
        });
        madeTasks++;
    }
    console.log('Created sample tasks:', madeTasks);

    // 3. sample parent message threads
    const parents = await User.find({ schoolId, role: 'parent', email: /@demo\.novora\.com$/ }).limit(3);
    await Message.deleteMany({ schoolId });
    const threads = [
        ['Parent-teacher meeting', 'Dear parent, we invite you to the meeting next Thursday at 5 PM.', 'Thank you, I will attend.'],
        ['Absence follow-up', 'We noticed your child was absent. Is everything okay?', 'Yes, a doctor appointment. Back tomorrow.'],
        ['Fee reminder', 'Friendly reminder: term fees are due by month end.', null],
    ];
    let madeMsgs = 0;
    for (let i = 0; i < parents.length; i++) {
        const p = parents[i];
        const [subj, adminBody, reply] = threads[i];
        const t0 = new Date(Date.now() - (i + 1) * 86400000);
        await Message.create({
            schoolId, parentId: p._id, adminId: admin._id, sender: 'admin',
            subject: subj, body: adminBody, readAt: new Date(), createdAt: t0,
        });
        madeMsgs++;
        if (reply) {
            const t1 = new Date(t0.getTime() + 3600000);
            await Message.create({
                schoolId, parentId: p._id, adminId: admin._id, sender: 'parent',
                subject: 'Re: ' + subj, body: reply, readAt: null, createdAt: t1,
            });
            madeMsgs++;
        }
    }
    console.log('Created sample messages:', madeMsgs);

    // 4. non-teaching staff
    await Staff.deleteMany({ schoolId });
    const staffSeed = [
        ['Mahmoud Saad', 'security'], ['Aisha Najjar', 'nurse'],
        ['Ibrahim Halabi', 'janitor'], ['Mona Rashed', 'secretary'],
        ['Yusuf Kamal', 'janitor'], ['Layla Aziz', 'librarian'],
        ['Sami Fares', 'it_support'], ['Huda Mansour', 'accountant'],
    ];
    let madeStaff = 0;
    for (const [name, role] of staffSeed) {
        await Staff.create({
            schoolId, name, role,
            email: name.toLowerCase().replace(/\s+/g, '.') + '@novora.com',
            phone: '+20 10 ' + Math.floor(1000000 + Math.random() * 8999999),
            hireDate: new Date(Date.now() - Math.floor(Math.random() * 2000) * 86400000),
        });
        madeStaff++;
    }
    console.log('Created non-teaching staff:', madeStaff);

    await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
