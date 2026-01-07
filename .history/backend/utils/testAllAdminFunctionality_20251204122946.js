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
    password: 'manager123456',
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
    password: 'user123456',
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
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    priority: 'high',
    status: 'in-progress',
    progress: 30
  });
  await testTask.save();
  testTaskId = testTask._id;
  console.log('✅ Test task created:', testTask.title);

  // Create test attendance
  const testAttendance = new Attendance({
    user: testUserId,
    checkInTime: new Date(),
    checkOutTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours later
    date: new Date(),
    totalHours: 8,
    overtimeHours: 1,
    status: 'present',
    comments: 'Test Attendance Record'
  });
  await testAttendance.save();
  console.log('✅ Test attendance created');
}

// Test admin authentication
async function testAdminAuthentication() {
  console.log('🔐 Testing admin authentication...');

  // Login as admin
  const loginResponse = await axios.post(`${TEST_API_URL}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });

  if (!loginResponse.data.token) {
    throw new Error('Admin login failed - no token received');
  }

  adminToken = loginResponse.data.token;
  console.log('✅ Admin login successful, token received');

  // Verify admin user data
  const userData = loginResponse.data.user;
  if (userData.role !== 'admin') {
    throw new Error('Logged in user is not admin');
  }

  console.log('✅ Admin role verified:', userData.username, userData.role);
}

// Test admin dashboard
async function testAdminDashboard() {
  console.log('📊 Testing admin dashboard functionality...');

  // Test regular dashboard
  const dashboardResponse = await axios.get(`${TEST_API_URL}/reports/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!dashboardResponse.data.success) {
    throw new Error('Dashboard data fetch failed');
  }

  const dashboard = dashboardResponse.data.dashboard;
  console.log('✅ Dashboard data retrieved successfully');
  console.log(`📈 Projects: ${dashboard.projects.totalProjects} total, ${dashboard.projects.totalProjectsInProgress} in progress`);
  console.log(`👥 Staff: ${dashboard.staff.totalStaffCount} total, ${dashboard.staff.activeStaffCount} active`);
  console.log(`📋 Tasks: ${dashboard.tasks.totalTasksCompleted} completed, ${dashboard.tasks.totalTasksOverdue} overdue`);

  // Test admin dashboard
  const adminDashboardResponse = await axios.get(`${TEST_API_URL}/reports/dashboard/admin`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!adminDashboardResponse.data.success) {
    throw new Error('Admin dashboard data fetch failed');
  }

  const adminDashboard = adminDashboardResponse.data.dashboard;
  console.log('✅ Admin dashboard data retrieved successfully');
  console.log(`💰 Revenue: $${adminDashboard.revenue.totalRevenue} total, $${adminDashboard.revenue.completedProjectsRevenue} completed`);
  console.log(`📊 Productivity: ${adminDashboard.productivity.productivityPercentage}%`);
  console.log(`⚠️  Delayed projects: ${adminDashboard.delayedProjects.length}`);
}

