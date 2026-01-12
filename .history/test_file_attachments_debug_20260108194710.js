// Debug test for file attachments in discussions
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:5000/api';
const TEST_PROJECT_ID = '65a0f31ff31ff'; // Replace with actual project ID
const TEST_USER_TOKEN = 'your_admin_token_here'; // Replace with actual token

async function testFileAttachment() {
  try {
    console.log('Starting file attachment test...');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test_file.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for discussion attachment');
    
    // Create FormData
    const formData = new FormData();
    formData.append('content', 'Test discussion with file attachment');
    formData.append('system', 'false');
    formData.append('attachments', fs.createReadStream(testFilePath));
    
    console.log('FormData prepared with:');
    console.log('- Content: Test discussion with file attachment');
    console.log('- System: false');
    console.log('- Attachments: 1 file (test_file.txt)');
    
    // Send request
    const response = await axios.post(`${API_URL}/projects/${TEST_PROJECT_ID}/discussions`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      }
    });
    
    console.log('Success! Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Clean up
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
    console.error('Full error:', error);
  }
}

// Run the test
testFileAttachment();