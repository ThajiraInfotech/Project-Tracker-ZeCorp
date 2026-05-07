const Redis = require('ioredis');

// Default Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        if (times > 3) {
            console.warn('[Redis] Max connection retries reached. Stopping attempts. Background features like Notifications may be disabled.');
            return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};

let connection = null;

const getRedisConnection = () => {
    if (!connection) {
        connection = new Redis(redisConfig);

        connection.on('error', (err) => {
            // Prevent spamming the full AggregateError in console
            if (!connection._hasLoggedError) {
                console.warn('Redis connection error (Notifications may be delayed). Ensure Redis is running on', redisConfig.host + ':' + redisConfig.port);
                connection._hasLoggedError = true;
            }
        });

        connection.on('connect', () => {
            console.log('Connected to Redis for Notification Service');
            connection._hasLoggedError = false;
        });
    }
    return connection;
};

module.exports = {
    getRedisConnection,
    redisConfig
};
