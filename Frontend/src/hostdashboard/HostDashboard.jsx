import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import HostEventCard from "./HostEventCard";
// (Optional) import from your api if you already have these; otherwise the mock below will render
// import { getHostDashboard } from "../api";

const HostDashboard = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // --- Replace with your real API calls if available ---
        // const data = await getHostDashboard();
        // if (!mounted) return;
        // setStats(data?.stats || {});
        // setEvents(data?.events || []);

        // Mock so UI works immediately
        if (!mounted) return;
        setStats({
          activeEvents: 3,
          totalRegistrations: 248,
          pendingApprovals: 12,
          revenue: "₹1.25L",
        });
        setEvents([
          {
            id: "evt_1",
            title: "Inter-College Hackathon 2025",
            date: "2025-09-06T10:00:00Z",
            status: "Live",
            registrations: 120,
            cover:
              "https://readdy.ai/api/search-image?query=hackathon%20poster%203D%20purple%20galaxy&width=800&height=400&seq=9",
          },
          {
            id: "evt_2",
            title: "Design Sprint Marathon",
            date: "2025-09-20T09:00:00Z",
            status: "Draft",
            registrations: 0,
            cover:
              "https://readdy.ai/api/search-image?query=design%20sprint%20poster%20purple%20glassmorphism&width=800&height=400&seq=7",
          },
          {
            id: "evt_3",
            title: "AI & Robotics Expo",
            date: "2025-10-02T11:00:00Z",
            status: "Upcoming",
            registrations: 128,
            cover:
              "https://readdy.ai/api/search-image?query=robotics%20expo%20banner%20purple%20neon&width=800&height=400&seq=5",
          },
        ]);
      } catch (e) {
        // fall back to empty
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <i className="ri-loader-4-line animate-spin text-3xl" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0`}
      >
        <HostSidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-[#9b5de5]/20 to-transparent rounded-lg p-6 mb-6 border border-[#9b5de5]/15 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold">
                Host Dashboard{user?.name ? ` — Hi, ${user.name}!` : ""}
              </h1>
              <p className="text-gray-300 mt-1">
                Manage events, approvals, and analytics in one place.
              </p>
            </div>
            <img
              src="https://readdy.ai/api/search-image?query=3D%20dashboard%20host%20galaxy%20purple&width=220&height=180&seq=3&orientation=squarish"
              alt="Host"
              className="w-40 h-36 object-contain"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              {
                icon: "ri-broadcast-fill",
                label: "Active Events",
                value: stats?.activeEvents ?? 0,
                bg: "bg-[#9b5de5]/20",
                text: "text-[#d9c4ff]",
              },
              {
                icon: "ri-team-fill",
                label: "Total Registrations",
                value: stats?.totalRegistrations ?? 0,
                bg: "bg-green-500/20",
                text: "text-green-400",
              },
              {
                icon: "ri-time-fill",
                label: "Pending Approvals",
                value: stats?.pendingApprovals ?? 0,
                bg: "bg-amber-500/20",
                text: "text-amber-400",
              },
              {
                icon: "ri-bank-card-2-fill",
                label: "Revenue",
                value: stats?.revenue ?? "₹0",
                bg: "bg-blue-500/20",
                text: "text-blue-400",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-gray-800/60 rounded-lg p-4 flex items-center border border-gray-700/40 hover:border-[#9b5de5]/30"
              >
                <div
                  className={`w-12 h-12 rounded-lg ${s.bg} flex items-center justify-center ${s.text} mr-4`}
                >
                  <i className={`${s.icon} ri-lg`} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">{s.label}</div>
                  <div className="text-xl font-bold">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Events list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Your Events</h2>
              <button
                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button flex items-center gap-2"
                onClick={() => (window.location.href = "/host/events")}
              >
                <i className="ri-add-line" />
                Create / Manage
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {events.map((e) => (
                <HostEventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
