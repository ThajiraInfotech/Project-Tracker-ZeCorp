const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testApiEndpoints = async () => {
  try {
    console.log('Testing API endpoints...\n');

    // Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ Login successful');
    const token = loginResponse.data.token;

    // Test get projects
    console.log('2. Testing get projects...');
    const projectsResponse = await axios.get(`${API_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Projects fetched: ${projectsResponse.data.projects.length}`);

    // Test get tasks
    console.log('3. Testing get tasks...');
    const tasksResponse = await axios.get(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Tasks fetched: ${tasksResponse.data.tasks.length}`);

    console.log('\n🎉 All API endpoints are working correctly!');
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
};

testApiEndpoints();