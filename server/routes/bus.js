import express from 'express';
import Bus from '../models/Bus.js';
import BusRoute from '../models/BusRoute.js';
import BusStudent from '../models/BusStudent.js';
import BusRide from '../models/BusRide.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import protect from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { notifyUsers } from '../utils/notify.js';

const router = express.Router();
router.use(protect);

const schoolOf = (req) => req.user.schoolId || req.body.schoolId || req.query.schoolId;
const midnight = (d) => { const x = new Date(d || Date.now()); x.setUTCHours(0, 0, 0, 0); return x; };

async function ensureRide(schoolId, routeId, studentId, date) {
    return BusRide.findOneAndUpdate(
        { schoolId, studentId, date },
        { $setOnInsert: { routeId, willRide: true, status: 'expected' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

// Find parent user ids for a given student.
async function parentIdsOf(schoolId, studentId) {
    const parents = await User.find({ schoolId, role: 'parent', parentOf: studentId }).select('_id').lean();
    return parents.map(p => p._id);
}

// ============================================================
// SUPERVISOR
// ============================================================

// GET /api/bus/my-route
router.get('/my-route', allowRoles('bus_supervisor'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const route = await BusRoute.findOne({ schoolId, supervisorId: req.user._id }).populate('busId').lean();
        if (!route) return res.status(404).json({ message: 'No route assigned' });
        const bus = route.busId || {};
        res.json({
            route: { id: route._id, name: route.name, notifyLeadMinutes: route.notifyLeadMinutes },
            bus: { busNumber: bus.busNumber, plate: bus.plate, capacity: bus.capacity },
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/bus/students?date=
router.get('/students', allowRoles('bus_supervisor'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const date = midnight(req.query.date);
        const route = await BusRoute.findOne({ schoolId, supervisorId: req.user._id }).lean();
        if (!route) return res.status(404).json({ message: 'No route assigned' });

        const busStudents = await BusStudent.find({ routeId: route._id }).sort({ stopOrder: 1 }).lean();

        const items = await Promise.all(busStudents.map(async (bs) => {
            const [student, enrollment, parents, ride] = await Promise.all([
                User.findById(bs.studentId).select('name').lean(),
                Enrollment.findOne({ schoolId, studentId: bs.studentId, status: 'active' }).populate('classroomId', 'name').lean(),
                User.findOne({ schoolId, role: 'parent', parentOf: bs.studentId }).select('name phone').lean(),
                BusRide.findOne({ schoolId, studentId: bs.studentId, date }).lean(),
            ]);
            return {
                studentId: bs.studentId,
                name: student?.name || '',
                grade: enrollment?.classroomId?.name || '',
                parentName: parents?.name || '',
                parentPhone: parents?.phone || '',
                homeAddress: bs.homeAddress,
                homeLat: bs.homeLat,
                homeLng: bs.homeLng,
                stopOrder: bs.stopOrder,
                willRide: ride ? ride.willRide : true,
                status: ride ? ride.status : 'expected',
                pickedUpAt: ride ? ride.pickedUpAt : null,
                arrivedAt: ride ? ride.arrivedAt : null,
            };
        }));

        res.json(items);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/bus/dashboard?date=
router.get('/dashboard', allowRoles('bus_supervisor'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const date = midnight(req.query.date);
        const route = await BusRoute.findOne({ schoolId, supervisorId: req.user._id }).lean();
        if (!route) return res.status(404).json({ message: 'No route assigned' });

        const busStudents = await BusStudent.find({ routeId: route._id }).lean();
        const studentIds = busStudents.map(bs => bs.studentId);
        const rides = await BusRide.find({ schoolId, studentId: { $in: studentIds }, date }).lean();
        const rideMap = Object.fromEntries(rides.map(r => [String(r.studentId), r]));

        let expectedToday = 0, pickedUp = 0, remaining = 0, arrived = 0;
        for (const bs of busStudents) {
            const ride = rideMap[String(bs.studentId)];
            const willRide = ride ? ride.willRide : true;
            const status = ride ? ride.status : 'expected';
            if (willRide !== false) expectedToday++;
            if (status === 'picked_up' || status === 'arrived') pickedUp++;
            if (willRide && status === 'expected') remaining++;
            if (status === 'arrived') arrived++;
        }

        res.json({
            registered: busStudents.length,
            expectedToday,
            pickedUp,
            remaining,
            arrived,
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/bus/on-the-way?date=
router.post('/on-the-way', allowRoles('bus_supervisor'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const date = midnight(req.query.date);
        const route = await BusRoute.findOne({ schoolId, supervisorId: req.user._id }).lean();
        if (!route) return res.status(404).json({ message: 'No route assigned' });

        const busStudents = await BusStudent.find({ routeId: route._id }).sort({ stopOrder: 1 }).lean();
        const studentIds = busStudents.map(bs => bs.studentId);
        const rides = await BusRide.find({ schoolId, studentId: { $in: studentIds }, date }).lean();
        const rideMap = Object.fromEntries(rides.map(r => [String(r.studentId), r]));

        // students still expected to ride
        const pending = busStudents.filter(bs => {
            const ride = rideMap[String(bs.studentId)];
            const willRide = ride ? ride.willRide : true;
            const status = ride ? ride.status : 'expected';
            return willRide && status === 'expected';
        });

        if (!pending.length) return res.json({ notified: 0, stopOrder: null });

        const minStop = Math.min(...pending.map(p => p.stopOrder));
        const atStop = pending.filter(p => p.stopOrder === minStop);

        let parentIds = [];
        for (const bs of atStop) {
            const ids = await parentIdsOf(schoolId, bs.studentId);
            parentIds = parentIds.concat(ids);
        }

        await notifyUsers(schoolId, parentIds, {
            type: 'general',
            title: '🚌 School bus approaching',
            body: 'The school bus is approaching your location, please be ready.',
        });

        res.json({ notified: parentIds.length, stopOrder: minStop });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/bus/students/:studentId/pickup?date=
router.post('/students/:studentId/pickup', allowRoles('bus_supervisor'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const date = midnight(req.query.date);
        const route = await BusRoute.findOne({ schoolId, supervisorId: req.user._id }).lean();
        if (!route) return res.status(404).json({ message: 'No route assigned' });

        const ride = await ensureRide(schoolId, route._id, req.params.studentId, date);
        ride.status = 'picked_up';
        ride.pickedUpAt = new Date();
        await ride.save();

        const parentIds = await parentIdsOf(schoolId, req.params.studentId);
        await notifyUsers(schoolId, parentIds, {
            type: 'general',
            title: '✅ Boarded the bus',
            body: 'Your child has boarded the school bus.',
        });

        res.json(ride);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/bus/arrived?date=
router.post('/arrived', allowRoles('bus_supervisor'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const date = midnight(req.query.date);
        const route = await BusRoute.findOne({ schoolId, supervisorId: req.user._id }).lean();
        if (!route) return res.status(404).json({ message: 'No route assigned' });

        const rides = await BusRide.find({ routeId: route._id, date, status: 'picked_up' });
        const now = new Date();
        for (const ride of rides) {
            ride.status = 'arrived';
            ride.arrivedAt = now;
            await ride.save();
            const parentIds = await parentIdsOf(schoolId, ride.studentId);
            await notifyUsers(schoolId, parentIds, {
                type: 'general',
                title: '🏫 Arrived at school',
                body: 'Your child has arrived at school safely.',
            });
        }

        res.json({ arrived: rides.length });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================================
// PARENT
// ============================================================

// POST /api/bus/absence { studentId, date }
router.post('/absence', allowRoles('parent'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { studentId, date } = req.body;
        const owned = (req.user.parentOf || []).map(String);
        if (!studentId || !owned.includes(String(studentId))) {
            return res.status(403).json({ message: 'Access denied: not your child' });
        }

        const busStudent = await BusStudent.findOne({ schoolId, studentId }).lean();
        if (!busStudent) return res.status(404).json({ message: 'Student not on any bus route' });

        let day;
        if (date) {
            day = midnight(date);
        } else {
            const tomorrow = new Date();
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            day = midnight(tomorrow);
        }

        const ride = await ensureRide(schoolId, busStudent.routeId, studentId, day);
        ride.willRide = false;
        ride.status = 'absent';
        await ride.save();

        res.json({ ok: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================================
// ADMIN
// ============================================================

// POST /api/bus/buses { busNumber, plate, capacity }
router.post('/buses', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { busNumber, plate, capacity } = req.body;
        const bus = await Bus.create({ schoolId, busNumber, plate, capacity });
        res.status(201).json(bus);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/bus/buses
router.get('/buses', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const list = await Bus.find({ schoolId }).sort({ busNumber: 1 }).lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/bus/routes { busId, name, supervisorId, notifyLeadMinutes }
router.post('/routes', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { busId, name, supervisorId, notifyLeadMinutes } = req.body;
        const route = await BusRoute.create({ schoolId, busId, name, supervisorId, notifyLeadMinutes });
        res.status(201).json(route);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/bus/routes
router.get('/routes', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const list = await BusRoute.find({ schoolId })
            .populate('busId')
            .populate('supervisorId', 'name')
            .sort({ name: 1 }).lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/bus/routes/:routeId/students { studentId, stopOrder, homeAddress, homeLat, homeLng }
router.post('/routes/:routeId/students', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const { studentId, stopOrder, homeAddress, homeLat, homeLng } = req.body;
        const busStudent = await BusStudent.findOneAndUpdate(
            { routeId: req.params.routeId, studentId },
            { schoolId, stopOrder, homeAddress, homeLat, homeLng },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json(busStudent);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/bus/routes/:routeId { notifyLeadMinutes, name, supervisorId }
router.patch('/routes/:routeId', allowRoles('school_admin', 'super_admin'), async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const update = {};
        if (req.body.notifyLeadMinutes !== undefined) update.notifyLeadMinutes = req.body.notifyLeadMinutes;
        if (req.body.name !== undefined) update.name = req.body.name;
        if (req.body.supervisorId !== undefined) update.supervisorId = req.body.supervisorId;
        const route = await BusRoute.findOneAndUpdate(
            { _id: req.params.routeId, schoolId },
            update,
            { new: true }
        );
        if (!route) return res.status(404).json({ message: 'Route not found' });
        res.json(route);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
