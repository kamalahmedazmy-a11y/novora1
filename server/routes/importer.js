import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AcademicYear from '../models/AcademicYear.js';
import Classroom from '../models/Classroom.js';
import Enrollment from '../models/Enrollment.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

// @desc    Bulk import users (students/teachers/parents) from spreadsheet rows
// @route   POST /api/import/users
// @access  Private (school_admin, super_admin)
router.post('/users', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    const { role, rows } = req.body;

    try {
        const schoolId = req.user.schoolId || req.body.schoolId;

        const validRoles = ['student', 'teacher', 'parent'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Role must be one of: 'student', 'teacher', 'parent'" });
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: 'Rows must be a non-empty array' });
        }

        // Hash the default password ONCE and reuse for all rows
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Welcome123!', salt);

        // Look up the active academic year once (only needed for student enrollments)
        let activeYear = null;
        if (role === 'student') {
            activeYear = await AcademicYear.findOne({ schoolId, isActive: true });
        }

        let created = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || {};
            const rowRef = row.email || i;

            try {
                const name = row.name && String(row.name).trim();
                const email = row.email && String(row.email).trim().toLowerCase();

                if (!name || !email) {
                    errors.push({ row: rowRef, message: 'Missing required field: name and email' });
                    continue;
                }

                // Skip (don't error the batch) if the email already exists in this school
                const userExists = await User.findOne({ schoolId, email });
                if (userExists) {
                    skipped++;
                    continue;
                }

                const newUser = await User.create({
                    schoolId,
                    name,
                    email,
                    password: hashedPassword,
                    role,
                });

                created++;

                // Student enrollment into a classroom by name
                if (role === 'student' && row.className) {
                    const className = String(row.className).trim();

                    if (!activeYear) {
                        errors.push({ row: rowRef, message: 'No active academic year found; student created without enrollment' });
                    } else {
                        const classroom = await Classroom.findOne({ schoolId, name: className });
                        if (!classroom) {
                            errors.push({ row: rowRef, message: `Classroom '${className}' not found; student created without enrollment` });
                        } else {
                            await Enrollment.create({
                                schoolId,
                                studentId: newUser._id,
                                classroomId: classroom._id,
                                academicYearId: activeYear._id,
                                status: 'active',
                            });
                        }
                    }
                }

                // Parent linking to a child student by email
                if (role === 'parent' && row.childEmail) {
                    const childEmail = String(row.childEmail).trim().toLowerCase();
                    const child = await User.findOne({ schoolId, email: childEmail, role: 'student' });
                    if (child) {
                        newUser.parentOf = [child._id];
                        await newUser.save();
                    } else {
                        errors.push({ row: rowRef, message: `Child with email '${childEmail}' not found; parent created without link` });
                    }
                }
            } catch (rowError) {
                errors.push({ row: rowRef, message: rowError.message });
            }
        }

        res.status(200).json({ created, skipped, errors });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
