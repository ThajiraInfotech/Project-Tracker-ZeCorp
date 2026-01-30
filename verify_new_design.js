const { publishEvent } = require('./backend/infrastructure/queue');

async function testDesign() {
    console.log('--- Design Verification Script ---');
    const TEST_EMAIL = 'thajiratechworks@gmail.com';

    const payload = {
        user: {
            _id: '507f1f77bcf86cd799439011',
            fullName: 'Enterprise User',
            username: 'zecorp_admin',
            email: TEST_EMAIL
        },
        username: 'zecorp_admin',
        password: 'SecurePassword2026!'
    };

    console.log(`Sending PROTOTYPE Design email to ${TEST_EMAIL}...`);
    await publishEvent('USER_CREATED', payload);
    console.log('✅ Sent! Check your inbox for the new "ZeCorp Solutions" design.');
    setTimeout(() => process.exit(0), 1000);
}

testDesign();
