const { Worker } = require('bullmq');
const { getRedisConnection } = require('../../config/redis');
const rulesEngine = require('./rulesEngine');
const emailChannel = require('./channels/emailChannel');
const whatsappChannel = require('./channels/whatsappChannel');
const inAppChannel = require('./channels/inAppChannel');

let worker = null;
let ioInstance = null;

const initWorker = (io) => {
    if (io) ioInstance = io;
    if (worker) return worker;

    try {
        const connection = getRedisConnection();

        worker = new Worker('notificationQueue', async (job) => {
            console.log(`Processing Job: ${job.name}`);
            const { name: eventName, data: payload } = job;

            // 1. Get Rule
            const rule = rulesEngine.getRuleForEvent(eventName);
            if (!rule) {
                console.warn(`No rule found for event: ${eventName}`);
                return;
            }

            // 2. Get Recipients (Standardized to Array)
            const recipients = rule.getRecipients(payload);
            if (!recipients || recipients.length === 0) {
                console.log(`No recipients for event: ${eventName}`);
                return;
            }

            // 3. Process Per Recipient
            for (const recipient of recipients) {
                if (!recipient) continue;

                // 4. Send to Channels
                await Promise.all(rule.channels.map(async (channel) => {
                    try {
                        switch (channel) {
                            case 'EMAIL':
                                // Prepare template data
                                const emailData = {
                                    type: eventName,
                                    subject: rule.template?.subject, // or generate subject dynamic
                                    message: payload.messageSnippet || `Event: ${eventName}`,
                                    ...payload
                                };
                                await emailChannel.send(recipient, emailData);
                                break;

                            case 'WHATSAPP':
                                const waMessage = payload.messageSnippet || `Update: ${eventName}`;
                                await whatsappChannel.send(recipient, waMessage);
                                break;

                            case 'IN_APP':
                                console.log(`[Worker] Sending IN_APP to User: ${recipient._id}`);
                                const inAppData = {
                                    type: eventName,
                                    entityType: payload.entityType,
                                    entityId: payload.entityId,
                                    entityTitle: payload.entityTitle,
                                    message: payload.messageSnippet,
                                    link: payload.relatedLink,
                                    mentionedBy: payload.triggeredBy // Pass the actor
                                };
                                const success = await inAppChannel.send(recipient, inAppData, ioInstance);
                                console.log(`[Worker] IN_APP Sent: ${success}`);
                                break;
                        }
                    } catch (channelError) {
                        console.error(`Channel ${channel} failed for user ${recipient._id}:`, channelError);
                    }
                }));
            }

            console.log(`Job ${job.name} completed successfully.`);

        }, {
            connection,
            concurrency: 5 // Process 5 jobs in parallel
        });

        worker.on('failed', (job, err) => {
            console.error(`Job ${job.id} failed:`, err);
        });

        console.log('Notification Worker Initialized');
    } catch (error) {
        console.error('Failed to init worker:', error);
    }
};

module.exports = { initWorker };
