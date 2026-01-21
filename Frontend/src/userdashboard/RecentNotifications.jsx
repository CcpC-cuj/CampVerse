// components/RecentNotifications.jsx
import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../api';
import { useSocket } from '../hooks/useSocket';

const RecentNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useSocket();

  const load = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(20);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const socket = socketRef.current;
    if (!socket) return;

    const handleConnect = () => {
      const token = localStorage.getItem('token');
      if (token) {
        socket.emit('authenticate', token);
      }
    };

    const handleNotification = (newNotification) => {
      setNotifications(prev => [newNotification, ...prev].slice(0, 20));
    };

    const handleNotificationRead = ({ notificationId }) => {
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    };

    const handleAllNotificationsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    socket.on('connect', handleConnect);
    socket.on('notification', handleNotification);
    socket.on('notificationRead', handleNotificationRead);
    socket.on('allNotificationsRead', handleAllNotificationsRead);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('notification', handleNotification);
      socket.off('notificationRead', handleNotificationRead);
      socket.off('allNotificationsRead', handleAllNotificationsRead);
    };
  }, [socketRef]);

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsAsRead();
      load();
    } catch (error) {
      // Failed to mark all as read - silently ignore
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      load();
    } catch (error) {
      // Failed to mark notification as read - silently ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Recent Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-sm text-[#9b5de5] hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-500"></i>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <li
                key={n._id}
                onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                className={`px-4 py-3 rounded-lg shadow-sm border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-gray-800/60 text-gray-200 border-gray-700/60'
                    : 'bg-[#9b5de5]/20 text-white border-[#9b5de5]/30 hover:bg-[#9b5de5]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${!n.isRead ? 'text-[#9b5de5]' : 'text-gray-500'}`}>
                    {n.type === 'rsvp' && <i className="ri-calendar-check-line text-xl"></i>}
                    {n.type === 'certificate' && <i className="ri-award-line text-xl"></i>}
                    {n.type === 'cohost' && <i className="ri-user-add-line text-xl"></i>}
                    {n.type === 'event_verification' && <i className="ri-shield-check-line text-xl"></i>}
                    {n.type === 'host_request' && <i className="ri-user-star-line text-xl"></i>}
                    {!n.type && <i className="ri-notification-3-line text-xl"></i>}
                  </div>
                  <div className="flex-1">
                    <span className={!n.isRead ? 'font-medium' : ''}>{n.message}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {!n.isRead && (
                        <span className="text-xs text-[#9b5de5]">New</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <div className="text-center py-8">
              <i className="ri-notification-off-line text-5xl text-gray-600 mb-2"></i>
              <p className="text-gray-500">No notifications available.</p>
            </div>
          )}
        </ul>
      )}
    </div>
  );
};

export default RecentNotifications;
