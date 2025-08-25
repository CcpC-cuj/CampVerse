import React from "react";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";

const HostApplications = () => {
  return (
    <div className="h-screen flex bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      <div className="hidden sm:block w-64 bg-gray-900">
        <HostSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar onOpenSidebar={() => {}} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-4">Applications & Approvals</h1>
            <p className="text-gray-300">
              Review registrations, move applicants between waitlist/approved/rejected, and send messages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostApplications;
