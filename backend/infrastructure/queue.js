const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

let notificationQueue = null;

const getQueue = () => {
    if (!notificationQueue) {
        try {
            const connection = getRedisConnection();
            notificationQueue = new Queue('notificationQueue', {
                connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: 100, // Keep last 100 completed jobs
                    removeOnFail: 500,     // Keep last 500 failed jobs for debugging
                }
            });
        } catch (error) {
            console.error('Failed to initialize notification queue:', error);
            // Return a dummy object if queue fails to init, to prevent app crash
            return {
                add: async () => { console.warn('Notification Queue not available, skipping event'); }
            };
        }
    }
    return notificationQueue;
};

/**
 * Publish an event to the notification system.
 * This is the ONLY entry point for the main application.
 * 
 * @param {string} eventName - The name of the event (e.g., 'USER_CREATED', 'TASK_ASSIGNED')
 * @param {object} payload - The data associated with the event
 */
const publishEvent = async (eventName, payload) => {
    try {
        const queue = getQueue();
        await queue.add(eventName, payload);
        console.log(`Event Published: ${eventName}`);
        return true;
    } catch (error) {
        console.error(`Failed to publish event ${eventName}:`, error);
        return false;
    }
};

module.exports = {
    publishEvent,
    getQueue
};
