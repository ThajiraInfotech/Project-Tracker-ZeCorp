const { publishEvent } = require('./backend/infrastructure/queue');

async function test() {
    console.log('--- Notification Verification Script ---');
    console.log('Publishing TASK_ASSIGNED event...');

    // payload matching TASK_ASSIGNED rule in rulesEngine.js
    const payload = {
        entityType: 'task',
        entityId: '000000000000000000000000',
        entityTitle: 'Start Up Verification',
        assignedTo: {
            _id: '000000000000000000000000',
            username: 'verification_bot',
            email: 'verification@example.com', // Should log "Email sent" (mock)
            phone: '1234567890' // Should log WhatsApp attempt
        },
        messageSnippet: 'System verification test',
        relatedLink: '/dashboard'
    };

    const success = await publishEvent('TASK_ASSIGNED', payload);

    if (success) {
        console.log('✅ Event successfully published to Redis!');
        console.log('👉 PLEASE CHECK YOUR "node server.js" TERMINAL');
        console.log('   You should see: "Processing Job: TASK_ASSIGNED"');
    } else {
        console.error('❌ Failed to publish event.');
    }

    // Allow time for flush
    setTimeout(() => process.exit(0), 1000);
}

test();
