const { publishEvent } = require('./backend/infrastructure/queue');

async function testEmail() {
    console.log('--- Email Verification Script ---');

    // Updated to the user's real email
    const TEST_EMAIL = 'thajiratechworks@gmail.com';

    console.log(`Publishing USER_CREATED event for ${TEST_EMAIL}...`);

    const payload = {
        user: {
            _id: '507f1f77bcf86cd799439011',
            fullName: 'Test Admin',
            username: 'testadmin',
            email: TEST_EMAIL
        },
        username: 'testadmin',
        password: 'TemporaryPassword123!'
    };

    const success = await publishEvent('USER_CREATED', payload);

    if (success) {
        console.log('✅ Event published!');
        console.log('👉 Check your "node server.js" terminal for "Email sent" log.');
        console.log(`👉 If credentials are correct, check inbox for ${TEST_EMAIL}`);
    } else {
        console.error('❌ Failed to publish event.');
    }

    setTimeout(() => process.exit(0), 1000);
}

testEmail();
