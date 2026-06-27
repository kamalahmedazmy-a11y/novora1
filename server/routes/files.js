import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Attachment from '../models/Attachment.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure the uploads directory exists at module load.
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Sanitize the original filename to a safe, predictable stored name.
const sanitize = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + sanitize(file.originalname)),
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const schoolOf = (req) => req.user.schoolId || req.body.schoolId;

router.use(protect);

// POST /api/files/upload — multipart/form-data with field `file`; optional body { context, refId }
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const schoolId = schoolOf(req);
        const att = await Attachment.create({
            schoolId,
            uploaderId: req.user._id,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            context: req.body.context || 'general',
            refId: req.body.refId || '',
        });
        res.status(201).json({
            _id: att._id,
            originalName: att.originalName,
            mimeType: att.mimeType,
            size: att.size,
            url: '/api/files/' + att._id + '/download',
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/files/:id/download — download the stored file (school-scoped)
router.get('/:id/download', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const att = await Attachment.findOne({ _id: req.params.id, schoolId });
        if (!att) return res.status(404).json({ message: 'Not found' });
        res.download(path.join(process.cwd(), 'server', 'uploads', att.filename), att.originalName);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/files — list attachments for the school (optional ?context=&refId=), newest first
router.get('/', async (req, res) => {
    try {
        const schoolId = schoolOf(req);
        const query = { schoolId };
        if (req.query.context) query.context = req.query.context;
        if (req.query.refId) query.refId = req.query.refId;
        const list = await Attachment.find(query).sort({ createdAt: -1 }).limit(100).lean();
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

export default router;
