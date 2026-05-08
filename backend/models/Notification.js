const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'mention', 'MENTION',
      'comment', 'COMMENT',
      'user_created', 'USER_CREATED',
      'project_assigned', 'PROJECT_ASSIGNED',
      'task_assigned', 'TASK_ASSIGNED',
      'task_due_soon', 'TASK_DUE_SOON',
      'task_due_today', 'TASK_DUE_TODAY',
      'task_overdue', 'TASK_OVERDUE',
      'project_delayed', 'PROJECT_DELAYED',
      'added_to_team', 'ADDED_TO_TEAM',
      'task_supervisor_added', 'TASK_SUPERVISOR_ADDED',
      'subtask_assigned', 'SUBTASK_ASSIGNED',
      'TASK_COMMENT_ADDED'
    ],
    default: 'mention',
    required: true
  },
  entityType: {
    type: String,
    enum: ['project', 'task', 'user'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  entityTitle: {
    type: String,
    required: true
  },
  messageSnippet: {
    type: String,
    required: true,
    maxlength: 500
  },
  relatedLink: {
    type: String,
    required: false
  },
  mentionedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Changed from true to false for system notifications
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
