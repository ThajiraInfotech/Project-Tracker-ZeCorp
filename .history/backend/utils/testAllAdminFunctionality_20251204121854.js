
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const SystemSetting = require('../models/SystemSetting');

// Test configuration
const TEST_API_URL = 'http://localhost:5000/api';
let adminToken = null;
let testUserId = null;
let testManagerId = null;
let testProjectId = null;
let testTaskId = null;

// Main test function
async function testAllAdminFunctionality() {
  try {
    console.log('🚀 Starting comprehensive admin functionality testing...');

    // Connect to database
    await connectToDatabase();

    // Clean up existing test data
    await cleanupTestData();

    // Create test data
    await createTestData();

    // Run all tests
    await testAdminAuthentication();
    await testAdminDashboard();
    await testUserManagement();
    await testProjectManagement();
    await testTaskManagement();
    await testReportingSystem();
    await testSystemSettings();

    console.log('🎉 All admin functionality tests completed successfully!');
    console.log('✅ Admin dashboard has full control over the application');
    console.log('✅ All required features are working as expected');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Clean up test data
    await cleanupTestData();
    mongoose.connection.close();
  }
}

// Database connection
async function connectToDatabase() {
  console.log('🔌 Connecting to database...');
  await mongoose.connect('mongodb+srv://arshadhahamed777_db_user:a.r.s.h.a.d.h.7@cluster0.u92ttx1.mongodb.net/?appName=Cluster0');
  console.log('✅ Database connected successfully');
}

// Clean up test data
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  // Delete test users (but keep admin)
  await User.deleteMany({
    username: { $in: ['testuser', 'testmanager'] }
  });

  // Delete test projects
  await Project.deleteMany({
    projectName: { $regex: /^Test Project/, $options: 'i' }
  });

  // Delete test tasks
  await Task.deleteMany({
    title: { $regex: /^Test Task/, $options: 'i' }
  });

  // Delete test attendance records
  await Attendance.deleteMany({
    comments: { $regex: /^Test Attendance/, $options: 'i' }
  });

  console.log('✅ Test data cleaned up');
}

// Create test data
async function createTestData() {
  console.log('📦 Creating test data...');

  // Create test manager
  const testManager = new User({
    username: 'testmanager',
    email: 'manager@test.com',
    password: 'manager123',
    fullName: 'Test Manager',
    role: 'manager',
    department: 'management',
    isActive: true
  });
  await testManager.save();
  testManagerId = testManager._id;
  console.log('✅ Test manager created:', testManager.username);

  // Create test user
  const testUser = new User({
    username: 'testuser',
    email: 'user@test.com',
    password: 'user123',
    fullName: 'Test User',
    role: 'staff',
    department: 'construction',
    isActive: true
  });
  await testUser.save();
  testUserId = testUser._id;
  console.log('✅ Test user created:', testUser.username);

  // Create test project
  const testProject = new Project({
    projectName: 'Test Project for Admin Testing',
    projectType: 'villa-renovation',
    description: 'Test project to verify admin functionality',
    clientName: 'Test Client',
    clientEmail: 'client@test.com',
    clientPhone: '1234567890',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'in-progress',
    budget: 50000,
    location: 'Test Location',
    manager: testManagerId,
    teamMembers: [testUserId],
    createdBy: testManagerId,
    progress: 50
  });
  await testProject.save();
  testProjectId = testProject._id;
  console.log('✅ Test project created:', testProject.projectName);

  // Create test task
  const testTask = new Task({
    title: 'Test Task for Admin Testing',
    description: 'Test task to verify admin override functionality',
    project: testProjectId,
    assignedTo: testUserId,
    createdBy: testManagerId,