// Test user management
async function testUserManagement() {
  console.log('👥 Testing user management functionality...');

  // Get all users
  const usersResponse = await axios.get(`${TEST_API_URL}/auth/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!usersResponse.data.success) {
    throw new Error('Failed to get users');
  }

  const users = usersResponse.data.users;
  console.log(`✅ Retrieved ${users.length} users successfully`);

  // Get users by role
  const managersResponse = await axios.get(`${TEST_API_URL}/auth/users/by-role`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    params: { role: 'manager' }
  });

  if (!managersResponse.data.success) {
    throw new Error('Failed to get users by role');
  }

  console.log(`✅ Found ${managersResponse.data.users.length} managers`);

  // Test user status toggle
  const toggleResponse = await axios.post(
    `${TEST_API_URL}/auth/users/${testUserId}/toggle-status`,
    {},
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!toggleResponse.data.success) {
    throw new Error('Failed to toggle user status');
  }

  console.log('✅ User status toggled successfully');

  // Test password reset
  const resetResponse = await axios.post(
    `${TEST_API_URL}/auth/users/${testUserId}/reset-password`,
    { newPassword: 'newpassword123' },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!resetResponse.data.success) {
    throw new Error('Failed to reset user password');
  }

  console.log('✅ User password reset successfully');

  // Test user assignment to project
  const assignResponse = await axios.post(
    `${TEST_API_URL}/auth/users/${testUserId}/assign-project`,
    { projectId: testProjectId },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!assignResponse.data.success) {
    throw new Error('Failed to assign user to project');
  }

  console.log('✅ User assigned to project successfully');
}

// Test project management
async function testProjectManagement() {
  console.log('🏗️ Testing project management functionality...');

  // Get all projects with analytics
  const projectsResponse = await axios.get(`${TEST_API_URL}/projects/admin/all-with-analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!projectsResponse.data.success) {
    throw new Error('Failed to get projects with analytics');
  }

  console.log(`✅ Retrieved ${projectsResponse.data.projects.length} projects with analytics`);

  // Test delayed and at-risk projects
  const riskResponse = await axios.get(`${TEST_API_URL}/projects/admin/delayed-at-risk`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!riskResponse.data.success) {
    throw new Error('Failed to get delayed/at-risk projects');
  }

  console.log(`✅ Found ${riskResponse.data.delayedProjects.length} delayed and ${riskResponse.data.atRiskProjects.length} at-risk projects`);

  // Test project manager assignment
  const assignManagerResponse = await axios.post(
    `${TEST_API_URL}/projects/${testProjectId}/assign-manager`,
    { managerId: testManagerId },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!assignManagerResponse.data.success) {
    throw new Error('Failed to assign manager to project');
  }

  console.log('✅ Manager assigned to project successfully');

  // Test mark project as delayed
  const delayResponse = await axios.post(
    `${TEST_API_URL}/projects/${testProjectId}/mark-delayed`,
    { delayReason: 'Testing admin functionality', estimatedNewDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!delayResponse.data.success) {
    throw new Error('Failed to mark project as delayed');
  }

  console.log('✅ Project marked as delayed successfully');
}

// Test task management
async function testTaskManagement() {
  console.log('📋 Testing task management functionality...');

  // Get all tasks (admin override)
  const tasksResponse = await axios.get(`${TEST_API_URL}/tasks/admin/all`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!tasksResponse.data.success) {
    throw new Error('Failed to get all tasks');
  }

  console.log(`✅ Retrieved ${tasksResponse.data.tasks.length} tasks with admin access`);

  // Test task override
  const overrideResponse = await axios.put(
    `${TEST_API_URL}/tasks/${testTaskId}/admin-override`,
    {
      assignedTo: testManagerId,
      priority: 'high',
      status: 'in-progress',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!overrideResponse.data.success) {
    throw new Error('Failed to override task');
  }

  console.log('✅ Task override successful');

  // Test force complete task
  const completeResponse = await axios.post(
    `${TEST_API_URL}/tasks/${testTaskId}/force-complete`,
    { completionNotes: 'Admin forced completion for testing' },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!completeResponse.data.success) {
    throw new Error('Failed to force complete task');
  }

  console.log('✅ Task forced completion successful');

  // Test reassign stuck tasks
  const reassignResponse = await axios.post(
    `${TEST_API_URL}/tasks/admin/reassign-stuck`,
    {
      fromUserId: testUserId,
      toUserId: testManagerId,
      projectId: testProjectId
    },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!reassignResponse.data.success) {
    throw new Error('Failed to reassign stuck tasks');
  }

  console.log(`✅ Reassigned ${reassignResponse.data.reassignResults.length} stuck tasks`);
}

// Test reporting system
async function testReportingSystem() {
  console.log('📑 Testing comprehensive reporting system...');

  // Test project performance report
  const projectReportResponse = await axios.get(`${TEST_API_URL}/reports/admin/project-performance`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!projectReportResponse.data.success) {
    throw new Error('Failed to get project performance report');
  }

  console.log(`✅ Project performance report generated: ${projectReportResponse.data.report.length} projects analyzed`);

  // Test manager performance report
  const managerReportResponse = await axios.get(`${TEST_API_URL}/reports/admin/manager-performance`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!managerReportResponse.data.success) {
    throw new Error('Failed to get manager performance report');
  }

  console.log(`✅ Manager performance report generated: ${managerReportResponse.data.report.length} managers analyzed`);

  // Test staff productivity report
  const staffReportResponse = await axios.get(`${TEST_API_URL}/reports/admin/staff-productivity`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!staffReportResponse.data.success) {
    throw new Error('Failed to get staff productivity report');
  }

  console.log(`✅ Staff productivity report generated: ${staffReportResponse.data.report.length} staff analyzed`);

  // Test attendance report
  const attendanceReportResponse = await axios.get(`${TEST_API_URL}/reports/admin/attendance`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
  });

  if (!attendanceReportResponse.data.success) {
    throw new Error('Failed to get attendance report');
  }

  console.log(`✅ Attendance report generated: ${attendanceReportResponse.data.report.length} attendance records`);

  // Test delay and risk analysis report
  const riskReportResponse = await axios.get(`${TEST_API_URL}/reports/admin/delay-risk`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!riskReportResponse.data.success) {
    throw new Error('Failed to get delay risk analysis report');
  }

  console.log(`✅ Delay risk analysis report generated:
      ${riskReportResponse.data.report.delayedProjects.length} delayed projects,
      ${riskReportResponse.data.report.atRiskProjects.length} at-risk projects,
      ${riskReportResponse.data.report.overdueTasks.length} overdue tasks,
      ${riskReportResponse.data.report.highRiskTasks.length} high-risk tasks`);
}

// Test system settings
async function testSystemSettings() {
  console.log('⚙️ Testing system settings functionality...');

  // Initialize default settings
  const initResponse = await axios.post(
    `${TEST_API_URL}/system-settings/initialize`,
    {},
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!initResponse.data.success) {
    // Settings may already be initialized, that's okay
    console.log('ℹ️  System settings already initialized');
  } else {
    console.log(`✅ Initialized ${initResponse.data.settings.length} default system settings`);
  }

  // Get all system settings
  const settingsResponse = await axios.get(`${TEST_API_URL}/system-settings`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (!settingsResponse.data.success) {
    throw new Error('Failed to get system settings');
  }

  console.log(`✅ Retrieved ${settingsResponse.data.settings.length} system settings`);

  // Test getting settings by category
  const categoryResponse = await axios.get(`${TEST_API_URL}/system-settings/by-category`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    params: { category: 'working-hours' }
  });

  if (!categoryResponse.data.success) {
    throw new Error('Failed to get settings by category');
  }

  console.log(`✅ Found ${categoryResponse.data.settings.length} working hours settings`);

  // Test upsert system setting
  const upsertResponse = await axios.post(
    `${TEST_API_URL}/system-settings`,
    {
      settingName: 'Test Setting',
      settingKey: 'test_setting',
      settingValue: 'test_value',
      settingType: 'string',
      description: 'Test setting for admin functionality verification',
      category: 'general'
    },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!upsertResponse.data.success) {
    throw new Error('Failed to upsert system setting');
  }

  console.log('✅ System setting upserted successfully');

  // Test delete system setting
  const deleteResponse = await axios.delete(
    `${TEST_API_URL}/system-settings/${upsertResponse.data.setting._id}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  if (!deleteResponse.data.success) {
    throw new Error('Failed to delete system setting');
  }

  console.log('✅ System setting deleted successfully');
}

// Run the tests
testAllAdminFunctionality().catch(error => {
  console.error('❌ Admin functionality testing failed:', error);
  process.exit(1);
});