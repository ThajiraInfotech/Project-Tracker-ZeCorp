const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');

// Load environment variables
dotenv.config();

const clearDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all tasks
    const deletedTasks = await Task.deleteMany({});
    console.log(`✅ Deleted ${deletedTasks.deletedCount} tasks`);

    // Delete all projects
    const deletedProjects = await Project.deleteMany({});
    console.log(`✅ Deleted ${deletedProjects.deletedCount} projects`);

    // Delete all attendance records
    const deletedAttendance = await Attendance.deleteMany({});
    console.log(`✅ Deleted ${deletedAttendance.deletedCount} attendance records`);

    // Delete all users except admin
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} non-admin users`);

    // Check if admin user exists, if not, create it
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@thajira.com',
        password: 'admin123',
        fullName: 'Admin User',
        role: 'admin',
        phone: '1234567890',
        department: 'management',
        isActive: true
      });
      await adminUser.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    console.log('🎉 Database cleared successfully! Only admin user remains.');

  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit();
  }
};

// Run the clear script
clearDatabase();