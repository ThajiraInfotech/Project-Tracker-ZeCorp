const axios = require('axios');
const { app, server } = require('../server');
const mongoose = require('mongoose');
require('dotenv').config();

// Test configuration
const API_URL = 'http://localhost:5000/api';
let authToken = null;

// Test user credentials - only admin exists by default now
const testUsers = {
  admin: { username: 'admin', password: 'admin123' }
  // manager and staff users must be created by admin first
};

// Test results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility function to log test results
const logTest = (testName, success, error = null) => {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${testName}`);
    if (error) {
      console.log(`   Error: ${error.message || error}`);
      testResults.errors.push({ testName, error: error.message || error });
    }
  }
};

// Utility function to make authenticated requests
const makeAuthRequest = async (method, endpoint, data = null, role = 'admin') => {
  try {
    // Login first if no token
    if (!authToken) {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, testUsers[role]);
      authToken = loginResponse.data.token;
    }

    const config = {
      method: method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    return await axios(config);
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

// Test authentication
const testAuthentication = async () => {
  console.log('\n🔐 Testing Authentication...');

  try {
    // Test login with each role
    for (const [role, credentials] of Object.entries(testUsers)) {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        logTest(`${role} login`, response.data.success && response.data.token);
      } catch (error) {
        logTest(`${role} login`, false, error.response?.data?.message || error.message);
      }
    }

    // Test invalid login
    try {
      await axios.post(`${API_URL}/auth/login`, { username: 'invalid', password: 'wrong' });
      logTest('Invalid login rejection', false, 'Should have failed but succeeded');
    } catch (error) {
      logTest('Invalid login rejection', true);
    }

  } catch (error) {
    logTest('Authentication tests', false, error);
  }
};

// Test user management (admin only)
const testUserManagement = async () => {
  console.log('\n👥 Testing User Management...');

  try {
    // Get all users
    const usersResponse = await makeAuthRequest('get', '/auth/users', null, 'admin');
    logTest('Get all users', usersResponse.data.success && Array.isArray(usersResponse.data.users));

    // Get specific user
    const userResponse = await makeAuthRequest('get', '/auth/users/1', null, 'admin');
    logTest('Get specific user', userResponse.data.success);

  } catch (error) {
    logTest('User management tests', false, error);
  }
};

// Test project management
const testProjectManagement = async () => {
  console.log('\n🏗️ Testing Project Management...');

  try {
    // Get all projects
    const projectsResponse = await makeAuthRequest('get', '/projects');
    logTest('Get all projects', projectsResponse.data.success && Array.isArray(projectsResponse.data.projects));

    // Get specific project
    if (projectsResponse.data.projects && projectsResponse.data.projects.length > 0) {
      const projectId = projectsResponse.data.projects[0]._id;
      const projectResponse = await makeAuthRequest('get', `/projects/${projectId}`);
      logTest('Get specific project', projectResponse.data.success);
    }

    // Create a new project (manager role)
    const newProject = {
      projectName: 'Test Project',
      projectType: 'structural',
      description: 'Test project for functionality testing',
      clientName: 'Test Client',
      clientEmail: 'test@client.com',
      clientPhone: '9876543210',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      budget: 1000000,
      status: 'planning'
    };

    // Only test project creation if manager exists, otherwise skip
    try {
      const createResponse = await makeAuthRequest('post', '/projects', newProject, 'admin');
      logTest('Create new project', createResponse.data.success);
    } catch (error) {
      logTest('Create new project', false, 'Manager user not available');
    }

  } catch (error) {
    logTest('Project management tests', false, error);
  }
};

// Test task management
const testTaskManagement = async () => {
  console.log('\n📋 Testing Task Management...');

  try {
    // Get all tasks
    const tasksResponse = await makeAuthRequest('get', '/tasks');
    logTest('Get all tasks', tasksResponse.data.success && Array.isArray(tasksResponse.data.tasks));

    // Get tasks by status
    const statusResponse = await makeAuthRequest('get', '/tasks?status=todo');
    logTest('Get tasks by status', statusResponse.data.success);

    // Get tasks by project (if projects exist)
    const projectsResponse = await makeAuthRequest('get', '/projects');
    if (projectsResponse.data.projects && projectsResponse.data.projects.length > 0) {
      const projectId = projectsResponse.data.projects[0]._id;
      const projectTasksResponse = await makeAuthRequest('get', `/tasks?project=${projectId}`);
      logTest('Get tasks by project', projectTasksResponse.data.success);
    }

  } catch (error) {
    logTest('Task management tests', false, error);
  }
};

// Test attendance management
const testAttendanceManagement = async () => {
  console.log('\n📅 Testing Attendance Management...');

  try {
    // Get all attendance records
    const attendanceResponse = await makeAuthRequest('get', '/attendance');
    logTest('Get all attendance', attendanceResponse.data.success);

    // Get attendance by user
    const userAttendanceResponse = await makeAuthRequest('get', '/attendance?user=staff1');
    logTest('Get attendance by user', userAttendanceResponse.data.success);

  } catch (error) {
    logTest('Attendance management tests', false, error);
  }
};

// Test report generation
const testReportGeneration = async () => {
  console.log('\n📊 Testing Report Generation...');

  try {
    // Get project reports
    const projectReportResponse = await makeAuthRequest('get', '/reports/projects');
    logTest('Get project reports', projectReportResponse.data.success);

    // Get task reports
    const taskReportResponse = await makeAuthRequest('get', '/reports/tasks');
    logTest('Get task reports', taskReportResponse.data.success);

    // Get attendance reports
    const attendanceReportResponse = await makeAuthRequest('get', '/reports/attendance');
    logTest('Get attendance reports', attendanceReportResponse.data.success);

  } catch (error) {
    logTest('Report generation tests', false, error);
  }
};

// Test file management
const testFileManagement = async () => {
  console.log('\n📁 Testing File Management...');

  try {
    // Upload a test file
    const fileData = {
      name: 'test-file.txt',
      type: 'text/plain',
      size: 1024,
      url: 'https://example.com/test-file.txt',
      project: 'test-project-id'
    };

    const uploadResponse = await makeAuthRequest('post', '/files/upload', fileData);
    logTest('Upload file', uploadResponse.data.success);

  } catch (error) {
    logTest('File management tests', false, error);
  }
};

// Main test function
const runAllTests = async () => {
  console.log('🧪 Starting Comprehensive Functionality Tests...');
  console.log('==============================================');

  try {
    // Run all test suites
    await testAuthentication();
    await testUserManagement();
    await testProjectManagement();
    await testTaskManagement();
    await testAttendanceManagement();
    await testReportGeneration();
    await testFileManagement();

    // Print summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach(({ testName, error }) => {
        console.log(`   - ${testName}: ${error}`);
      });
    }

    // Close server and database
    server.close();
    await mongoose.disconnect();

    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Start tests
runAllTests();