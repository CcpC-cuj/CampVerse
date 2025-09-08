import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";

const HostApplications = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("pending");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockApplications = [
      {
        id: "app_1",
        applicant: {
          name: "Emily Morrison",
          email: "emily.morrison@stanford.edu",
          avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20young%20woman&width=100&height=100&seq=1",
          department: "Computer Science",
          year: "3rd Year",
          gpa: "3.8"
        },
        event: "Annual Tech Symposium",
        eventId: "evt_1",
        appliedDate: "2025-06-10T14:30:00Z",
        status: "pending",
        message: "I'm very interested in participating in this symposium as it aligns with my research in AI.",
        experience: "Previous experience in 3 hackathons and 2 tech conferences",
        portfolio: "https://github.com/emily-morrison"
      },
      {
        id: "app_2",
        applicant: {
          name: "Ryan Khatri",
          email: "ryan.khatri@stanford.edu",
          avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20young%20man&width=100&height=100&seq=2",
          department: "Electrical Engineering",
          year: "4th Year",
          gpa: "3.9"
        },
        event: "Summer Hackathon 2025",
        eventId: "evt_2",
        appliedDate: "2025-06-09T09:15:00Z",
        status: "pending",
        message: "Looking forward to collaborating on innovative solutions during this hackathon.",
        experience: "Team lead in university robotics club, 5+ hackathon participations",
        portfolio: "https://ryankhatri.dev"
      },
      {
        id: "app_3",
        applicant: {
          name: "Aisha Zhang",
          email: "aisha.zhang@stanford.edu",
          avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20young%20asian%20woman&width=100&height=100&seq=3",
          department: "International Relations",
          year: "2nd Year",
          gpa: "3.7"
        },
        event: "International Cultural Festival",
        eventId: "evt_3",
        appliedDate: "2025-06-08T16:45:00Z",
        status: "approved",
        message: "As an international student, I would love to contribute to cultural exchange activities.",
        experience: "Cultural ambassador, organized 3 international events",
        portfolio: "https://linkedin.com/in/aisha-zhang"
      },
      {
        id: "app_4",
        applicant: {
          name: "James Rodriguez",
          email: "james.rodriguez@stanford.edu",
          avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20latino%20man&width=100&height=100&seq=4",
          department: "Business School",
          year: "1st Year MBA",
          gpa: "3.6"
        },
        event: "Annual Tech Symposium",
        eventId: "evt_1",
        appliedDate: "2025-06-08T11:20:00Z",
        status: "rejected",
        message: "Interested in the business applications of emerging technologies discussed in the symposium.",
        experience: "5 years industry experience, startup founder",
        portfolio: "https://jamesrodriguez.business"
      },
      {
        id: "app_5",
        applicant: {
          name: "Sophie Chen",
          email: "sophie.chen@stanford.edu",
          avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20asian%20woman%20glasses&width=100&height=100&seq=5",
          department: "Computer Science",
          year: "PhD Candidate",
          gpa: "4.0"
        },
        event: "Summer Hackathon 2025",
        eventId: "evt_2",
        appliedDate: "2025-06-07T13:10:00Z",
        status: "waitlisted",
        message: "PhD research focuses on machine learning applications. Would love to apply my research in practical solutions.",
        experience: "Published 8 research papers, mentor at coding bootcamp",
        portfolio: "https://sophiechen.research.stanford.edu"
      }
    ];
    
    setTimeout(() => {
      setApplications(mockApplications);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicant.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === "all") return matchesSearch;
    return matchesSearch && app.status === selectedTab;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pending", icon: "ri-time-line" },
      approved: { bg: "bg-green-500/20", text: "text-green-400", label: "Approved", icon: "ri-check-line" },
      rejected: { bg: "bg-red-500/20", text: "text-red-400", label: "Rejected", icon: "ri-close-line" },
      waitlisted: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Waitlisted", icon: "ri-pause-line" }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`${config.bg} ${config.text} text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1`}>
        <i className={config.icon}></i>
        {config.label}
      </span>
    );
  };

  const handleStatusChange = (applicationId, newStatus) => {
    setApplications(prev => 
      prev.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      )
    );
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    approved: applications.filter(a => a.status === "approved").length,
    rejected: applications.filter(a => a.status === "rejected").length,
    waitlisted: applications.filter(a => a.status === "waitlisted").length
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
          <p className="text-gray-300">Loading applications...</p>
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
                Applications Management
              </h1>
              <p className="text-gray-300 mt-1">Review and manage event applications from participants</p>
            </div>
            
            <div className="flex gap-3">
              <button className="bg-gray-800/60 hover:bg-gray-800/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-700">
                <i className="ri-download-line"></i>
                Export
              </button>
              <button className="bg-gray-800/60 hover:bg-gray-800/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-700">
                <i className="ri-filter-line"></i>
                Filter
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Applications", count: stats.total, icon: "ri-file-user-line", color: "bg-[#9b5de5]/20 text-[#d9c4ff]" },
              { label: "Pending Review", count: stats.pending, icon: "ri-time-line", color: "bg-yellow-500/20 text-yellow-400" },
              { label: "Approved", count: stats.approved, icon: "ri-check-line", color: "bg-green-500/20 text-green-400" },
              { label: "Waitlisted", count: stats.waitlisted, icon: "ri-pause-line", color: "bg-blue-500/20 text-blue-400" },
              { label: "Rejected", count: stats.rejected, icon: "ri-close-line", color: "bg-red-500/20 text-red-400" }
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
              { id: "all", label: "All Applications", count: stats.total },
              { id: "pending", label: "Pending", count: stats.pending },
              { id: "approved", label: "Approved", count: stats.approved },
              { id: "waitlisted", label: "Waitlisted", count: stats.waitlisted },
              { id: "rejected", label: "Rejected", count: stats.rejected }
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

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-700/60 flex items-center justify-center mx-auto mb-4">
                <i className="ri-file-user-line text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No applications found</h3>
              <p className="text-gray-400">
                {searchQuery ? "Try adjusting your search terms" : "No applications match the selected filter"}
              </p>
            </div>
          ) : (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Applicant</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Event</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Applied Date</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Status</th>
                      <th className="text-right py-4 px-6 text-gray-300 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((application, index) => (
                      <tr key={application.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${index === filteredApplications.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-4">
                            <img
                              src={application.applicant.avatar}
                              alt={application.applicant.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium text-white">{application.applicant.name}</div>
                              <div className="text-sm text-gray-400">{application.applicant.email}</div>
                              <div className="text-xs text-gray-500">
                                {application.applicant.department} • {application.applicant.year} • GPA: {application.applicant.gpa}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-white">{application.event}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-300">
                            {new Date(application.appliedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(application.appliedDate).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(application.status)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                              title="View Details"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            {application.status === "pending" && (
                              <>
                                <button 
                                  onClick={() => handleStatusChange(application.id, "approved")}
                                  className="text-green-400 hover:text-green-300 transition-colors p-2 rounded-lg hover:bg-green-500/20"
                                  title="Approve"
                                >
                                  <i className="ri-check-line"></i>
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(application.id, "waitlisted")}
                                  className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-500/20"
                                  title="Waitlist"
                                >
                                  <i className="ri-pause-line"></i>
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(application.id, "rejected")}
                                  className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-500/20"
                                  title="Reject"
                                >
                                  <i className="ri-close-line"></i>
                                </button>
                              </>
                            )}
                            <button 
                              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                              title="More Options"
                            >
                              <i className="ri-more-2-fill"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostApplications;