const Activity = require('../models/Activity');

const logActivity = async (projectId, userId, action, description, metadata = {}) => {
  try {
    const activity = new Activity({
      project: projectId,
      user: userId,
      action,
      description,
      metadata
    });

    await activity.save();
    // Don't fail the main operation if logging fails
  } catch (error) {
    console.warn('Failed to log activity:', error.message);
  }
};

module.exports = { logActivity };