const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Attendance.deleteMany({});
    console.log('✅ Data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
};

// Create only the essential admin user
const createUsers = async () => {
  try {
    console.log('👤 Creating essential admin user...');

    const users = [
      {
        username: 'admin',
        email: 'admin@thajira.com',
        password: 'admin123',
        fullName: 'Admin User',
        role: 'admin',
        phone: '9876543210',
        department: 'management'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      // Let the User model handle password hashing via pre-save hook
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.username} (${user.role})`);
    }

    return createdUsers;
  } catch (error) {
    console.error('❌ Error creating users:', error);
    return [];
  }
};

// Create projects - now empty since we only want admin-added projects
const createProjects = async (users) => {
  try {
    console.log('🏗️ Skipping dummy project creation - only admin-added projects will be created');
    return [];
  } catch (error) {
    console.error('❌ Error in project creation:', error);
    return [];
  }
};

// Create tasks - now empty since we only want admin-added tasks
const createTasks = async (users, projects) => {
  try {
    console.log('📋 Skipping dummy task creation - only admin-added tasks will be created');
    return [];
  } catch (error) {
    console.error('❌ Error in task creation:', error);
    return [];
  }
};

// Create attendance records - now empty since we only want real attendance data
const createAttendance = async (users) => {
  try {
    console.log('📅 Skipping dummy attendance creation - only real attendance records will be created');
    return [];
  } catch (error) {
    console.error('❌ Error in attendance creation:', error);
    return [];
  }
};

// Main function
const main = async () => {
  await connectDB();
  await clearData();

  console.log('\n🌱 Seeding database with minimal essential data...\n');

  const users = await createUsers();
  const projects = await createProjects(users);
  const tasks = await createTasks(users, projects);
  await createAttendance(users);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - Users: ${users.length} (only admin user created)`);
  console.log(`   - Projects: ${projects.length} (no dummy projects)`);
  console.log(`   - Tasks: ${tasks.length} (no dummy tasks)`);
  console.log(`   - Attendance Records: 0 (no dummy attendance)`);

  console.log('\n🔑 Admin Credentials:');
  console.log('   - Admin: admin/admin123');

  console.log('\n⚠️  All other data (managers, staff, projects, tasks, attendance) must be added by admin through the application interface.');

  process.exit(0);
};

main();