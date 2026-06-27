import mongoose from 'mongoose';

// A school calendar entry (holiday, exam, event, meeting) optionally targeted to an audience.
const calendarEventSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },
    type: { type: String, enum: ['holiday', 'exam', 'event', 'meeting'], default: 'event' },
    audience: { type: String, enum: ['all', 'teachers', 'parents', 'students'], default: 'all' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

calendarEventSchema.index({ schoolId: 1, date: 1 });

export default mongoose.model('CalendarEvent', calendarEventSchema);
