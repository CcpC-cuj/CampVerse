import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import HostEventCard from "./HostEventCard";

const HostEvents = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockEvents = [
      {
        id: "evt_1",
        title: "Annual Tech Symposium 2025",
        description: "A comprehensive technology symposium featuring the latest innovations",
        date: "2025-06-15T09:00:00Z",
        status: "active",
        registrations: 312,
        maxRegistrations: 500,
        venue: "Memorial Auditorium",
        category: "Technology",
        cover: "https://readdy.ai/api/search-image?query=tech%20symposium%20modern%20auditorium&width=400&height=200&seq=1",
        tags: ["Technology", "Innovation", "Networking"]
      },
      {
        id: "evt_2",
        title: "Summer Hackathon 2025",
        description: "48-hour coding marathon for innovative solutions",
        date: "2025-07-08T10:00:00Z",
        status: "upcoming",
        registrations: 156,
        maxRegistrations: 200,
        venue: "Engineering Quad",
        category: "Programming",
        cover: "https://readdy.ai/api/search-image?query=hackathon%20coding%20event&width=400&height=200&seq=2",
        tags: ["Programming", "Innovation", "Competition"]
      },
      {
        id: "evt_3",
        title: "International Cultural Festival",
        description: "Celebrating diversity and cultural exchange",
        date: "2025-08-05T11:00:00Z",
        status: "draft",
        registrations: 89,
        maxRegistrations: 400,
        venue: "Main Quad",
        category: "Cultural",
        cover: "https://readdy.ai/api/search-image?query=cultural%20festival%20colorful&width=400&height=200&seq=3",
        tags: ["Culture", "International", "Diversity"]
      },
      {
        id: "evt_4",
        title: "AI & Machine Learning Workshop",
        description: "Deep dive into artificial intelligence and ML concepts",
        date: "2025-05-20T14:00:00Z",
        status: "past",
        registrations: 95,
        maxRegistrations: 100,
        venue: "Computer Science Building",
        category: "Technology",
        cover: "https://readdy.ai/api/search-image?query=AI%20machine%20learning%20workshop&width=400&height=200&seq=4",
        tags: ["AI", "Machine Learning", "Technology"]
      }
    ];
    
    setTimeout(() => {
      setEvents(mockEvents);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === "all") return matchesSearch;
    if (selectedTab === "active") return matchesSearch && event.status === "active";
    if (selectedTab === "upcoming") return matchesSearch && event.status === "upcoming";
    if (selectedTab === "draft") return matchesSearch && event.status === "draft";
    if (selectedTab === "past") return matchesSearch && event.status === "past";
    
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: "bg-green-500/20", text: "text-green-400", label: "Active" },
      upcoming: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Upcoming" },
      draft: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Draft" },
      past: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Past" }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`${config.bg} ${config.text} text-xs px-2 py-1 rounded-full font-medium`}>
        {config.label}
      </span>
    );
  };

  const stats = {
    total: events.length,
    active: events.filter(e => e.status === "active").length,
    upcoming: events.filter(e => e.status === "upcoming").length,
    draft: events.filter(e => e.status === "draft").length,
    past: events.filter(e => e.status === "past").length
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
          <p className="text-gray-300">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-[#0b0f2b] z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 sm:translate-x-0 border-r border-gray-800`}>
        <HostSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        {/* Top Navigation */}
        <HostNavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={events}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ textShadow: "0 0 8px rgba(155, 93, 229, 0.35)" }}>
                Event Management
              </h1>
              <p className="text-gray-300 mt-1">Create, manage, and track all your events</p>
            </div>
            
            <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all hover:shadow-[0_0_15px_rgba(155,93,229,0.35)]">
              <i className="ri-add-line text-lg"></i>
              Create New Event
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Events", count: stats.total, icon: "ri-calendar-line", color: "bg-[#9b5de5]/20 text-[#d9c4ff]" },
              { label: "Active", count: stats.active, icon: "ri-play-circle-line", color: "bg-green-500/20 text-green-400" },
              { label: "Upcoming", count: stats.upcoming, icon: "ri-time-line", color: "bg-blue-500/20 text-blue-400" },
              { label: "Drafts", count: stats.draft, icon: "ri-draft-line", color: "bg-yellow-500/20 text-yellow-400" },
              { label: "Past", count: stats.past, icon: "ri-history-line", color: "bg-gray-500/20 text-gray-400" }
            ].map((stat, index) => (
              <div key={index} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40 hover:border-[#9b5de5]/30 transition-all">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <i className={`${stat.icon} text-lg`}></i>
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
                <div className="text-xl font-bold">{stat.count}</div>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: "all", label: "All Events", count: stats.total },
              { id: "active", label: "Active", count: stats.active },
              { id: "upcoming", label: "Upcoming", count: stats.upcoming },
              { id: "draft", label: "Drafts", count: stats.draft },
              { id: "past", label: "Past", count: stats.past }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedTab === tab.id
                    ? "bg-[#9b5de5] text-white"
                    : "bg-gray-800/60 text-gray-300 hover:bg-gray-800/80"
                }`}
              >
                {tab.label}
                <span className="bg-gray-700/60 text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-700/60 flex items-center justify-center mx-auto mb-4">
                <i className="ri-calendar-line text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No events found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery ? "Try adjusting your search terms" : "Start by creating your first event"}
              </p>
              <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg font-medium transition-all">
                Create Your First Event
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <div key={event.id} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden hover:border-[#9b5de5]/30 transition-all group">
                  {/* Event Image */}
                  <div className="h-48 bg-gray-700 relative overflow-hidden">
                    <img 
                      src={event.cover} 
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="absolute top-3 left-3">
                      <div className="bg-gray-900/70 text-white text-xs px-2 py-1 rounded-full">
                        {event.category}
                      </div>
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#9b5de5] transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-400 text-sm">
                        <i className="ri-calendar-line mr-2"></i>
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center text-gray-400 text-sm">
                        <i className="ri-map-pin-line mr-2"></i>
                        {event.venue}
                      </div>
                      <div className="flex items-center text-gray-400 text-sm">
                        <i className="ri-user-line mr-2"></i>
                        {event.registrations} / {event.maxRegistrations} registered
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {event.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="bg-[#9b5de5]/20 text-[#d9c4ff] text-xs px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50">
                          <i className="ri-edit-line"></i>
                        </button>
                        <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50">
                          <i className="ri-eye-line"></i>
                        </button>
                        <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50">
                          <i className="ri-share-line"></i>
                        </button>
                      </div>
                      <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50">
                        <i className="ri-more-2-fill"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostEvents;