const axios = require('axios');

async function test() {
  try {
    // We need an auth token first. Let's just login as admin.
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@thajira.com',
      password: 'admin' // assuming default
    });
    
    const token = loginRes.data.token;
    
    // Get tasks
    const tasksRes = await axios.get('http://localhost:5000/api/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (tasksRes.data.tasks.length === 0) {
      console.log('No tasks found');
      return;
    }
    
    const taskId = tasksRes.data.tasks[0]._id;
    console.log(`Commenting on task ${taskId}`);
    
    // Add comment
    const commentRes = await axios.post(`http://localhost:5000/api/tasks/${taskId}/comments`, {
      text: 'Test comment without mention'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Comment added:', commentRes.data.success);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
