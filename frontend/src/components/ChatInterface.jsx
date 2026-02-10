import React, { useState, useEffect, useRef } from 'react';
import api from '../store/api';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { socket } from '../App';
import UserAvatar from './UserAvatar';

const ChatInterface = ({ entityType, entityId, entityTitle, entityData, className = "" }) => {
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
    const textareaRef = useRef(null);
    const mentionDropdownRef = useRef(null);
    const fileInputRef = useRef(null);
    const auth = useSelector((state) => state.auth);

    const [admins, setAdmins] = useState([]);

    // Fetch admins on mount
    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                const response = await api.get('/auth/admins');
                if (response.data.success) {
                    setAdmins(response.data.users || []);
                }
            } catch (error) {
                console.error('Error fetching admins:', error);
            }
        };
        fetchAdmins();
    }, []);

    // Get available users for mentions
    const getMentionableUsers = () => {
        const users = [];

        // Helper to add user if unique
        const addUser = (user, role) => {
            if (!user || !user._id) return;
            if (user._id === auth.user?._id) return; // Don't mention self
            if (users.find(u => u._id === user._id)) return; // Already added

            users.push({
                ...user,
                role
            });
        };

        if (entityType === 'project' && entityData) {
            // Add manager
            addUser(entityData.manager, 'Manager');

            // Add team members
            if (entityData.teamMembers) {
                entityData.teamMembers.forEach(member => {
                    addUser(member, 'Team Member');
                });
            }
        } else if (entityType === 'task' && entityData) {
            // For tasks, include assigned user and project team
            addUser(entityData.assignedTo, 'Assigned To');

            // Add Supervisor (CC)
            if (entityData.cc) {
                addUser(entityData.cc, 'Supervisor (CC)');
            }

            // Add Subtask Assignees
            if (entityData.subtasks && entityData.subtasks.length > 0) {
                entityData.subtasks.forEach(st => {
                    if (st.assignedTo) {
                        addUser(st.assignedTo, 'Subtask Staff');
                    }
                });
            }

            if (entityData.project?.manager) {
                addUser(entityData.project.manager, 'Project Manager');
            }

            if (entityData.project?.teamMembers) {
                entityData.project.teamMembers.forEach(member => {
                    addUser(member, 'Team Member');
                });
            }
        }

        // Add admins (if not already included)
        if (admins.length > 0) {
            admins.forEach(admin => {
                addUser(admin, 'Admin');
            });
        }

        return users;
    };

    // Fetch comments and join socket room when entity changes
    useEffect(() => {
        if (entityId && entityType) {
            fetchComments();

            // Socket logic
            const room = `${entityType}_${entityId}`;
            socket.emit('join_room', room);

            const handleReceiveMessage = (message) => {
                setComments((prev) => {
                    if (prev.some(c => c._id === message._id)) return prev;
                    return [...prev, message];
                });
            };

            socket.on('receive_message', handleReceiveMessage);

            return () => {
                socket.emit('leave_room', room);
                socket.off('receive_message', handleReceiveMessage);
            };
        } else {
            setComments([]);
            setNewComment('');
            setShowMentionDropdown(false);
            setMentionQuery('');
            setSelectedFiles([]);
        }
    }, [entityId, entityType]);

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

    return (
        <div className={`flex flex-col h-full bg-[#f8fafc] ${className}`}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-5 py-6 scroll-smooth">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-gray-200 opacity-20"></div>
                            <div className="w-12 h-12 rounded-full border-t-2 border-[#700606] animate-spin absolute top-0 left-0"></div>
                        </div>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 md:h-full text-center px-6 opacity-60">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">No messages yet</h3>
                        <p className="text-sm text-gray-500 max-w-xs">Be the first to start the conversation.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {comments.map((comment, index) => {
                            const commentUser = comment.user || comment.author;
                            const isCurrentUser = commentUser?._id === auth.user?._id ||
                                commentUser === auth.user?._id ||
                                (typeof commentUser === 'string' && commentUser === auth.user?._id);
                            const authorName = commentUser?.fullName || commentUser?.username || 'Unknown';

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
                                                    {comment.attachments.map((file, i) => {
                                                        const isImage = file.fileType?.startsWith('image/') || file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                                        const isVideo = file.fileType?.startsWith('video/') || file.url.match(/\.(mp4|webm|ogg|mov)$/i);
                                                        const isPDF = file.fileType === 'application/pdf' || file.url.match(/\.pdf$/i);

                                                        return (
                                                            <div key={i} className="relative group/file">
                                                                {isImage ? (
                                                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                                        <img src={file.url} alt={file.name} className="w-32 h-32 object-cover rounded-lg border-2 border-white/20 hover:border-white/50 transition-colors" />
                                                                    </a>
                                                                ) : isVideo ? (
                                                                    <video src={file.url} controls className="w-48 rounded-lg border-2 border-white/20" />
                                                                ) : isPDF ? (
                                                                    <a
                                                                        href={file.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="bg-white p-3 rounded-lg flex items-center gap-2 border border-gray-200 hover:border-blue-500 transition-colors"
                                                                    >
                                                                        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0L4 0C2.9 0 2 0.9 2 2L2 14 12 24 22 14 22 2C22 0.9 21.1 0 20 0L12 0ZM11 15L11 9 8 9 8 7 16 7 16 9 13 9 13 15 11 15Z" /></svg>
                                                                        <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">{file.name}</span>
                                                                    </a>
                                                                ) : (
                                                                    <a
                                                                        href={file.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isCurrentUser ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                        </svg>
                                                                        <span className="underline max-w-[150px] truncate">{file.name || 'Attachment'}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
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
            <div className="flex-shrink-0 bg-white p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 border-t border-gray-100">
                {/* File Preview */}
                {selectedFiles.length > 0 && (
                    <div className="flex gap-3 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="relative flex-shrink-0 w-16 h-16 group">
                                {file.type.startsWith('image/') ? (
                                    <img src={file.preview} alt="preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
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
    );
};

export default ChatInterface;

