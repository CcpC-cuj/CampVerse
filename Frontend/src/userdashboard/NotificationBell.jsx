import React, { useState, useRef, useEffect } from "react";
import { getNotifications, markNotificationAsRead } from "../api";
import io from 'socket.io-client';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(10); // Get latest 10 notifications
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Socket.IO connection for real-time notifications
  useEffect(() => {
    fetchNotifications();

    // Connect to Socket.IO server
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const token = localStorage.getItem('token');
    
    if (token) {
      socketRef.current = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      // Authenticate with token to join user room
      socketRef.current.on('connect', () => {
        console.log('Socket.IO connected for notifications');
        socketRef.current.emit('authenticate', token);
      });

      socketRef.current.on('authenticated', (data) => {
        console.log('Socket.IO authenticated:', data);
      });

      // Listen for new notifications
      socketRef.current.on('notification', (newNotification) => {
        console.log('New notification received:', newNotification);
        setNotifications(prev => [newNotification, ...prev].slice(0, 10));
      });

      // Listen for notification read status updates
      socketRef.current.on('notificationRead', ({ notificationId }) => {
        setNotifications(prev => 
          prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket.IO disconnected');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Refresh when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
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

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // Refresh notifications
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
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
                  onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                  className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-[#9b5de5]/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${!notification.isRead ? 'text-[#9b5de5]' : 'text-gray-500'}`}>
                      {notification.type === 'rsvp' && <i className="ri-calendar-check-line text-xl"></i>}
                      {notification.type === 'certificate' && <i className="ri-award-line text-xl"></i>}
                      {notification.type === 'cohost' && <i className="ri-user-add-line text-xl"></i>}
                      {notification.type === 'event_verification' && <i className="ri-shield-check-line text-xl"></i>}
                      {notification.type === 'host_request' && <i className="ri-user-star-line text-xl"></i>}
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
