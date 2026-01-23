import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markNotificationAsRead } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from '../hooks/useSocket';
import "./NotificationBell.css";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { refreshUserSilently } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animatedIds, setAnimatedIds] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useSocket();

  // Fetch notifications from backend (silent = don't show loading spinner)
  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await getNotifications(10); // Get latest 10 notifications
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Show browser notification for new real-time notifications
  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification('CampVerse', {
        body: notification.message,
        icon: '/logo.png',
        badge: '/logo.png',
      });
      notif.onclick = () => {
        window.focus();
        if (notification.link) {
          window.location.href = notification.link;
        }
      };
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize Socket.IO connection for real-time notifications
  useEffect(() => {
    fetchNotifications();

    const socket = socketRef.current;
    if (!socket) return;

    const handleConnect = () => {
      setIsSocketConnected(true);
      const token = localStorage.getItem('token');
      if (token) {
        socket.emit('authenticate', token);
      }
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleNotification = (newNotification) => {
      setNotifications(prev => [newNotification, ...prev].slice(0, 10));
      setAnimatedIds(prev => [newNotification._id, ...prev].slice(0, 10));
      showBrowserNotification(newNotification);

      // If host status update notification, refresh user data to update UI
      if (newNotification.type === 'host_status_update') {
        refreshUserSilently();
      }
    };

    const handleNotificationRead = ({ notificationId }) => {
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    };

    const handleConnectError = () => {
      setIsSocketConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('notification', handleNotification);
    socket.on('notificationRead', handleNotificationRead);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('notification', handleNotification);
      socket.off('notificationRead', handleNotificationRead);
    };
  }, [refreshUserSilently, socketRef]);

  // Separate polling effect that depends on open state
  useEffect(() => {
    if (open || isSocketConnected) {
      return;
    }

    const refreshInterval = setInterval(() => {
      fetchNotifications(true); // Silent fetch (no loading spinner)
    }, 15000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [open, isSocketConnected]);

  useEffect(() => {
    const handleFocus = () => {
      if (!open) {
        fetchNotifications(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch when dropdown opens (for fresh data)
  useEffect(() => {
    if (open) {
      fetchNotifications(true); // Silent fetch when opening
    }
  }, [open]);

  // Mark notification as read and navigate to link
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification._id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        );
      }
      
      // Navigate to link if available
      if (notification.link) {
        navigate(notification.link);
      }
    } catch {
      // Failed to handle notification click - silently ignore
    }
  };

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="bg-gray-800/60 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 relative"
      >
        <i className="ri-notification-3-line text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[20px] text-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="
            fixed top-16 left-1/2 -translate-x-1/2 w-80 sm:w-96 
            sm:left-auto sm:right-16 sm:translate-x-0
            bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50
          "
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-400">{unreadCount} unread</span>
            )}
          </div>
          
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              <i className="ri-loader-4-line animate-spin text-xl"></i>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center">
              <i className="ri-notification-off-line text-4xl text-gray-600 mb-2"></i>
              <p className="text-gray-400 text-sm">No notifications</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <li
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-[#9b5de5]/10' : ''
                  } ${animatedIds.includes(notification._id) ? 'animate-notif-in' : ''}`}
                  onAnimationEnd={() => {
                    setAnimatedIds(ids => ids.filter(id => id !== notification._id));
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${!notification.isRead ? 'text-[#9b5de5]' : 'text-gray-500'}`}>
                      {notification.type === 'rsvp' && <i className="ri-calendar-check-line text-xl"></i>}
                      {notification.type === 'certificate' && <i className="ri-award-line text-xl"></i>}
                      {notification.type === 'cohost' && <i className="ri-user-add-line text-xl"></i>}
                      {notification.type === 'event_verification' && <i className="ri-shield-check-line text-xl"></i>}
                      {notification.type === 'host_request' && <i className="ri-user-star-line text-xl"></i>}
                      {notification.type === 'host_status_update' && <i className="ri-user-settings-line text-xl"></i>}
                      {!notification.type && <i className="ri-notification-3-line text-xl"></i>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.isRead ? 'text-white font-medium' : 'text-gray-300'}`}>
                        {notification.message}
                      </p>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {new Date(notification.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-[#9b5de5] rounded-full mt-2"></div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
