// components/RecentNotifications.jsx
import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getNotifications, markAllNotificationsAsRead } from '../api';

const RecentNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(20);
      setNotifications(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkAll = async () => {
    await markAllNotificationsAsRead();
    load();
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Recent Notifications
        </h3>
        <button
          onClick={handleMarkAll}
          className="text-sm text-[#9b5de5] hover:underline"
        >
          Mark all as read
        </button>
      </div>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <ul className="space-y-2">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <li
                key={n._id}
                className={`px-4 py-2 rounded-lg shadow-sm border ${
                  n.isRead
                    ? 'bg-gray-800/60 text-gray-200 border-gray-700/60'
                    : 'bg-[#9b5de5]/20 text-white border-[#9b5de5]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{n.message}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))
          ) : (
            <p className="text-gray-500">No notifications available.</p>
          )}
        </ul>
      )}
    </div>
  );
};

export default RecentNotifications;
