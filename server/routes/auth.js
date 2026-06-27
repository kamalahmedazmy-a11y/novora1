import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import School from '../models/School.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Generate JWT containing id, schoolId, role
const generateToken = (id, schoolId, role) => {
    return jwt.sign({ id, schoolId, role }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// @desc    Register a new user (Admin/Super Admin only)
// @route   POST /api/auth/register
// @access  Private (school_admin, super_admin)
router.post('/register', protect, allowRoles('school_admin', 'super_admin'), async (req, res) => {
    const { name, email, password, role, schoolId, parentOf } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Determine target schoolId:
        // Super admins can specify schoolId. School admins can only register users for their own school.
        let targetSchoolId = req.user.role === 'super_admin' ? schoolId : req.user.schoolId;

        // If target role is super_admin, require creator to be super_admin and targetSchoolId is null
        const targetRole = role || 'student';
        if (targetRole === 'super_admin') {
            if (req.user.role !== 'super_admin') {
                return res.status(403).json({ message: 'Only super admins can create super admins' });
            }
            targetSchoolId = null;
        } else if (!targetSchoolId) {
            return res.status(400).json({ message: 'School ID is required for non-super admin users' });
        }

        // Check user existence in the target school
        const userExists = await User.findOne({ schoolId: targetSchoolId, email: email.toLowerCase() });

        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists in this school' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            schoolId: targetSchoolId,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: targetRole,
            parentOf: parentOf || [],
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register a new school along with its initial school admin
// @route   POST /api/auth/register-school
// @access  Private (super_admin)
router.post('/register-school', protect, allowRoles('super_admin'), async (req, res) => {
    const { schoolName, subdomain, adminName, adminEmail, adminPassword } = req.body;

    try {
        if (!schoolName || !subdomain || !adminName || !adminEmail || !adminPassword) {
            return res.status(400).json({ message: 'Please provide all school and admin details' });
        }

        // Check if subdomain is taken
        const subdomainExists = await School.findOne({ subdomain: subdomain.toLowerCase() });
        if (subdomainExists) {
            return res.status(400).json({ message: 'Subdomain is already registered' });
        }

        // Create School
        const school = await School.create({
            name: schoolName,
            subdomain: subdomain.toLowerCase(),
        });

        // Hash admin password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Create School Admin
        const adminUser = await User.create({
            schoolId: school._id,
            name: adminName,
            email: adminEmail.toLowerCase(),
            password: hashedPassword,
            role: 'school_admin',
        });

        res.status(201).json({
            message: 'School and Admin registered successfully',
            school,
            admin: {
                _id: adminUser.id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role,
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password, subdomain } = req.body;

    try {
        const query = { email: email.toLowerCase() };
        
        // Scope login by subdomain if provided
        if (subdomain) {
            const school = await School.findOne({ subdomain: subdomain.toLowerCase() });
            if (school) {
                query.schoolId = school._id;
            } else {
                return res.status(404).json({ message: 'School subdomain not found' });
            }
        } else {
            // If subdomain not provided, we first check for super admin
            // Super admin does not have a schoolId
            const superAdmin = await User.findOne({ email: email.toLowerCase(), role: 'super_admin' });
            if (superAdmin) {
                if (await bcrypt.compare(password, superAdmin.password)) {
                    return res.json({
                        _id: superAdmin.id,
                        name: superAdmin.name,
                        email: superAdmin.email,
                        role: superAdmin.role,
                        schoolId: null,
                        token: generateToken(superAdmin._id, null, superAdmin.role),
                    });
                }
            }
        }

        const user = await User.findOne(query);

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isActive) {
                return res.status(403).json({ message: 'User account is deactivated' });
            }

            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId,
                token: generateToken(user._id, user.schoolId, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        res.json({
            _id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            schoolId: req.user.schoolId,
            parentOf: req.user.parentOf,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get school details of the current logged-in user
// @route   GET /api/auth/school
// @access  Private
router.get('/school', protect, async (req, res) => {
    try {
        if (!req.user.schoolId) {
            return res.status(400).json({ message: 'User is not associated with any school' });
        }
        const school = await School.findById(req.user.schoolId);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }
        res.json(school);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
