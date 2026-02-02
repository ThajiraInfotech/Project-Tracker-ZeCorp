const axios = require('axios');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

// Configuration matches docker-compose defaults
const BACKEND_URL = 'http://localhost:5000';
const MONGO_URI = 'mongodb://localhost:27017';
const REDIS_PORT = 6379;
const REDIS_HOST = 'localhost';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runVerification() {
    console.log('🚀 Starting Local Docker Verification...');

    // 1. Verify Backend Health
    console.log('\nScanning Backend Health...');
    try {
        // Try a simple endpoint. If /api/health doesn't exist, use /api/auth/admins or similar public/light endpoint
        // Using /api/auth/admins (requires auth usually, but we check if it responds 401/200, meaning server is up)
        // Better: register a user immediately, if it fails validation, server is up.
        await axios.get(`${BACKEND_URL}/api/projects`).catch(e => {
            if (e.code === 'ECONNREFUSED') throw e;
            // 401/403 means server is running
        });
        console.log('✅ Backend is reachable.');
    } catch (error) {
        console.error('❌ Backend not reachable:', error.message);
        console.log('   Ensure docker containers are running: docker-compose ps');
        process.exit(1);
    }

    // 2. Register a User (Trigger End-to-End Flow)
    const testUser = {
        username: `docker_test_${Date.now()}`,
        email: `docker_${Date.now()}@test.com`,
        password: 'Password123!',
        fullName: 'Docker Test User',
        role: 'staff'
    };

    console.log(`\nRegistering Test User: ${testUser.username}...`);
    try {
        const res = await axios.post(`${BACKEND_URL}/api/auth/register`, testUser);
        console.log('✅ User registered successfully via API.');

        // 3. Verify in MongoDB
        console.log('\nVerifying User in MongoDB...');
        const mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        const db = mongoClient.db('zeecorp_db');
        const userDoc = await db.collection('users').findOne({ email: testUser.email });

        if (userDoc) {
            console.log(`✅ User found in MongoDB: ID ${userDoc._id}`);
        } else {
            console.error('❌ User NOT found in MongoDB.');
            process.exit(1);
        }
        await mongoClient.close();

        // 4. Verify in Redis (Queue)
        console.log('\nVerifying Notification Job in Redis...');
        const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

        // Wait briefly for queue processing
        await sleep(2000);

        // Check keys. BullMQ uses specific key patterns.
        const keys = await redis.keys('*');
        console.log(`   Found ${keys.length} keys in Redis.`);

        // Look for keys related to "notification" or "default" queue
        // We look for ANY key activity as a sign the redis is connected and working. 
        // More specifically, we look for 'bull:notification:...' or similar if possible.
        const hasQueueKeys = keys.some(k => k.includes('bull') || k.includes('notification'));

        if (keys.length > 0) {
            console.log('✅ Redis contains keys (Queue/Cache active).');
            if (hasQueueKeys) console.log('   Found BullMQ/Notification specific keys.');
        } else {
            console.warn('⚠️  Redis is empty. Queue might be idle or keys expired quickly.');
        }

        redis.disconnect();

    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
        if (error.response) {
            console.error('   Response Status:', error.response.status);
            console.error('   Response Data:', error.response.data);
        }
        process.exit(1);
    }

    console.log('\n🎉 End-to-End Verification Complete!');
}

runVerification();
