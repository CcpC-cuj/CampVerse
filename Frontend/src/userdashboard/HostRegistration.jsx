import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "./sidebar"; // reuse your dashboard sidebar

const HostRegistration = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email") || "";

  return (
    <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 h-full hidden sm:block">
        <Sidebar />
      </div>

      {/* Page */}
      <div className="flex-1 overflow-y-auto bg-[#141a45] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Host Registration</h1>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 rounded-button bg-gray-800/70 hover:bg-gray-800"
            >
              <i className="ri-arrow-left-line mr-1"></i> Back
            </button>
          </div>

          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <p className="text-gray-300 mb-4">
              (Testing) We’ll use the email below to start your host profile.
            </p>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Email</label>
              <input
                disabled
                value={email}
                className="w-full p-2 rounded bg-gray-900 border border-gray-800 text-gray-400"
              />
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => navigate("/host/dashboard")}
                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-2 rounded-button"
              >
                Go to Host Dashboard
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              (Note) Implement <code>/host/dashboard</code> when you share it; this
              page is already wired to navigate there.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostRegistration;
