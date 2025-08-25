import React from "react";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";

const HostSettings = () => {
  return (
    <div className="h-screen flex bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Sidebar (desktop) */}
      <div className="hidden sm:block w-64 bg-gray-900">
        <HostSidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar onOpenSidebar={() => {}} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-4">Host Settings</h1>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Organization Profile</h3>
                <p className="text-sm text-gray-300">
                  Name, logo, description, website.
                </p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Payments & Payouts</h3>
                <p className="text-sm text-gray-300">
                  Bank details, GST, payout schedule.
                </p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Team & Roles</h3>
                <p className="text-sm text-gray-300">
                  Invite teammates and manage permissions.
                </p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Notifications</h3>
                <p className="text-sm text-gray-300">
                  Email/SMS preferences for applications and payments.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-5 py-2 rounded-button">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostSettings;
