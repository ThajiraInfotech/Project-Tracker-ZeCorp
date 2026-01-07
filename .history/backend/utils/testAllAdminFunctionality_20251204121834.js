
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

