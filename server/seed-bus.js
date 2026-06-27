/**
 * seed-bus.js — seeds demo data for the Bus Supervisor module:
 * a supervisor login, a bus, a route, 8 students (with parents that have
 * phones) and today's rides (7 riding + 1 absent).
 * Safe & re-runnable (clears prior bus demo for the school first).
 *
 * Run: node server/seed-bus.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import School from './models/School.js';
import User from './models/User.js';
import Classroom from './models/Classroom.js';
import Enrollment from './models/Enrollment.js';
import Bus from './models/Bus.js';
import BusRoute from './models/BusRoute.js';
import BusStudent from './models/BusStudent.js';
import BusRide from './models/BusRide.js';

async function main() {
    await connectDB();

    // 1. find the school
    const school = await School.findOne({ subdomain: 'novora' });
    if (!school) throw new Error('School with subdomain "novora" not found — run base seed first.');
    const schoolId = school._id;

    // 2. clean prior bus demo so this is re-runnable
    await User.deleteOne({ email: 'supervisor1@novora.com' });
    await Bus.deleteMany({ schoolId });
    await BusRoute.deleteMany({ schoolId });
    await BusStudent.deleteMany({ schoolId });
    await BusRide.deleteMany({ schoolId });

    // 3. supervisor user
    const supervisor = await User.create({
        schoolId,
        name: 'Mr. Adel Hassan',
        email: 'supervisor1@novora.com',
        password: await bcrypt.hash('Demo123!', 10),
        role: 'bus_supervisor',
        employeeId: 'EMP-1001',
        phone: '+20 100 1112233',
        isActive: true,
    });

    // 4. bus
    const bus = await Bus.create({
        schoolId,
        busNumber: 'BUS-07',
        plate: 'ABC-1234',
        capacity: 30,
        isActive: true,
    });

    // 5. route
    const route = await BusRoute.create({
        schoolId,
        busId: bus._id,
        name: 'Route A - Maadi',
        supervisorId: supervisor._id,
        notifyLeadMinutes: 10,
        isActive: true,
    });

    // 6. pick 8 students — from any classroom that actually has >= 8 active enrollments
    const classrooms = await Classroom.find({ schoolId });
    let enrollments = [];
    for (const c of classrooms) {
        const enr = await Enrollment.find({ schoolId, classroomId: c._id, status: 'active' }).limit(8);
        if (enr.length >= 8) { enrollments = enr; break; }
    }
    if (enrollments.length < 8) {
        throw new Error(`No classroom has 8+ active enrollments. Run server/seed-dashboard.js first.`);
    }
    const studentIds = enrollments.map(e => e.studentId);

    for (let i = 0; i < 8; i++) {
        await BusStudent.create({
            schoolId,
            routeId: route._id,
            studentId: studentIds[i],
            stopOrder: i + 1,
            homeAddress: `Building ${i + 1}, Street ${10 + i}, Maadi`,
            homeLat: 29.96 + i * 0.004,
            homeLng: 31.25 + i * 0.004,
        });
    }

    // 7. ensure each student has a parent with a phone
    let parentsCreated = 0, parentsUpdated = 0;
    for (let i = 0; i < 8; i++) {
        const studentId = studentIds[i];
        const phone = `+20 101 20000${i}`;
        const parent = await User.findOne({ role: 'parent', parentOf: studentId });
        if (parent) {
            if (!parent.phone) {
                parent.phone = phone;
                await parent.save();
                parentsUpdated++;
            }
        } else {
            await User.create({
                schoolId,
                name: `Parent of student ${i + 1}`,
                email: `busparent${i}@demo.novora.com`,
                password: await bcrypt.hash('Demo123!', 10),
                role: 'parent',
                parentOf: [studentId],
                phone,
            });
            parentsCreated++;
        }
    }

    // 8. today's rides (midnight UTC); last student is absent
    const now = new Date();
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    for (let i = 0; i < 8; i++) {
        const absent = i === 7;
        await BusRide.create({
            schoolId,
            routeId: route._id,
            studentId: studentIds[i],
            date: todayMidnight,
            willRide: !absent,
            status: absent ? 'absent' : 'expected',
        });
    }

    // 9. summary
    console.log('--- Bus module demo seeded ---');
    console.log('Supervisor login : supervisor1@novora.com / Demo123!');
    console.log('Bus number       :', bus.busNumber);
    console.log('Route            :', route.name);
    console.log('Students         : 8 total (7 riding + 1 absent)');
    console.log(`Parents          : ${parentsCreated} created, ${parentsUpdated} phone-updated`);
    console.log('Rides (today)    :', todayMidnight.toISOString().slice(0, 10));

    await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
