import React, { useState, useEffect, useRef } from 'react';
import api from '../store/api';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import UserAvatar from './UserAvatar';

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

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileUploadLoading, setFileUploadLoading] = useState(false);

  const commentsEndRef = useRef(null);
  const sidebarRef = useRef(null);
  const textareaRef = useRef(null);
  const mentionDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
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
      setSelectedFiles([]);
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

  // File handling
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Create preview URLs
      const newFiles = files.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!newComment.trim() && selectedFiles.length === 0) || submitting) return;

    try {
      setSubmitting(true);
      let uploadedAttachments = [];

      // Upload files first if any
      if (selectedFiles.length > 0) {
        setFileUploadLoading(true);
        const formData = new FormData();
        selectedFiles.forEach(item => {
          formData.append('files', item.file);
        });

        const uploadResponse = await api.post('/files/upload-multiple', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadResponse.data.success) {
          uploadedAttachments = uploadResponse.data.fileUrls.map((url, index) => ({
            url,
            name: selectedFiles[index].file.name,
            fileType: selectedFiles[index].type
          }));
        }
      }

      const endpoint = entityType === 'project'
        ? `/projects/${entityId}/comments`
        : `/tasks/${entityId}/comments`;

      const payload = {
        text: newComment.trim(),
        attachments: uploadedAttachments
      };

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        // Clear files from memory
        selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
        setSelectedFiles([]);
        setNewComment('');
        setShowMentionDropdown(false);
        setMentionQuery('');

        await fetchComments();
        toast.success('Message sent');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
      setFileUploadLoading(false);
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full w-full max-w-[450px] bg-white shadow-2xl z-[70] transform flex flex-col slide-in-right font-sans"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#700606] to-[#4a0404] px-6 py-5 shadow-md z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-inner">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                {/* Online Indicator Status Dot (Optional Visual) */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#700606] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-white tracking-wide">Discussion</h2>
                <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
                  <span className="opacity-75">Topic:</span>
                  <span className="bg-black/20 px-2 py-0.5 rounded text-white truncate max-w-[220px]" title={entityTitle}>
                    {entityTitle}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 transform hover:rotate-90"
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-6 bg-[#f8fafc] scroll-smooth">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-gray-200 opacity-20"></div>
                <div className="w-12 h-12 rounded-full border-t-2 border-[#700606] animate-spin absolute top-0 left-0"></div>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5 animate-pulse">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No messages yet</h3>
              <p className="text-gray-500 max-w-xs">Be the first to start the conversation in this thread.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment, index) => {
                // Handle both 'user' and 'author' field names for compatibility
                const commentUser = comment.user || comment.author;
                const isCurrentUser = commentUser?._id === auth.user?._id ||
                  commentUser === auth.user?._id ||
                  (typeof commentUser === 'string' && commentUser === auth.user?._id);
                const authorName = commentUser?.fullName || commentUser?.username || 'Unknown';
                const authorInitials = authorName.charAt(0).toUpperCase();

                // Check if next comment is from same user for grouping visuals
                const nextComment = comments[index + 1];
                const nextUser = nextComment?.user || nextComment?.author;
                const isNextSameUser = nextUser && (
                  nextUser._id === (commentUser?._id || commentUser) ||
                  nextUser === (commentUser?._id || commentUser)
                );

                return (
                  <div
                    key={comment._id || index}
                    className={`flex gap-4 ${isCurrentUser ? 'flex-row-reverse' : ''} group`}
                  >
                    {/* Avatar */}
                    <UserAvatar
                      user={commentUser}
                      size="custom"
                      className={`w-9 h-9 text-sm shadow-sm border border-black/5 ${isCurrentUser
                        ? 'bg-[#700606] text-white order-last'
                        : 'bg-white text-[#700606]'
                        }`}
                    />

                    {/* Message Content */}
                    <div className={`flex-1 flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                      <div className="flex items-baseline gap-2 mb-1 px-1">
                        <span className="text-xs font-semibold text-gray-700">{!isCurrentUser && authorName}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(comment.createdAt)}</span>
                      </div>

                      <div className={`px-4 py-3 shadow-sm text-sm leading-relaxed transition-all duration-200 ${isCurrentUser
                        ? 'bg-[#700606] text-white rounded-2xl rounded-tr-sm hover:shadow-md'
                        : 'bg-white text-slate-700 rounded-2xl rounded-tl-sm border border-gray-100 hover:shadow-md'
                        }`}>
                        {/* Text */}
                        {comment.text && <p className="whitespace-pre-wrap break-words">{comment.text}</p>}

                        {/* Attachments */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className={`mt-2 flex flex-wrap gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            {comment.attachments.map((file, i) => (
                              <div key={i} className="relative group/file">
                                {file.fileType?.startsWith('image/') || file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                                    <img src={file.url} alt={file.name} className="w-32 h-32 object-cover rounded-lg border-2 border-white/20 hover:border-white/50 transition-colors" />
                                  </a>
                                ) : file.fileType?.startsWith('video/') || file.url.match(/\.(mp4|webm|ogg)$/i) ? (
                                  <video src={file.url} controls className="w-48 rounded-lg border-2 border-white/20" />
                                ) : (
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isCurrentUser ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className="underline max-w-[150px] truncate">{file.name || 'Attachment'}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} className="h-2" />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="flex-shrink-0 bg-white p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20">
          {/* File Preview */}
          {selectedFiles.length > 0 && (
            <div className="flex gap-3 mb-3 overflow-x-auto pb-2 scrollbar-hide">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative flex-shrink-0 w-16 h-16 group">
                  {file.type.startsWith('image/') ? (
                    <img src={file.preview} alt="preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  ) : file.type.startsWith('video/') ? (
                    <video src={file.preview} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors shadow-sm"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            {/* File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*,video/*,application/pdf"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-[#700606] hover:bg-[#700606]/5 rounded-full transition-colors mb-1.5"
              title="Attach file"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#700606]/20 focus:border-[#700606] resize-none text-sm transition-all duration-200 ease-in-out placeholder:text-gray-400"
                disabled={submitting}
              />

              {/* Mention Hint */}
              <div className="absolute right-3 bottom-3 text-gray-400">
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">@</span>
              </div>

              {/* Mention Dropdown */}
              {showMentionDropdown && mentionUsers.length > 0 && (
                <div
                  ref={mentionDropdownRef}
                  className="absolute bottom-full left-0 mb-3 w-64 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn"
                >
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested People</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {mentionUsers.map((user, index) => {
                      const userName = user.fullName || user.username || 'Unknown';

                      return (
                        <div
                          key={user._id || index}
                          onClick={() => insertMention(user)}
                          className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 transition-colors ${index === selectedMentionIndex ? 'bg-[#700606]/5 border-l-2 border-[#700606]' : 'hover:bg-gray-50 border-l-2 border-transparent'
                            }`}
                        >
                          <UserAvatar
                            user={user}
                            size="sm"
                            className="bg-[#700606]/10 text-[#700606]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {userName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={(!newComment.trim() && selectedFiles.length === 0) || submitting}
              className="group flex items-center justify-center w-11 h-11 bg-[#700606] text-white rounded-full hover:bg-[#500000] hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 ease-out shadow-md"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              ) : (
                <svg className="w-5 h-5 translate-x-0.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;