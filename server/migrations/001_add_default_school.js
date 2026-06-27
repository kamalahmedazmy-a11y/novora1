import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import School from '../models/School.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Progress from '../models/Progress.js';

dotenv.config();

const runMigration = async () => {
    try {
        await connectDB();

        console.log('Starting data migration...');

        // 1. Create or Find default School
        let defaultSchool = await School.findOne({ subdomain: 'novora' });
        if (!defaultSchool) {
            defaultSchool = await School.create({
                name: 'Novora Academy',
                subdomain: 'novora',
                subscriptionPlan: 'enterprise'
            });
            console.log('Created default School: Novora Academy');
        }

        // 2. Assign schoolId to all users without it (except super_admins)
        const userUpdateResult = await User.updateMany(
            { schoolId: null, role: { $ne: 'super_admin' } },
            { $set: { schoolId: defaultSchool._id } }
        );
        console.log(`Assigned schoolId to ${userUpdateResult.modifiedCount} users`);

        // 3. Create or Find default Subject
        let defaultSubject = await Subject.findOne({ schoolId: defaultSchool._id, title: 'Theory of Computation' });
        if (!defaultSubject) {
            defaultSubject = await Subject.create({
                schoolId: defaultSchool._id,
                title: 'Theory of Computation',
                description: 'Introduction to DFAs, NFAs, Turing Machines, and computability theory.'
            });
            console.log('Created default Subject: Theory of Computation');
        }

        // 4. Update all Chapters to belong to this Subject
        const chapterUpdateResult = await Chapter.updateMany(
            { subjectId: null },
            { $set: { subjectId: defaultSubject._id } }
        );
        console.log(`Assigned subjectId to ${chapterUpdateResult.modifiedCount} chapters`);

        // 5. Update all Progress documents
        // Since we modified the Progress schema to be per-chapter/user, if there are old progress docs in completedChapters format,
        // we can convert them to multiple individual progress docs!
        const oldProgressDocs = await Progress.find({ completedChapters: { $exists: true } });
        console.log(`Found ${oldProgressDocs.length} old progress documents to migrate.`);

        for (const oldDoc of oldProgressDocs) {
            const userId = oldDoc.user || oldDoc.userId;
            if (!userId) continue;

            // Fetch the completed chapters
            const completedChaps = oldDoc.completedChapters || [];
            
            // For each completed chapter, check if a new progress doc exists
            for (const chapNum of completedChaps) {
                const chapterDoc = await Chapter.findOne({ id: chapNum, subjectId: defaultSubject._id });
                if (!chapterDoc) continue;

                // Create individual Progress record
                await Progress.findOneAndUpdate(
                    { userId, chapterId: chapterDoc._id },
                    {
                        schoolId: defaultSchool._id,
                        userId,
                        chapterId: chapterDoc._id,
                        classroomId: new mongoose.Types.ObjectId(), // placeholder classroomId
                        completionPercent: 100,
                        xp: 150
                    },
                    { upsert: true, new: true }
                );
            }

            // Remove the old completedChapters fields
            await Progress.deleteOne({ _id: oldDoc._id });
        }

        console.log('Data migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
};

runMigration();
