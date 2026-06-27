/**
 * seed-dashboard.js — populates the existing Novora school with realistic
 * dummy data so the Admin Dashboard features have something to show.
 *
 * Run:  node server/seed-dashboard.js
 *
 * SAFE & RE-RUNNABLE:
 *  - Reuses the existing "Novora High" school + active academic year.
 *  - All seeded users live under the @demo.novora.com email domain and all
 *    seeded classrooms are named "Grade X-Y". On each run we first delete the
 *    previously-seeded demo data, then regenerate it.
 *  - Existing data (Theory of Computation demo, the real admin accounts) is
 *    never touched.
 *
 * Shared password for every demo account:  Demo123!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';

import School from './models/School.js';
import AcademicYear from './models/AcademicYear.js';
import Subject from './models/Subject.js';
import Classroom from './models/Classroom.js';
import User from './models/User.js';
import Enrollment from './models/Enrollment.js';
import Schedule from './models/Schedule.js';
import Attendance from './models/Attendance.js';
import Exam from './models/Exam.js';
import ExamAttempt from './models/ExamAttempt.js';

dotenv.config();

const DEMO_DOMAIN = 'demo.novora.com';
const DEMO_PASSWORD = 'Demo123!';

// ---- Config ----------------------------------------------------------
const NUM_TEACHERS = 20;
const GRADES = [1, 2, 3, 4];
const SECTIONS = ['A', 'B']; // -> 8 classrooms
const STUDENTS_MIN = 22;
const STUDENTS_MAX = 27;
const SCHOOL_DAYS = [0, 1, 2, 3, 4]; // Sun..Thu (dayOfWeek convention 0=Sun)
const PERIODS = [
    ['08:00', '08:45'],
    ['08:50', '09:35'],
    ['09:40', '10:25'],
    ['10:45', '11:30'],
    ['11:35', '12:20'],
    ['13:00', '13:45'],
];
const SUBJECTS = [
    'Mathematics', 'English', 'Science', 'History',
    'Geography', 'Computer Science', 'Art', 'Physical Education',
];
const ATTENDANCE_DAYS = 20;

// ---- Tiny name generator (no external deps) --------------------------
const FIRST = ['Omar', 'Lina', 'Youssef', 'Sara', 'Khaled', 'Mariam', 'Adam', 'Nour',
    'Ali', 'Hana', 'Karim', 'Salma', 'Tariq', 'Layla', 'Hassan', 'Dina', 'Ziad',
    'Farah', 'Rami', 'Jana', 'Amir', 'Maya', 'Sami', 'Yara', 'Bilal', 'Reem',
    'Tamer', 'Nada', 'Fadi', 'Aya'];
const LAST = ['Hassan', 'Ibrahim', 'Mansour', 'Saleh', 'Khalil', 'Nasser', 'Fares',
    'Darwish', 'Habib', 'Kamal', 'Saad', 'Younis', 'Rashed', 'Halabi', 'Aziz',
    'Maliki', 'Qassem', 'Najjar', 'Sabbagh', 'Toumi'];

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
let nameSeq = 0;
const fullName = () => `${pick(FIRST)} ${pick(LAST)}`;

async function main() {
    await connectDB();

    const school = await School.findOne({ subdomain: 'novora' });
    if (!school) throw new Error('Novora High school not found. Run the base setup first.');
    const year = await AcademicYear.findOne({ schoolId: school._id, isActive: true });
    if (!year) throw new Error('No active academic year found.');
    const schoolId = school._id;
    const academicYearId = year._id;

    console.log(`School: ${school.name}  |  Year: ${year.name}`);

    // ---- 1. Clean previous demo data --------------------------------
    const demoUsers = await User.find({ email: { $regex: `@${DEMO_DOMAIN}$` } }).select('_id');
    const demoUserIds = demoUsers.map(u => u._id);
    const demoClassrooms = await Classroom.find({ schoolId, name: { $regex: '^Grade ' } }).select('_id');
    const demoClassroomIds = demoClassrooms.map(c => c._id);

    if (demoUserIds.length || demoClassroomIds.length) {
        await ExamAttempt.deleteMany({ userId: { $in: demoUserIds } });
        await Exam.deleteMany({ classroomId: { $in: demoClassroomIds } });
        await Attendance.deleteMany({ studentId: { $in: demoUserIds } });
        await Enrollment.deleteMany({ studentId: { $in: demoUserIds } });
        await Schedule.deleteMany({ classroomId: { $in: demoClassroomIds } });
        await Classroom.deleteMany({ _id: { $in: demoClassroomIds } });
        await User.deleteMany({ _id: { $in: demoUserIds } });
        console.log(`Cleaned previous demo data (${demoUserIds.length} users, ${demoClassroomIds.length} classrooms).`);
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    let emailSeq = 0;
    const demoEmail = (prefix) => `${prefix}${++emailSeq}@${DEMO_DOMAIN}`;

    // ---- 2. Subjects (reuse by title, create if missing) ------------
    const subjectIds = [];
    for (const title of SUBJECTS) {
        let subj = await Subject.findOne({ schoolId, title });
        if (!subj) subj = await Subject.create({ schoolId, title, isActive: true });
        subjectIds.push(subj._id);
    }

    // ---- 3. Teachers (each with a primary subject) ------------------
    const teacherDocs = [];
    for (let i = 0; i < NUM_TEACHERS; i++) {
        teacherDocs.push({
            schoolId, name: fullName(), email: demoEmail('teacher'),
            password: passwordHash, role: 'teacher',
        });
    }
    const teachers = await User.insertMany(teacherDocs);
    const teacherSubject = {}; // teacherId -> subjectId
    teachers.forEach((t, i) => { teacherSubject[t._id] = subjectIds[i % subjectIds.length]; });

    // ---- 4. Classrooms (with homeroom teacher) ----------------------
    const classroomDocs = [];
    for (const g of GRADES) {
        for (const s of SECTIONS) {
            classroomDocs.push({
                schoolId, academicYearId, name: `Grade ${g}-${s}`,
                homeroomTeacherId: teachers[rnd(0, teachers.length - 1)]._id,
            });
        }
    }
    const classrooms = await Classroom.insertMany(classroomDocs);

    // ---- 5. Students + enrollments + parents ------------------------
    const studentsByClass = {};
    let totalStudents = 0;
    const allEnrollments = [];
    const parentDocs = [];
    const parentLinks = []; // {parentTmpIndex, studentId}

    for (const c of classrooms) {
        const n = rnd(STUDENTS_MIN, STUDENTS_MAX);
        const studentDocs = [];
        for (let i = 0; i < n; i++) {
            studentDocs.push({
                schoolId, name: fullName(), email: demoEmail('student'),
                password: passwordHash, role: 'student',
            });
        }
        const students = await User.insertMany(studentDocs);
        studentsByClass[c._id] = students;
        totalStudents += students.length;

        for (const st of students) {
            allEnrollments.push({
                schoolId, studentId: st._id, classroomId: c._id,
                academicYearId, status: 'active',
            });
            // one parent per student, linked via parentOf
            const pIdx = parentDocs.length;
            parentDocs.push({
                schoolId, name: fullName(), email: demoEmail('parent'),
                password: passwordHash, role: 'parent', parentOf: [st._id],
            });
            parentLinks.push({ pIdx, studentId: st._id });
        }
    }
    await Enrollment.insertMany(allEnrollments);
    await User.insertMany(parentDocs);

    // ---- 6. Weekly timetable (no teacher double-booking per slot) ---
    const scheduleDocs = [];
    for (const day of SCHOOL_DAYS) {
        for (const [start, end] of PERIODS) {
            // distinct teacher per classroom in this exact day+slot
            const pool = shuffle(teachers);
            classrooms.forEach((c, idx) => {
                const teacher = pool[idx % pool.length];
                scheduleDocs.push({
                    schoolId, teacherId: teacher._id, classroomId: c._id,
                    subjectId: teacherSubject[teacher._id],
                    dayOfWeek: day, startTime: start, endTime: end,
                    room: c.name.replace('Grade ', 'R'),
                });
            });
        }
    }
    await Schedule.insertMany(scheduleDocs);

    // ---- 7. Attendance (last ATTENDANCE_DAYS school days) -----------
    const attendanceDocs = [];
    const today = new Date();
    const dates = [];
    let d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    while (dates.length < ATTENDANCE_DAYS) {
        if (SCHOOL_DAYS.includes(d.getUTCDay())) dates.push(new Date(d));
        d = new Date(d.getTime() - 86400000);
    }
    for (const c of classrooms) {
        const homeroom = c.homeroomTeacherId;
        for (const st of studentsByClass[c._id]) {
            for (const dt of dates) {
                const r = Math.random();
                const status = r < 0.9 ? 'present' : r < 0.95 ? 'late' : r < 0.98 ? 'absent' : 'excused';
                attendanceDocs.push({
                    schoolId, classroomId: c._id, studentId: st._id,
                    takenBy: homeroom, date: dt, status,
                });
            }
        }
    }
    await Attendance.insertMany(attendanceDocs);

    // ---- 8. Exams + attempts (drive XP-based ranking) ---------------
    const examDocs = [];
    for (const c of classrooms) {
        // 2 standalone exams per classroom (chapterId null -> counts toward ranking XP)
        for (let k = 1; k <= 2; k++) {
            const subjId = subjectIds[rnd(0, subjectIds.length - 1)];
            // find a teacher who teaches this subject, else any
            const teacher = teachers.find(t => String(teacherSubject[t._id]) === String(subjId)) || teachers[0];
            examDocs.push({
                schoolId, subjectId: subjId, teacherId: teacher._id,
                classroomId: c._id, chapterId: null,
                title: `${c.name} Assessment ${k}`, passingScore: 50,
                isPublished: true,
            });
        }
    }
    const exams = await Exam.insertMany(examDocs);

    const attemptDocs = [];
    // slight per-class ability bias so rankings differ
    const classBias = {};
    classrooms.forEach(c => { classBias[c._id] = rnd(-10, 10); });
    for (const exam of exams) {
        const students = studentsByClass[exam.classroomId];
        for (const st of students) {
            const base = 65 + classBias[exam.classroomId] + rnd(-15, 15);
            const score = Math.max(0, Math.min(100, base));
            attemptDocs.push({
                schoolId, userId: st._id, examId: exam._id,
                answers: {}, score, passed: score >= exam.passingScore,
                takenAt: new Date(),
            });
        }
    }
    await ExamAttempt.insertMany(attemptDocs);

    // ---- Summary ----------------------------------------------------
    console.log('\n==== Seed complete ====');
    console.log(`  Subjects   : ${subjectIds.length}`);
    console.log(`  Teachers   : ${teachers.length}`);
    console.log(`  Classrooms : ${classrooms.length}`);
    console.log(`  Students   : ${totalStudents}`);
    console.log(`  Parents    : ${parentDocs.length}`);
    console.log(`  Schedule   : ${scheduleDocs.length}`);
    console.log(`  Attendance : ${attendanceDocs.length}`);
    console.log(`  Exams      : ${exams.length}`);
    console.log(`  Attempts   : ${attemptDocs.length}`);
    console.log('\n  Demo login for any seeded account: password = ' + DEMO_PASSWORD);

    await mongoose.disconnect();
}

main().catch(err => { console.error('Seed error:', err); process.exit(1); });
