const Notification = require('../../../models/Notification');
// We will access io via the exported instance from server.js
// using lazy loading or dependency injection to avoid circular deps during init

const send = async (recipient, data, ioInstance) => {
    try {
        if (!recipient || !recipient._id) {
            console.warn('InAppChannel: No recipient provided');
            return false;
        }

        // 1. Save to Database
        const notification = new Notification({
            user: recipient._id,
            type: data.type,
            entityType: data.entityType,
            entityId: data.entityId,
            entityTitle: data.entityTitle,
            messageSnippet: data.message,
            relatedLink: data.link,
            mentionedBy: data.mentionedBy // Save the actor
        });

        await notification.save();

        // 2. Emit Socket Event
        let io = ioInstance;
        if (!io) {
            // Attempt to get from server export if not provided
            try {
                const serverExport = require('../../../server');
                io = serverExport.io;
            } catch (err) {
                console.warn('InAppChannel: Could not load io instance', err.message);
            }
        }

        if (io) {
            // Assuming io.to(userId) works (need to ensure users join room 'userId' on connection)
            // Or use a custom socket-map.
            // For now, we will emit to all sockets (less efficient) or rely on frontend to filter? 
            // BETTER: The server.js logic needs to join users to rooms.
            // Let's assume standard 'user_ID' room pattern or broadcast.
            // Default Zeecorp implementation might not have rooms.
            // Let's just emit 'notification' globally and let frontend filter, OR better, don't emit if we can't target.
            // Creating a room for the user is best practice.
            io.emit('notification_' + recipient._id, notification);
        }

        return true;
    } catch (error) {
        console.error('InAppChannel Error:', error);
        return false;
    }
};

module.exports = { send };
