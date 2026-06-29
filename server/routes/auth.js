import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import School from '../models/School.js';
import RefreshToken from '../models/RefreshToken.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, registerSchoolSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation/authSchemas.js';
import { logAudit, getIp } from '../utils/audit.js';
import { sendEmail } from '../utils/mailer.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);

// Short-lived access token.
const generateToken = (id, schoolId, role) => {
    return jwt.sign({ id, schoolId, role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
};

// Issue a refresh token (random, stored hashed for rotation/revocation).
const issueRefreshToken = async (userId) => {
    const raw = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ userId, tokenHash, expiresAt });
    return raw;
};

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// @desc    Register a new user (Admin/Super Admin only)
// @route   POST /api/auth/register
// @access  Private (school_admin, super_admin)
router.post('/register', protect, allowRoles('school_admin', 'super_admin'), validate(registerSchema), async (req, res) => {
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

        // Create user (new sign-ups start unverified; a verify token is generated)
        const verifyToken = crypto.randomBytes(20).toString('hex');
        const user = await User.create({
            schoolId: targetSchoolId,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: targetRole,
            parentOf: parentOf || [],
            isVerified: false,
            verifyToken,
        });

        if (user) {
            // best-effort verification email (console fallback without SMTP)
            sendEmail({ to: user.email, subject: 'Verify your Novora account', text: `Verification token: ${verifyToken}` });
            logAudit({ schoolId: targetSchoolId, userId: req.user._id, userRole: req.user.role, action: 'user.create', entity: 'User', entityId: String(user._id), meta: { role: targetRole, email: user.email }, ip: getIp(req) });
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
router.post('/register-school', protect, allowRoles('super_admin'), validate(registerSchoolSchema), async (req, res) => {
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
router.post('/login', validate(loginSchema), async (req, res) => {
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
                    logAudit({ userId: superAdmin._id, userRole: superAdmin.role, action: 'auth.login', ip: getIp(req) });
                    return res.json({
                        _id: superAdmin.id,
                        name: superAdmin.name,
                        email: superAdmin.email,
                        role: superAdmin.role,
                        schoolId: null,
                        token: generateToken(superAdmin._id, null, superAdmin.role),
                        refreshToken: await issueRefreshToken(superAdmin._id),
                    });
                }
            }
        }

        const user = await User.findOne(query);

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isActive) {
                return res.status(403).json({ message: 'User account is deactivated' });
            }

            logAudit({ schoolId: user.schoolId, userId: user._id, userRole: user.role, action: 'auth.login', ip: getIp(req) });
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId,
                token: generateToken(user._id, user.schoolId, user.role),
                refreshToken: await issueRefreshToken(user._id),
            });
        } else {
            logAudit({ action: 'auth.login_failed', meta: { email: (email || '').toLowerCase() }, ip: getIp(req) });
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

// @desc    Exchange a refresh token for a new access token (rotation)
// @route   POST /api/auth/refresh
// @access  Public (requires valid refresh token)
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
        const tokenHash = hashToken(refreshToken);
        const stored = await RefreshToken.findOne({ tokenHash, revokedAt: null });
        if (!stored || stored.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }
        const user = await User.findById(stored.userId);
        if (!user || !user.isActive) return res.status(401).json({ message: 'Account unavailable' });

        // rotate: revoke the old, issue a new one
        stored.revokedAt = new Date();
        await stored.save();
        res.json({
            token: generateToken(user._id, user.schoolId, user.role),
            refreshToken: await issueRefreshToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Revoke a refresh token (logout)
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await RefreshToken.updateOne({ tokenHash: hashToken(refreshToken) }, { revokedAt: new Date() });
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Request a password reset (emails a token; console fallback w/o SMTP)
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        // Always respond 200 to avoid leaking which emails exist.
        if (user) {
            const raw = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = hashToken(raw);
            user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
            await user.save();
            sendEmail({ to: user.email, subject: 'Reset your Novora password', text: `Reset token: ${raw} (valid 30 minutes)` });
            logAudit({ schoolId: user.schoolId, userId: user._id, action: 'password.reset_requested', ip: getIp(req) });
        }
        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Reset password using a valid token
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: hashToken(token),
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });
        user.password = await bcrypt.hash(password, await bcrypt.genSalt(10));
        user.resetPasswordToken = '';
        user.resetPasswordExpires = null;
        await user.save();
        // revoke all refresh tokens on password change
        await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
        logAudit({ schoolId: user.schoolId, userId: user._id, action: 'password.reset', ip: getIp(req) });
        res.json({ message: 'Password updated. Please log in.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Verify email with a token
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ message: 'token required' });
        const user = await User.findOne({ verifyToken: token });
        if (!user) return res.status(400).json({ message: 'Invalid verification token' });
        user.isVerified = true;
        user.verifyToken = '';
        await user.save();
        res.json({ message: 'Email verified.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
