/**
 * Notification Rules Engine
 * Defines which channels used for each event type and how to structure the data.
 */

const RULES = {
    // User Management
    USER_CREATED: {
        channels: ['EMAIL'], // Security: Send credentials via email only
        getRecipients: (data) => [data.user],
        template: {
            subject: 'Welcome to Thajira WorkFlow - Your Account Details',
            // Body is dynamic based on data
        }
    },
    MENTION: {
        channels: ['IN_APP'],
        getRecipients: (data) => [data.mentionedUser],
        priority: 'high'
    },

    // Project Events
    PROJECT_ASSIGNED: {
        channels: ['IN_APP', 'WHATSAPP', 'EMAIL'], // Manager needs to know immediately
        getRecipients: (data) => [data.manager],
        priority: 'high'
    },
    ADDED_TO_TEAM: {
        channels: ['IN_APP', 'EMAIL'],
        getRecipients: (data) => [data.user],
        priority: 'medium'
    },
    PROJECT_DELAYED: {
        channels: ['IN_APP', 'EMAIL'],
        getRecipients: (data) => [...(data.team || []), data.manager].filter(Boolean),
        priority: 'high'
    },

    // Task Events
    TASK_ASSIGNED: {
        channels: ['IN_APP', 'WHATSAPP', 'EMAIL'],
        getRecipients: (data) => [data.assignedTo].filter(Boolean),
        priority: 'high'
    },
    SUBTASK_ASSIGNED: {
        channels: ['IN_APP', 'WHATSAPP', 'EMAIL'],
        getRecipients: (data) => [data.assignedTo].filter(Boolean),
        priority: 'high'
    },
    TASK_SUPERVISOR_ADDED: {
        channels: ['IN_APP', 'WHATSAPP', 'EMAIL'],
        getRecipients: (data) => [data.cc].filter(Boolean),
        priority: 'high'
    },
    TASK_DUE_SOON: {
        channels: ['IN_APP', 'EMAIL'],
        getRecipients: (data) => [data.assignedTo, data.cc].filter(Boolean),
        priority: 'medium'
    },
    TASK_DUE_TODAY: {
        channels: ['IN_APP', 'WHATSAPP'],
        getRecipients: (data) => [data.assignedTo, data.cc].filter(Boolean),
        priority: 'high'
    },
    TASK_OVERDUE: {
        channels: ['IN_APP', 'WHATSAPP', 'EMAIL'], // Escalation
        getRecipients: (data) => [data.assignedTo, data.cc].filter(Boolean),
        priority: 'critical'
    },
    TASK_COMMENT_ADDED: {
        channels: ['IN_APP'], // Avoid email/whatsapp spam for comments, just in-app
        getRecipients: (data) => {
            const recipients = [];
            if (data.assignedTo && data.assignedTo._id && data.assignedTo._id.toString() !== data.commenterId) {
                recipients.push(data.assignedTo);
            }
            if (data.cc && data.cc._id && data.cc._id.toString() !== data.commenterId) {
                recipients.push(data.cc);
            }
            if (data.manager && data.manager._id && data.manager._id.toString() !== data.commenterId) {
                recipients.push(data.manager);
            }
            return recipients;
        },
        priority: 'medium'
    }
};

const getRuleForEvent = (eventName) => {
    return RULES[eventName] || null;
};

module.exports = {
    RULES,
    getRuleForEvent
};
