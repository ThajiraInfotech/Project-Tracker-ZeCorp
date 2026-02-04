const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import Models
const Task = require('../models/Task');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const User = require('../models/User');

const cleanUploads = () => {
    // Correct usage of path for cross-platform compatibility
    const uploadsDir = path.join(__dirname, '../uploads');

    if (fs.existsSync(uploadsDir)) {
        console.log(`📂 Checking uploads directory: ${uploadsDir}`);
        const files = fs.readdirSync(uploadsDir);
        let deletedCount = 0;

        for (const file of files) {
            // Skip system files
            if (file === '.gitkeep' || file === 'README.md' || file.startsWith('.')) continue;

            try {
                fs.unlinkSync(path.join(uploadsDir, file));
                deletedCount++;
            } catch (err) {
                console.error(`❌ Failed to delete file ${file}:`, err.message);
            }
        }
        console.log(`🗑️  Cleaned ${deletedCount} files from uploads directory.`);
    } else {
        console.log('⚠️  Uploads directory not found. Skipping file cleanup.');
    }
};

const resetData = async () => {
    try {
        console.log('--- SYSTEM RESET & HANDOVER PREPARATION ---');

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined. Ensure .env file exists and is readable.');
        }

        console.log('🔌 Connecting to Database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ Connected to Database: ${mongoose.connection.name}`);

        console.log('🧹 Clearing specific data tables...');

        // 1. Clear Transactional Data
        await Promise.all([
            Task.deleteMany({}),
            Project.deleteMany({}),
            Attendance.deleteMany({}),
            Expense.deleteMany({}),
            Notification.deleteMany({})
        ]);

        console.log('✅ Transactional data (Tasks, Projects, Attendance, Expenses, Notifications) cleared.');

        // 2. Clear Users (Except Admin)
        const admins = await User.countDocuments({ role: 'admin' });
        if (admins === 0) {
            console.warn('⚠️  CRITICAL WARNING: No Admin users found! Skipping User deletion to prevent lockout.');
        } else {
            const users = await User.deleteMany({ role: { $ne: 'admin' } }); // Delete everyone who is NOT 'admin'
            console.log(`✅ User Cleanup: Deleted ${users.deletedCount} users. Preserved ${admins} Admin(s).`);
        }

        // 3. Clean Uploads
        console.log('🧹 Cleaning local file storage...');
        cleanUploads();

        console.log('\n🎉 SUCCESS: System is reset and ready for client handover.');
        console.log('ℹ️  Admins and System Settings have been preserved.');

    } catch (error) {
        console.error('❌ FATAL ERROR during reset:', error);
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('👋 Database connection closed.');
        }
        process.exit(0);
    }
};

// Run
resetData();
