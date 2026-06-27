import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import User from './models/User.js';

dotenv.config();

const seedSuperAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@novora.com';
        const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';
        const adminName = 'Super Administrator';

        // Check if admin already exists
        const adminExists = await User.findOne({ email: adminEmail.toLowerCase(), role: 'super_admin' });
        if (adminExists) {
            console.log('Super Admin already exists:', adminEmail);
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Create Super Admin
        const superAdmin = await User.create({
            schoolId: null, // Super admins are not scoped to any school
            name: adminName,
            email: adminEmail.toLowerCase(),
            password: hashedPassword,
            role: 'super_admin'
        });

        console.log('====================================');
        console.log('Super Admin created successfully!');
        console.log('Email:', superAdmin.email);
        console.log('Password:', adminPassword);
        console.log('====================================');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding Super Admin:', error.message);
        process.exit(1);
    }
};

seedSuperAdmin();
