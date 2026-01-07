
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

// Create users with different roles
const createUsers = async () => {
  try {
    console.log('👤 Creating users...');

    const users = [
      {
        username: 'admin',
        email: 'admin@thajira.com',
        password: 'admin123',
        fullName: 'Admin User',
        role: 'admin',
        phone: '9876543210',
        department: 'management'
      },
      {
        username: 'manager',
        email: 'manager@thajira.com',
        password: 'manager123',
        fullName: 'Project Manager',
        role: 'manager',
        phone: '9876543211',
        department: 'management'
      },
      {
        username: 'staff1',
        email: 'staff1@thajira.com',
        password: 'staff123',
