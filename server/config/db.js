import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB. IMPORTANT: this no longer kills the process on failure.
// If the DB is unreachable, the HTTP server keeps running so the API can return
// a clean JSON 503 instead of dying (which made the frontend receive an empty
// body — the "Unexpected end of JSON input" error).
const connectDB = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/novora';

    // Log connection drops/errors without crashing.
    mongoose.connection.on('error', (e) => console.error('MongoDB error:', e.message));
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected — retrying…'));

    try {
        // Fail fast (10s) instead of hanging for the default 30s.
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error('────────────────────────────────────────────────────────');
        console.error('MongoDB connection FAILED:', error.message);
        if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
            console.error('Hint: DNS/SRV lookup failed. If your URI is "mongodb+srv://", your');
            console.error('      network may block SRV DNS. Fixes:');
            console.error('      1) Use the Atlas "standard" (non-srv) connection string, OR');
            console.error('      2) Set your machine DNS to 8.8.8.8 / 1.1.1.1, AND');
            console.error('      3) Whitelist your IP (or 0.0.0.0/0) in Atlas → Network Access.');
        }
        if (/authentication failed|bad auth/i.test(error.message)) {
            console.error('Hint: wrong DB username/password (URL-encode special characters).');
        }
        console.error('The server will keep running and return JSON 503 until the DB is reachable.');
        console.error('────────────────────────────────────────────────────────');
        return false;
    }
};

export default connectDB;
