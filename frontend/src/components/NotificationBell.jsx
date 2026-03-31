import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';
import UserAvatar from './UserAvatar';
import { socket } from '../App';

const NotificationBell = ({ onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const auth = useSelector((state) => state.auth);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications?limit=20');
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchNotifications();

      // 1. Poll for new notifications every 30 seconds (Fallback)
      const interval = setInterval(fetchNotifications, 30000);

      // 2. Real-time listener
      let cleanupSocket = () => { };

      if (auth.user?._id) {
        const channelName = `notification_${auth.user._id}`;

        const handleNewNotification = (newNotification) => {
          // Toast
          toast.info(`New Notification: ${newNotification.messageSnippet || 'Check your alerts'}`);

          // Update State Instantly
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        };

        socket.on(channelName, handleNewNotification);

        cleanupSocket = () => {
          socket.off(channelName, handleNewNotification);
        };
      }

      return () => {
        clearInterval(interval);
        cleanupSocket();
      };
    }
  }, [auth.isAuthenticated, auth.user?._id]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification._id, { stopPropagation: () => { } });
    }

    // Close dropdown
    setIsOpen(false);

    // Navigate if link exists
    if (notification.relatedLink) {
      navigate(notification.relatedLink);
      return;
    }

    // Call parent handler (fallback for mentions/chat)
    if (onNotificationClick) {
      onNotificationClick({
        entityType: notification.entityType,
        entityId: notification.entityId,
        entityTitle: notification.entityTitle
      });
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

  if (!auth.isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center transform translate-x-1/2 -translate-y-1/2">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed top-16 left-4 right-4 z-50 md:absolute md:top-full md:right-0 md:left-auto md:w-96 md:mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] md:max-h-[600px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => {
                  const mentionedBy = notification.mentionedBy;
                  const mentionedByName = mentionedBy?.fullName || mentionedBy?.username || 'Someone';
                  const mentionedByInitials = mentionedByName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <UserAvatar
                          user={mentionedBy}
                          size="md"
                          className="bg-primary-100 text-primary-600"
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">
                                <span className="font-semibold text-gray-900">{mentionedByName}</span>
                                {notification.type === 'PROJECT_ASSIGNED' && (
                                  <span> assigned you to project <span className="font-semibold text-primary-600">{notification.entityTitle}</span></span>
                                )}
                                {notification.type === 'TASK_ASSIGNED' && (
                                  <span> assigned you to task <span className="font-semibold text-primary-600">{notification.entityTitle}</span></span>
                                )}
                                {notification.type === 'TASK_SUPERVISOR_ADDED' && (
                                  <span> added you as a Supervisor to task <span className="font-semibold text-primary-600">{notification.entityTitle}</span></span>
                                )}
                                {notification.type === 'ADDED_TO_TEAM' && (
                                  <span> added you to the team of <span className="font-semibold text-primary-600">{notification.entityTitle}</span></span>
                                )}
                                {notification.type === 'USER_CREATED' && (
                                  <span> Welcome to ZeCorp! Your account has been created.</span>
                                )}
                                {['mention', 'comment'].includes(notification.type) && (
                                  <span> mentioned you in <span className="font-semibold text-primary-600">{notification.entityTitle}</span></span>
                                )}
                                {!['PROJECT_ASSIGNED', 'TASK_ASSIGNED', 'TASK_SUPERVISOR_ADDED', 'ADDED_TO_TEAM', 'USER_CREATED', 'mention', 'comment'].includes(notification.type) && (
                                  <span> {notification.messageSnippet}</span>
                                )}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium w-full text-center"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
