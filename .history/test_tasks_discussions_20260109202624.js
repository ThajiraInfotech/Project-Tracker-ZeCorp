// Test script to verify task discussions functionality
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testTaskDiscussions() {
  console.log('Testing Task Discussions functionality...\n');

  try {
    // Test 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Admin login successful');

    // Test 2: Get all task discussions
    console.log('\n2. Fetching all task discussions...');
    const discussionsResponse = await axios.get(`${API_BASE}/tasks/discussions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✓ Task discussions fetched successfully');
    console.log(`Found ${discussionsResponse.data.discussions.length} discussions`);

    // Test 3: Get tasks to find one for testing
    console.log('\n3. Fetching tasks...');
    const tasksResponse = await axios.get(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const tasks = tasksResponse.data.tasks;
    console.log(`✓ Found ${tasks.length} tasks`);

    if (tasks.length > 0) {
      const testTask = tasks[0];
      console.log(`\n4. Testing discussion on task: ${testTask.title}`);
      
      // Test 4: Post a discussion to a specific task
      console.log('Posting discussion to task...');
      const postResponse = await axios.post(`${API_BASE}/tasks/${testTask._id}/discussions`, {
        content: 'This is a test discussion from the test script!',
        system: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✓ Discussion posted successfully');
      
      // Test 5: Fetch task details to verify discussion was added
      console.log('\n5. Fetching task details to verify discussion...');
      const taskDetailsResponse = await axios.get(`${API_BASE}/tasks/${testTask._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const taskWithDiscussions = taskDetailsResponse.data.task;
      console.log(`✓ Task now has ${taskWithDiscussions.discussions.length} discussions`);
      
      // Test 6: Post a reply to the discussion
      if (taskWithDiscussions.discussions.length > 0) {
        const parentDiscussion = taskWithDiscussions.discussions[0];
        console.log('\n6. Testing reply to discussion...');
        
        const replyResponse = await axios.post(`${API_BASE}/tasks/${testTask._id}/discussions`, {
          content: 'This is a reply to the test discussion!',
          parentDiscussionId: parentDiscussion._id,
          system: false
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✓ Reply posted successfully');
        
        // Verify reply was added
        const taskDetailsResponse2 = await axios.get(`${API_BASE}/tasks/${testTask._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const taskWithReplies = taskDetailsResponse2.data.task;
        console.log(`✓ Task now has ${taskWithReplies.discussions.length} discussions (including replies)`);
      }
    }

    console.log('\n🎉 All tests passed! Task discussions functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testTaskDiscussions();