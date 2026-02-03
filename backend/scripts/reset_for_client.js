const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Expense = require('../models/Expense');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const resetData = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database.');

        console.log('\n--- STARTED DATA RESET ---');

        // 1. Delete all Tasks
        const tasksResult = await Task.deleteMany({});
        console.log(`Deleted ${tasksResult.deletedCount} Tasks.`);

        // 2. Delete all Projects
        const projectsResult = await Project.deleteMany({});
        console.log(`Deleted ${projectsResult.deletedCount} Projects.`);

        // 3. Delete all Notifications
        const notifResult = await Notification.deleteMany({});
        console.log(`Deleted ${notifResult.deletedCount} Notifications.`);

        // 4. Delete all Attendance (User requested this)
        const attendanceResult = await Attendance.deleteMany({});
        console.log(`Deleted ${attendanceResult.deletedCount} Attendance records.`);

        // 5. Delete all Expenses
        const expenseResult = await Expense.deleteMany({});
        console.log(`Deleted ${expenseResult.deletedCount} Expenses.`);

        // 6. Delete NON-ADMIN Users
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount === 0) {
            console.warn('WARNING: No admins found! Aborting user deletion to prevent lockout.');
        } else {
            const usersResult = await User.deleteMany({ role: { $ne: 'admin' } });
            console.log(`Deleted ${usersResult.deletedCount} Users (kept ${adminCount} admins).`);
        }

        console.log('--- COMPLETED DATA RESET ---');
        console.log('Ready for client handover.');

        process.exit(0);
    } catch (error) {
        console.error('Error during reset:', error);
        process.exit(1);
    }
};

resetData();
