import React, { useState, useEffect, useRef } from 'react';
import api from '../store/api';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

const ChatSidebar = ({ isOpen, onClose, entityType, entityId, entityTitle, entityData }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(null);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const commentsEndRef = useRef(null);
  const sidebarRef = useRef(null);
  const textareaRef = useRef(null);
  const mentionDropdownRef = useRef(null);
  const auth = useSelector((state) => state.auth);

  // Get available users for mentions
  const getMentionableUsers = () => {
    if (!entityData || !entityId) return [];
    
    const users = [];
    
    if (entityType === 'project') {
      // Add manager
      if (entityData.manager) {
        users.push({
          ...entityData.manager,
          role: 'Manager'
        });
      }
      // Add team members
      if (entityData.teamMembers && entityData.teamMembers.length > 0) {
        entityData.teamMembers.forEach(member => {
          if (member._id !== auth.user?._id) {
            users.push({
              ...member,
              role: 'Team Member'
            });
          }
        });
      }
    } else if (entityType === 'task') {
      // For tasks, include assigned user and project team
      if (entityData.assignedTo && entityData.assignedTo._id !== auth.user?._id) {
        users.push({
          ...entityData.assignedTo,
          role: 'Assigned To'
        });
      }
      if (entityData.project?.manager && entityData.project.manager._id !== auth.user?._id) {
        users.push({
          ...entityData.project.manager,
          role: 'Project Manager'
        });
      }
      if (entityData.project?.teamMembers) {
        entityData.project.teamMembers.forEach(member => {
          if (member._id !== auth.user?._id && !users.find(u => u._id === member._id)) {
            users.push({
              ...member,
              role: 'Team Member'
            });
          }
        });
      }
    }
    
    return users;
  };

  // Fetch comments when sidebar opens or entity changes
  useEffect(() => {
    if (isOpen && entityId) {
      // Small delay to ensure animation triggers
      setTimeout(() => {
        fetchComments();
      }, 50);
    } else {
      setComments([]);
      setNewComment('');
      setShowMentionDropdown(false);
      setMentionQuery('');
    }
  }, [isOpen, entityId, entityType]);

  // Auto-scroll to bottom when new comments are added
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const endpoint = entityType === 'project' 
        ? `/projects/${entityId}/comments`
        : `/tasks/${entityId}/comments`;
      
      const response = await api.get(endpoint);
      if (response.data.success) {
        // Sort comments by creation date (oldest first)
        const sortedComments = (response.data.comments || []).sort((a, b) => {
          const dateA = new Date(a.createdAt || a.user?.createdAt || 0);
          const dateB = new Date(b.createdAt || b.user?.createdAt || 0);
          return dateA - dateB;
        });
        setComments(sortedComments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  // Handle text input change and detect @mentions
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setNewComment(value);

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);
      setMentionPosition(cursorPosition);
      
      // Filter users based on query
      const allUsers = getMentionableUsers();
      const filtered = allUsers.filter(user => {
        const username = (user.username || '').toLowerCase();
        const fullName = (user.fullName || '').toLowerCase();
        return username.includes(query) || fullName.includes(query);
      });
      
      setMentionUsers(filtered);
      setShowMentionDropdown(filtered.length > 0);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionPosition(null);
    }
  };

  // Insert mention into text
  const insertMention = (user) => {
    if (!mentionPosition) return;
    
    const textBefore = newComment.substring(0, mentionPosition - mentionQuery.length - 1);
    const textAfter = newComment.substring(mentionPosition);
    const mentionText = `@${user.username} `;
    
    const newText = textBefore + mentionText + textAfter;
    setNewComment(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionPosition(null);
    
    // Focus textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = textBefore.length + mentionText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = (e) => {
    if (showMentionDropdown && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < mentionUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionUsers[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
        setSubmitting(true);
        const endpoint = entityType === 'project'
          ? `/projects/${entityId}/comments`
          : `/tasks/${entityId}/comments`;
        
        const response = await api.post(endpoint, { text: newComment.trim() });
        
        if (response.data.success) {
          // Refresh comments to get the complete data from backend
          await fetchComments();
          setNewComment('');
          setShowMentionDropdown(false);
          setMentionQuery('');
          toast.success('Message sent');
        }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full w-full max-w-[450px] bg-white shadow-2xl z-[70] transform flex flex-col slide-in-right"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Chat</h2>
                <p className="text-sm text-white/80 truncate max-w-[200px]" title={entityTitle}>
                  {entityTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-sm text-gray-500">Start a conversation by sending a message below.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment, index) => {
                // Handle both 'user' and 'author' field names for compatibility
                const commentUser = comment.user || comment.author;
                const isCurrentUser = commentUser?._id === auth.user?._id || 
                                     commentUser === auth.user?._id ||
                                     (typeof commentUser === 'string' && commentUser === auth.user?._id);
                const authorName = commentUser?.fullName || commentUser?.username || 'Unknown';
                const authorInitials = authorName.charAt(0).toUpperCase();

                return (
                  <div
                    key={comment._id || index}
                    className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCurrentUser
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      <svg className="h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>

                    {/* Message */}
                    <div className={`flex-1 ${isCurrentUser ? 'flex flex-col items-end' : ''}`}>
                      <div className={`rounded-lg px-4 py-2 max-w-[85%] ${
                        isCurrentUser
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{comment.text}</p>
                      </div>
                      <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                        <span className="font-medium">{authorName}</span>
                        <span>•</span>
                        <span>{formatDate(comment.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4 relative">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (use @ to mention)"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                disabled={submitting}
              />
              
              {/* Mention Dropdown */}
              {showMentionDropdown && mentionUsers.length > 0 && (
                <div
                  ref={mentionDropdownRef}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50"
                >
                  {mentionUsers.map((user, index) => {
                    const userName = user.fullName || user.username || 'Unknown';
                    const userInitials = userName.charAt(0).toUpperCase();
                    
                    return (
                      <div
                        key={user._id || index}
                        onClick={() => insertMention(user)}
                        className={`px-4 py-2 cursor-pointer flex items-center gap-3 hover:bg-gray-50 ${
                          index === selectedMentionIndex ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={userName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-primary-700">
                              {userInitials}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {userName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            @{user.username} • {user.role}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line • Use @ to mention users
          </p>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;