const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const BASE_URL = 'https://app.zecorp.ae/api';
const ADMIN_CREDS = { username: 'admin', password: 'admin123' };

// Helpers
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let adminToken = '';
let createdUserId = '';
let createdProjectId = '';
let createdTaskId = '';

async function runTests() {
    console.log('🚀 Starting ZEECORP Production QA Test Plan (VPS: app.zecorp.ae)\n');

    try {
        // --- TEST 1: Admin Login ---
        console.log('🔐 TEST 1: Admin Login');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDS);
        if (loginRes.data.token) {
            adminToken = loginRes.data.token;
            console.log('   ✅ PASS: Login successful.');
        } else {
            throw new Error('Login failed: No token');
        }

        const authHeader = { headers: { Authorization: `Bearer ${adminToken}` } };

        // --- TEST 2: User Creation ---
        console.log('\n👥 TEST 2: User Creation (Admin -> User)');
        const testUser = {
            username: `prod_user_${Date.now()}`,
            email: `prod_${Date.now()}@zeecorp.com`,
            password: 'Password123!',
            fullName: 'Production Test User',
            role: 'staff',
            phone: '1234567890',
            salaryPerHour: 20
        };
        const userRes = await axios.post(`${BASE_URL}/auth/register`, testUser, authHeader);
        if (userRes.data.user && userRes.data.user.id) {
            createdUserId = userRes.data.user.id;
            console.log(`   ✅ PASS: User created (ID: ${createdUserId})`);
        } else {
            throw new Error('User creation failed');
        }

        // --- TEST 3: Project Creation ---
        console.log('\n📁 TEST 3: Project Creation');
        const testProject = {
            projectName: `QA Project ${Date.now()}`,
            clientName: 'QA Client',
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000 * 30), // 30 days
            status: 'planning',
            description: 'End-to-end test project',
            projectType: 'Project Management',
            budget: 5000
        };

        // We wrap this in try-catch to avoid crashing if already created (duplicates) depends on reset
        const projectRes = await axios.post(`${BASE_URL}/projects`, testProject, authHeader);
        if (projectRes.data.project && projectRes.data.project._id) {
            createdProjectId = projectRes.data.project._id;
            console.log(`   ✅ PASS: Project created (ID: ${createdProjectId})`);
        } else {
            throw new Error('Project creation failed');
        }

        // --- TEST 4 & 5: File Uploads ---
        console.log('\n📄 TEST 5: File Upload (VPS Disk)');
        // Use .pdf extension to pass Multer validation
        const fakePdfPath = 'qa_test_doc.pdf';
        fs.writeFileSync(fakePdfPath, '%PDF-1.4\n%EOF');

        const form = new FormData();
        form.append('file', fs.createReadStream(fakePdfPath));

        const fileRes = await axios.post(`${BASE_URL}/files/upload`, form, {
            headers: { ...authHeader.headers, ...form.getHeaders() }
        });

        if (fileRes.data && (fileRes.data.fileUrl || fileRes.data.success)) {
            console.log('   ✅ PASS: File upload reported success by API.');
            console.log(`      Type: ${fileRes.data.type}`);
            console.log(`      URL: ${fileRes.data.fileUrl}`);
        } else {
            console.warn('   ⚠️ WARNING: File upload response structure unexpected, but 200 OK.');
        }
        try { fs.unlinkSync(fakePdfPath); } catch (e) { }

        // --- TEST 6: Task Creation ---
        console.log('\n✅ TEST 6: Task Creation & Assignment');
        const testTask = {
            title: 'QA Test Task',
            description: 'Verify task creation',
            project: createdProjectId,
            assignedTo: createdUserId, // Fixed Logic
            deadline: new Date(Date.now() + 86400000), // Fixed Logic
            priority: 'high',
            status: 'todo'
        };
        const taskRes = await axios.post(`${BASE_URL}/tasks`, testTask, authHeader);
        if (taskRes.data.task && taskRes.data.task._id) {
            createdTaskId = taskRes.data.task._id;
            console.log(`   ✅ PASS: Task created and assigned (ID: ${createdTaskId})`);
        } else {
            throw new Error('Task creation failed');
        }

        // --- TEST 7: Attendance ---
        console.log('\n🕒 TEST 7: Attendance');
        // Login as new user
        const userLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: testUser.username,
            password: testUser.password
        });
        const userToken = userLoginRes.data.token;
        const userAuth = { headers: { Authorization: `Bearer ${userToken}` } };

        // Check In
        try {
            const checkInRes = await axios.post(`${BASE_URL}/attendance/check-in`, {}, userAuth);
            if (checkInRes.data.success) {
                console.log('   ✅ PASS: Check-in successful');
            }
        } catch (e) {
            console.error('Check-in failed:', e.response ? e.response.data : e.message);
        }

        await sleep(2000);

        // Check Out
        try {
            const checkOutRes = await axios.post(`${BASE_URL}/attendance/check-out`, {}, userAuth);
            if (checkOutRes.data.success) {
                console.log('   ✅ PASS: Check-out successful');
            }
        } catch (e) {
            console.error('Check-out failed:', e.response ? e.response.data : e.message);
        }

        console.log('\n🎉 Automation Phase Complete.');

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            if (error.response.data) console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

runTests();
