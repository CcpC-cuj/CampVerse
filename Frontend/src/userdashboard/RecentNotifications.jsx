// components/RecentNotifications.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell } from 'lucide-react';

const RecentNotifications = () => {
  const { user } = useAuth();
  const notifications = user?.notifications || [];

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-2 flex items-center">
        <Bell className="w-5 h-5 mr-2" />
        Recent Notifications
      </h3>
      <ul className="space-y-2">
        {notifications.length > 0 ? (
          notifications.map((note, idx) => (
            <li key={idx} className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-sm">
              {note}
            </li>
          ))
        ) : (
          <p className="text-gray-500">No notifications available.</p>
        )}
      </ul>
    </div>
  );
};

export default RecentNotifications;
