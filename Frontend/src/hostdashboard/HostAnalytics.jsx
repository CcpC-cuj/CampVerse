import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";

const HostAnalytics = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock analytics data - replace with actual API call
    const mockAnalytics = {
      overview: {
        totalEvents: 12,
        totalParticipants: 1248,
        totalRevenue: "₹1,25,000",
        avgRating: 4.6,
        completionRate: "86%",
        growthRate: "+24%"
      },
      eventPerformance: [
        { name: "Tech Symposium", participants: 312, revenue: 45000, rating: 4.8, status: "completed" },
        { name: "Summer Hackathon", participants: 156, revenue: 25000, rating: 4.7, status: "ongoing" },
        { name: "Cultural Festival", participants: 89, revenue: 15000, rating: 4.5, status: "upcoming" },
        { name: "AI Workshop", participants: 95, revenue: 20000, rating: 4.9, status: "completed" }
      ],
      registrationTrends: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          { label: "Registrations", data: [45, 78, 125, 89], color: "#9b5de5" },
          { label: "Completions", data: [42, 71, 118, 82], color: "#10b981" }
        ]
      },
      demographicData: {
        departments: [
          { name: "Computer Science", count: 35, percentage: 35 },
          { name: "Engineering", count: 25, percentage: 25 },
          { name: "Business", count: 20, percentage: 20 },
          { name: "Arts", count: 12, percentage: 12 },
          { name: "Others", count: 8, percentage: 8 }
        ],
        yearDistribution: [
          { name: "1st Year", count: 28 },
          { name: "2nd Year", count: 32 },
          { name: "3rd Year", count: 25 },
          { name: "4th Year", count: 15 }
        ]
      },
      recentActivity: [
        { type: "registration", event: "Tech Symposium", user: "Emily Morrison", timestamp: "2 hours ago" },
        { type: "completion", event: "AI Workshop", user: "Ryan Khatri", timestamp: "5 hours ago" },
        { type: "feedback", event: "Cultural Festival", user: "Aisha Zhang", rating: 5, timestamp: "1 day ago" },
        { type: "cancellation", event: "Summer Hackathon", user: "James Rodriguez", timestamp: "2 days ago" }
      ]
    };
    
    setTimeout(() => {
      setAnalytics(mockAnalytics);
      setLoading(false);
    }, 1000);
  }, [selectedPeriod]);

  const getActivityIcon = (type) => {
    switch (type) {
      case "registration": return "ri-user-add-line";
      case "completion": return "ri-check-line";
      case "feedback": return "ri-star-line";
      case "cancellation": return "ri-close-line";
      default: return "ri-information-line";
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "registration": return "text-blue-400";
      case "completion": return "text-green-400";
      case "feedback": return "text-yellow-400";
      case "cancellation": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
          <p className="text-gray-300">Loading analytics...</p>
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
          eventsData={[]}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ textShadow: "0 0 8px rgba(155, 93, 229, 0.35)" }}>
                Analytics Dashboard
              </h1>
              <p className="text-gray-300 mt-1">Monitor your event performance and participant engagement</p>
            </div>
            
            <div className="flex gap-3">
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-gray-800/60 border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#9b5de5] outline-none"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="3months">Last 3 months</option>
                <option value="6months">Last 6 months</option>
                <option value="1year">Last year</option>
              </select>
              <button className="bg-gray-800/60 hover:bg-gray-800/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-700">
                <i className="ri-download-line"></i>
                Export
              </button>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: "Total Events", value: analytics.overview.totalEvents, icon: "ri-calendar-line", color: "bg-[#9b5de5]/20 text-[#d9c4ff]" },
              { label: "Total Participants", value: analytics.overview.totalParticipants, icon: "ri-user-line", color: "bg-blue-500/20 text-blue-400" },
              { label: "Revenue Generated", value: analytics.overview.totalRevenue, icon: "ri-money-dollar-circle-line", color: "bg-green-500/20 text-green-400" },
              { label: "Average Rating", value: analytics.overview.avgRating, icon: "ri-star-line", color: "bg-yellow-500/20 text-yellow-400" },
              { label: "Completion Rate", value: analytics.overview.completionRate, icon: "ri-check-line", color: "bg-teal-500/20 text-teal-400" },
              { label: "Growth Rate", value: analytics.overview.growthRate, icon: "ri-arrow-up-line", color: "bg-emerald-500/20 text-emerald-400" }
            ].map((stat, index) => (
              <div key={index} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40 hover:border-[#9b5de5]/30 transition-all">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <i className={`${stat.icon} text-lg`}></i>
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
                <div className="text-xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Event Performance */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Event Performance</h3>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <i className="ri-more-2-fill"></i>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {analytics.eventPerformance.map((event, index) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          event.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          <i className={`${
                            event.status === 'completed' ? 'ri-check-line' :
                            event.status === 'ongoing' ? 'ri-play-line' :
                            'ri-time-line'
                          } text-lg`}></i>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{event.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>{event.participants} participants</span>
                            <span>₹{event.revenue.toLocaleString()}</span>
                            <div className="flex items-center gap-1">
                              <i className="ri-star-fill text-yellow-400"></i>
                              <span>{event.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        event.status === 'ongoing' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Registration Trends Chart */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Registration Trends</h3>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-more-2-fill"></i>
                </button>
              </div>
              
              {/* Simple Chart Visualization */}
              <div className="space-y-4">
                {analytics.registrationTrends.datasets[0].data.map((value, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{analytics.registrationTrends.labels[index]}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2">
                      <div 
                        className="bg-[#9b5de5] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(value / Math.max(...analytics.registrationTrends.datasets[0].data)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Distribution */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Department Distribution</h3>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-more-2-fill"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                {analytics.demographicData.departments.map((dept, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{dept.name}</span>
                      <span className="text-white font-medium">{dept.count}</span>
                    </div>
                    <div className="w-full bg-gray-700/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-[#9b5de5] to-[#8c4be1] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dept.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Year Distribution */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Year Distribution</h3>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-more-2-fill"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {analytics.demographicData.yearDistribution.map((year, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">{year.count}</div>
                    <div className="text-sm text-gray-400">{year.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <i className="ri-more-2-fill"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                {analytics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      <i className={`${getActivityIcon(activity.type)} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">
                        <span className="font-medium">{activity.user}</span>
                        {activity.type === 'registration' && ' registered for '}
                        {activity.type === 'completion' && ' completed '}
                        {activity.type === 'feedback' && ' rated '}
                        {activity.type === 'cancellation' && ' cancelled registration for '}
                        <span className="text-[#9b5de5]">{activity.event}</span>
                        {activity.rating && (
                          <span className="text-yellow-400 ml-1">({activity.rating}★)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{activity.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostAnalytics;