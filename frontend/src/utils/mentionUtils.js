/**
 * Parse and highlight @username mentions in text
 * @param {string} text - The text to parse
 * @param {Object} mentionedUsers - Object mapping usernames to user data
 * @returns {Array} Array of text parts with mentions highlighted
 */
export const parseMentions = (text, mentionedUsers = {}) => {
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', content: text || '' }];
  }

  // Regex to find @username patterns
  const mentionRegex = /@([a-zA-Z0-9_]{3,30})/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    const username = match[1];
    const fullMatch = match[0];
    
    // Check if this username is in our mentioned users
    const userData = mentionedUsers[username.toLowerCase()];
    
    if (userData) {
      parts.push({
        type: 'mention',
        content: fullMatch,
        username: username,
        userId: userData.userId,
        fullName: userData.fullName
      });
    } else {
      // Not a valid mention, treat as regular text
      parts.push({
        type: 'text',
        content: fullMatch
      });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return parts;
};

/**
 * Format discussion content with highlighted mentions
 * @param {Object} discussion - Discussion object with mentions
 * @param {Array} allUsers - Array of all users in the project/task
 * @returns {Array} Formatted content parts
 */
export const formatDiscussionContent = (discussion, allUsers = []) => {
  // Create a map of username to user data for quick lookup
  const userMap = {};
  allUsers.forEach(user => {
    if (user.username) {
      userMap[user.username.toLowerCase()] = {
        userId: user._id,
        username: user.username,
        fullName: user.fullName
      };
    }
  });

  return parseMentions(discussion.content, userMap);
};

/**
 * Check if text contains mentions
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains mentions
 */
export const hasMentions = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const mentionRegex = /@[a-zA-Z0-9_]{3,30}/g;
  return mentionRegex.test(text);
};

/**
 * Extract all mentioned usernames from text
 * @param {string} text - Text to extract mentions from
 * @returns {Array} Array of mentioned usernames
 */
export const extractMentions = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const mentionRegex = /@([a-zA-Z0-9_]{3,30})/g;
  const matches = text.match(mentionRegex);
  
  if (!matches) {
    return [];
  }

  // Remove @ symbol and convert to lowercase for consistency
  return matches.map(match => match.substring(1).toLowerCase());
};