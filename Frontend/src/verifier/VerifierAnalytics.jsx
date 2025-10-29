import React, { useEffect, useState } from "react";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "../userdashboard/NavBar";
import { getPlatformInsights } from "../api/events";
import { useAuth } from "../contexts/AuthContext";

export default function VerifierAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await getPlatformInsights();
        setAnalytics(res?.data || null);
      } catch {
        setAnalytics(null);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  return (
    <div className="h-screen bg-[#141a45] text-white font-poppins">
      <div className="flex h-screen">
        <Sidebar user={user} roles={user?.roles} activeRole="verifier" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <NavBar user={user} />
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto py-10 px-4">
              <h2 className="text-3xl font-bold mb-8 text-white" style={{textShadow: "0 0 8px rgba(155, 93, 229, 0.35)"}}>
                Verifier Analytics
              </h2>
              <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/40 mb-8">
                <h3 className="text-2xl font-semibold mb-6 text-[#9b5de5]">Your Analytics</h3>
                {loading ? (
                  <div className="flex items-center gap-3 text-gray-300">
                    <i className="ri-loader-4-line animate-spin text-2xl text-[#9b5de5]" />
                    <span>Loading analytics...</span>
                  </div>
                ) : !analytics ? (
                  <div className="text-gray-400 text-lg">No analytics data available.</div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Analytics content */}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
