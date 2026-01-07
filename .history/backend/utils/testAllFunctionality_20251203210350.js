
const axios = require('axios');
const { app, server } = require('../server');
const mongoose = require('mongoose');
require('dotenv').config();

// Test configuration
const API_URL = 'http://localhost:5000/api';
let authToken = null;

// Test user credentials
const testUsers = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager', password: 'manager123' },
  staff: { username: 'staff1', password: 'staff123' }
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
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      logTest(`${role} login`, response.data.success && response.data.token);
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
