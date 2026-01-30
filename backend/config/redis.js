const Redis = require('ioredis');

// Default Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};

let connection = null;

const getRedisConnection = () => {
    if (!connection) {
        connection = new Redis(redisConfig);

        connection.on('error', (err) => {
            console.warn('Redis connection error (Notifications may be delayed):', err.message);
            // We don't crash the app, just log warning
        });

        connection.on('connect', () => {
            console.log('Connected to Redis for Notification Service');
        });
    }
    return connection;
};

module.exports = {
    getRedisConnection,
    redisConfig
};
