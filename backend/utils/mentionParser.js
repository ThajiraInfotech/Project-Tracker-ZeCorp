const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Extract @mentions from text
 * @param {string} text - The text to parse
 * @returns {Array<string>} Array of mentioned usernames (without @)
 */
exports.extractMentions = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  // Match @username pattern (alphanumeric, underscore, hyphen)
  // Exclude @ at start of line or after whitespace
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const matches = text.match(mentionRegex);
  
  if (!matches) return [];
  
  // Extract usernames (remove @ symbol) and deduplicate
  const usernames = matches.map(match => match.substring(1));
  return [...new Set(usernames)];
};

/**
 * Create notifications for mentioned users
 * @param {Object} params
 * @param {string} params.text - The message text
 * @param {string} params.entityType - 'project' or 'task'
 * @param {string} params.entityId - Project or Task ID
 * @param {string} params.entityTitle - Project or Task title
 * @param {string} params.mentionedBy - User ID who mentioned
 * @param {Array<string>} params.excludeUserIds - User IDs to exclude (e.g., the sender)
 */
exports.createMentionNotifications = async ({
  text,
  entityType,
  entityId,
  entityTitle,
  mentionedBy,
  excludeUserIds = []
}) => {
  try {
    const mentionedUsernames = exports.extractMentions(text);
    
    if (mentionedUsernames.length === 0) {
      return { created: 0 };
    }

    // Find users by username
    const users = await User.find({
      username: { $in: mentionedUsernames }
    });

    if (users.length === 0) {
      return { created: 0 };
    }

    // Filter out excluded users (e.g., the sender)
    const usersToNotify = users.filter(
      user => !excludeUserIds.includes(user._id.toString())
    );

    if (usersToNotify.length === 0) {
      return { created: 0 };
    }

    // Create message snippet (first 200 chars)
    const messageSnippet = text.length > 200 
      ? text.substring(0, 197) + '...' 
      : text;

    // Create notifications
    const notifications = usersToNotify.map(user => ({
      user: user._id,
      type: 'mention',
      entityType,
      entityId,
      entityTitle,
      messageSnippet,
      mentionedBy,
      isRead: false
    }));

    await Notification.insertMany(notifications);

    return { created: notifications.length };
  } catch (error) {
    console.error('Error creating mention notifications:', error);
    // Don't throw - notification failure shouldn't break comment creation
    return { created: 0, error: error.message };
  }
};
