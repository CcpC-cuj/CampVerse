import React from "react";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";

const HostEvents = () => {
  return (
    <div className="h-screen flex bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      <div className="hidden sm:block w-64 bg-gray-900">
        <HostSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar onOpenSidebar={() => {}} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-3">Create / Manage Events</h1>
            <p className="text-gray-300">
              Build event pages, set capacity, approvals, ticketing/pricing, and schedules.  
              (Hook this screen to your existing APIs—UI scaffold is ready.)
            </p>
            <div className="mt-4 flex gap-2">
              <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button">
                <i className="ri-add-line mr-1" />
                New Event
              </button>
              <button className="bg-gray-800/70 hover:bg-gray-800 text-white px-4 py-2 rounded-button">
                <i className="ri-upload-2-line mr-1" />
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostEvents;
