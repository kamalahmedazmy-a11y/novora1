import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkChapters = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const chapters = await mongoose.connection.db.collection('chapters').find().toArray();
        console.log(`Found ${chapters.length} chapters.`);
        if (chapters.length > 0) {
            console.log('First chapter:', JSON.stringify(chapters[0], null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkChapters();
