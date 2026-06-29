import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';

// Fail fast if critical secrets are missing — never fall back to a weak default.
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
}

// Import Middleware
import protect from './middleware/authMiddleware.js';
import { tenantMiddleware, tenantPlugin } from './middleware/tenantMiddleware.js';

// Import Routes
import authRoutes from './routes/auth.js';
import progressRoutes from './routes/progress.js';
import chapterRoutes from './routes/chapters.js';
import adminRoutes from './routes/admin.js';
import schoolRoutes from './routes/school.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import parentRoutes from './routes/parent.js';
import rankingRoutes from './routes/ranking.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import staffingRoutes from './routes/staffing.js';
import announcementRoutes from './routes/announcements.js';
import incidentRoutes from './routes/incidents.js';
import leaveRoutes from './routes/leave.js';
import financeRoutes from './routes/finance.js';
import reportcardRoutes from './routes/reportcard.js';
import importerRoutes from './routes/importer.js';
import homeworkRoutes from './routes/homework.js';
import calendarRoutes from './routes/calendar.js';
import messageRoutes from './routes/messages.js';
import fileRoutes from './routes/files.js';
import busRoutes from './routes/bus.js';

// Register tenant isolation plugin on mongoose globally before connecting
mongoose.plugin(tenantPlugin);

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(helmet()); // secure HTTP headers

// CORS — restrict to known origins when configured, otherwise allow (dev).
const allowedOrigins = (process.env.CLIENT_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors(allowedOrigins.length
    ? { origin: allowedOrigins, credentials: true }
    : {}));

app.use(express.json({ limit: '1mb', extended: false }));

// Rate limiting: a general cap on the whole API + a strict cap on auth.
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({
    windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
    message: { message: 'Too many attempts, please try again in a minute.' },
});
app.use('/api', apiLimiter);

// Health check (for monitoring / load balancers)
app.get('/api/health', (req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
        status: dbUp ? 'ok' : 'degraded',
        db: dbUp ? 'connected' : 'disconnected',
        uptime: process.uptime(),
    });
});

// Define Routes
app.use('/api/auth', authLimiter, authRoutes); // Public / internal routing (brute-force protected)

// Protected and Tenant-scoped routes
app.use('/api/progress', protect, tenantMiddleware, progressRoutes);
app.use('/api/chapters', protect, tenantMiddleware, chapterRoutes);
app.use('/api/school', protect, tenantMiddleware, schoolRoutes);
app.use('/api/teacher', protect, tenantMiddleware, teacherRoutes);
app.use('/api/student', protect, tenantMiddleware, studentRoutes);
app.use('/api/parent', protect, tenantMiddleware, parentRoutes);
app.use('/api/admin', protect, tenantMiddleware, adminRoutes);
app.use('/api/ranking', protect, tenantMiddleware, rankingRoutes);
app.use('/api/dashboard', dashboardRoutes); // protect + allowRoles applied inside the router
app.use('/api/notifications', notificationRoutes); // protect applied inside the router
app.use('/api/staffing', staffingRoutes); // protect applied inside the router
app.use('/api/announcements', announcementRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/reportcard', reportcardRoutes);
app.use('/api/import', importerRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/bus', busRoutes);

// Error Handling Middleware — log full detail server-side, never leak it to
// the client on a 500 in production.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status || 500;
    console.error('Server Error:', err.stack || err.message);
    const isProd = process.env.NODE_ENV === 'production';
    const message = (status < 500)
        ? (err.message || 'Request error')          // client errors: safe to show
        : (isProd ? 'Internal Server Error' : (err.message || 'Internal Server Error'));
    res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
