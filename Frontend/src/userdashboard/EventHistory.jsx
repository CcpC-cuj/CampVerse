import React, { useState, useEffect } from "react";
import Sidebar from "../userdashboard/sidebar";
import { useAuth } from "../contexts/AuthContext";

const EventHistory = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [filterStatus, setFilterStatus] = useState("All");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const staticEventHistory = [
    { id: 1, title: "Hackathon 2023", date: "2023-07-15", status: "Attended" },
    { id: 2, title: "Design Workshop", date: "2023-06-20", status: "Missed" },
    { id: 3, title: "Tech Talk Series", date: "2023-05-10", status: "Attended" },
  ];

  const staticCertificateData = [
    { id: 1, title: "Hackathon 2023 Certificate", issuedDate: "2023-07-20", certificateUrl: "/certificates/hackathon-2023.pdf" },
    { id: 2, title: "Design Workshop Certificate", issuedDate: "2023-06-25", certificateUrl: "" },
  ];

  // Map events to fixed picsum.photos images by ID (picsum IDs chosen arbitrarily but fixed)
  const eventImageMap = {
    1: "1", // nice tech photo from picsum
    2: "20",
    3: "7",
  };

  // Map certificates to fixed picsum.photos images
  const certificateImageMap = {
    1: "1",
    2: "7",
  };

  const [eventHistory, setEventHistory] = useState([]);
  const [certificateData, setCertificateData] = useState([]);

  useEffect(() => {
    const eventsWithImages = staticEventHistory.map(event => ({
      ...event,
      thumbnail: `https://picsum.photos/id/${eventImageMap[event.id]}/200/200`,
    }));

    const certsWithImages = staticCertificateData.map(cert => ({
      ...cert,
      thumbnail: `https://picsum.photos/id/${certificateImageMap[cert.id]}/200/200`,
    }));

    setEventHistory(eventsWithImages);
    setCertificateData(certsWithImages);
  }, []);

  const filteredEvents = eventHistory.filter(event => {
    if (filterStatus !== "All" && event.status !== filterStatus) return false;
    if (dateRange.from && new Date(event.date) < new Date(dateRange.from)) return false;
    if (dateRange.to && new Date(event.date) > new Date(dateRange.to)) return false;
    return true;
  });

  return (
    <div
     style={{ fontFamily: "'Poppins', sans-serif" }} className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0`}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden sm:pl-0 sm:ml-0 sm:w-full">

        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">

          <button
            className="sm:hidden p-2 rounded-lg bg-gray-700 text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <i className="ri-menu-line text-lg"></i>
          </button>

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400 w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search event history..."
              className="bg-gray-700 border-none text-sm rounded-lg block w-full pl-10 p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
            <button className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-white transition-colors" title="Notifications">
              <i className="ri-notification-3-line" />
            </button>
            <button className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-white transition-colors" title="Calendar">
              <i className="ri-calendar-line" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-800 border-b border-gray-700">
          <select
            className="bg-gray-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter events by status"
          >
            <option value="All">All Statuses</option>
            <option value="Attended">Attended</option>
            <option value="Missed">Missed</option>
          </select>

          <input
            type="date"
            className="bg-gray-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            aria-label="Filter events from date"
            placeholder="From"
          />

          <input
            type="date"
            className="bg-gray-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            aria-label="Filter events to date"
            placeholder="To"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-900">

          <h1 className="text-2xl font-bold mb-6">My Event History</h1>

          {filteredEvents.length === 0 ? (
            <p className="text-gray-400">No events found for the selected filters.</p>
          ) : (
            <div className="space-y-4 mb-10">
              {filteredEvents.map(event => (
                <div
                  key={event.id}
                  tabIndex={0}
                  className="bg-gray-800 rounded-lg p-5 flex items-center cursor-pointer transition-shadow border border-gray-700 shadow-md hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <img
                    src={event.thumbnail}
                    alt={`${event.title} thumbnail`}
                    className="w-20 h-20 rounded-md object-cover mr-5 flex-shrink-0"
                    onError={e => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/default-event.jpg";
                    }}
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{event.title}</h2>
                    <p className="text-sm text-gray-400">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.status === "Attended" ? "bg-green-600 text-green-100" : "bg-red-600 text-red-100"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-6">My Certificates</h2>
            {certificateData.length === 0 ? (
              <p className="text-gray-400">No certificates found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {certificateData.map(cert => (
                  <div
                    key={cert.id}
                    className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 border border-gray-700 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    tabIndex={0}
                    onClick={() => cert.certificateUrl && window.open(cert.certificateUrl, "_blank")}
                    role="button"
                    aria-label={`View certificate for ${cert.title}`}
                  >
                    <img
                      src={cert.thumbnail || "/images/default-cert.png"}
                      alt={`${cert.title} thumbnail`}
                      className="w-20 h-20 object-cover rounded-md"
                      loading="lazy"
                      onError={e => {
                        if (e.currentTarget.src !== "/images/default-cert.png") {
                          e.currentTarget.src = "/images/default-cert.png";
                        }
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{cert.title}</h3>
                      <p className="text-gray-400 text-sm">
                        Issued: {new Date(cert.issuedDate).toLocaleDateString()}
                      </p>
                    </div>
                    {cert.certificateUrl && (
                      <button
                        className="bg-primary text-white px-4 py-2 rounded-button hover:bg-blue-600 transition"
                        onClick={e => {
                          e.stopPropagation();
                          window.open(cert.certificateUrl, "_blank");
                        }}
                        aria-label={`Open certificate PDF for ${cert.title}`}
                      >
                        View
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventHistory;
