// src/userdashboard/UserDashboard.jsx
import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Sidebar from "../userdashboard/sidebar";
import TopNav from "../userdashboard/TopNav";
import StatsPanel from "../userdashboard/StatsPanel";
import Achievements from "../userdashboard/Achivements"; // ✅ Corrected spelling
import AssociatedColleges from "../userdashboard/AssociatedColleges";
import RecentNotifications from "../userdashboard/RecentNotifications";

const UserDashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-xl">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Top Navigation */}
        <TopNav />

        {/* Welcome Section */}
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">
            Welcome, {user.name} 👋
          </h1>
          <p className="text-gray-600 text-sm">
            Manage your events, track your achievements, and stay connected with your peers.
          </p>
        </div>

        {/* Stats Panel */}
        <StatsPanel user={user} />

        {/* Achievements */}
        <Achievements achievements={user.achievements} />

        {/* Associated Colleges */}
        <AssociatedColleges colleges={user.associatedColleges} />

        {/* Notifications */}
        <RecentNotifications notifications={user.notifications} />
      </div>
    </div>
  );
};

export default UserDashboard;
