import express from 'express';
import School from '../models/School.js';
import User from '../models/User.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth protection & role restriction to all admin routes
router.use(protect);
router.use(allowRoles('super_admin'));

// @desc    List all schools with basic stats
// @route   GET /api/admin/schools
// @access  Private (super_admin)
router.get('/schools', async (req, res) => {
    try {
        const schools = await School.find({});
        
        // Fetch student and teacher counts for each school
        const schoolsWithStats = await Promise.all(schools.map(async (school) => {
            const studentCount = await User.countDocuments({ schoolId: school._id, role: 'student' });
            const teacherCount = await User.countDocuments({ schoolId: school._id, role: 'teacher' });
            
            return {
                ...school.toObject(),
                stats: {
                    students: studentCount,
                    teachers: teacherCount
                }
            };
        }));
        
        res.json(schoolsWithStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a new school
// @route   POST /api/admin/schools
// @access  Private (super_admin)
router.post('/schools', async (req, res) => {
    const { name, subdomain, subscriptionPlan, settings } = req.body;
    try {
        const schoolExists = await School.findOne({ subdomain: subdomain.toLowerCase() });
        if (schoolExists) {
            return res.status(400).json({ message: 'Subdomain already exists' });
        }

        const school = await School.create({
            name,
            subdomain: subdomain.toLowerCase(),
            subscriptionPlan: subscriptionPlan || 'free',
            settings: settings || {}
        });

        res.status(201).json(school);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update school status (activate/suspend)
// @route   PATCH /api/admin/schools/:id/status
// @access  Private (super_admin)
router.patch('/schools/:id/status', async (req, res) => {
    const { isActive } = req.body;
    try {
        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        school.isActive = isActive !== undefined ? isActive : school.isActive;
        await school.save();

        res.json(school);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
