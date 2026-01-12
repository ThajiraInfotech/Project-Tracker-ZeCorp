const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('./emailService');

/**
 * Parse @username mentions from content and return valid User IDs
 * @param {string} content - The content to parse for mentions
 * @returns {Promise<Array>} Array of valid User IDs
 */
const parseMentions = async (content) => {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // Regex to find @username patterns
  const mentionRegex = /@([a-zA-Z0-9_]{3,30})/g;
  const matches = content.match(mentionRegex);
  
  if (!matches) {
    return [];
  }

  // Extract usernames and remove duplicates
  const usernames = [...new Set(matches.map(match => match.substring(1)))];
  
  if (usernames.length === 0) {
    return [];
  }

  try {
    // Find users by username (case-insensitive)
    const users = await User.find({
      username: { $in: usernames.map(u => new RegExp(`^${u}$`, 'i')) },
      isActive: true
    }).select('_id username fullName email');

    return users.map(user => ({
      userId: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email
    }));
  } catch (error) {
    console.error('Error parsing mentions:', error);
    return [];
  }
};

/**
 * Create notifications for mentioned users
 * @param {Array} mentionedUsers - Array of mentioned user objects
 * @param {Object} sender - The user who created the discussion
 * @param {string} type - Type of the related model ('Project' or 'Task')
 * @param {string} relatedId - ID of the related project or task
 * @param {string} content - The discussion content
 */
const createMentionNotifications = async (mentionedUsers, sender, type, relatedId, content) => {
  if (!mentionedUsers || mentionedUsers.length === 0) {
    return;
  }

  try {
    const notifications = [];
    const emailPromises = [];

    for (const mentionedUser of mentionedUsers) {
      // Skip if the mentioned user is the sender
      if (mentionedUser.userId.toString() === sender._id.toString()) {
        continue;
      }

      // Create notification
      const notification = new Notification({
        recipient: mentionedUser.userId,
        sender: sender._id,
        type: 'mention',
        title: `You were mentioned in ${type}`,
        message: `${sender.fullName || sender.username} mentioned you: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
        relatedModel: type,
        relatedId: relatedId
      });

      notifications.push(notification);

      // Send email notification (optional - don't fail if email fails)
      if (mentionedUser.email) {
        emailPromises.push(
          emailService.sendEmail(
            mentionedUser.email,
            `You were mentioned in ${type}`,
            `<p><strong>${sender.fullName || sender.username}</strong> mentioned you in a discussion:</p>
             <blockquote style="background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff;">
               ${content}
             </blockquote>
             <p><a href="#" style="color: #007bff; text-decoration: none;">View in ${type}</a></p>`
          ).catch(error => {
            console.warn(`Failed to send mention email to ${mentionedUser.email}:`, error.message);
          })
        );
      }
    }

    // Save notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Wait for all email promises to complete
    await Promise.allSettled(emailPromises);

  } catch (error) {
    console.error('Error creating mention notifications:', error);
    // Don't throw error to prevent blocking discussion creation
  }
};

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @param {number} limit - Limit of notifications to return
 * @param {number} skip - Number of notifications to skip
 * @returns {Promise<Object>} Notifications and count
 */
const getUserNotifications = async (userId, limit = 20, skip = 0) => {
  try {
    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipient: userId });

    return {
      notifications,
      total,
      unread: await Notification.countDocuments({ recipient: userId, read: false })
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark notifications as read
 * @param {string} userId - User ID
 * @param {Array} notificationIds - Array of notification IDs to mark as read
 */
const markNotificationsAsRead = async (userId, notificationIds) => {
  try {
    const query = notificationIds && notificationIds.length > 0 
      ? { _id: { $in: notificationIds }, recipient: userId }
      : { recipient: userId, read: false };

    await Notification.updateMany(
      query,
      { 
        read: true, 
        readAt: new Date() 
      }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

module.exports = {
  parseMentions,
  createMentionNotifications,
  getUserNotifications,
  markNotificationsAsRead
};