import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";

const HostTeamControl = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member",
    message: ""
  });

  useEffect(() => {
    // Mock team data - replace with actual API call
    const mockTeamMembers = [
      {
        id: "tm_1",
        name: "Jennifer Davis",
        email: "jennifer.davis@campverse.com",
        avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20woman%20blonde&width=100&height=100&seq=1",
        role: "admin",
        status: "active",
        joinedDate: "2024-01-15T00:00:00Z",
        lastActive: "2025-06-12T14:30:00Z",
        permissions: ["events", "applications", "analytics", "team"],
        eventsManaged: 8
      },
      {
        id: "tm_2",
        name: "Michael Rodriguez",
        email: "michael.rodriguez@campverse.com",
        avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20man%20hispanic&width=100&height=100&seq=2",
        role: "moderator",
        status: "active",
        joinedDate: "2024-03-20T00:00:00Z",
        lastActive: "2025-06-12T10:15:00Z",
        permissions: ["events", "applications"],
        eventsManaged: 5
      },
      {
        id: "tm_3",
        name: "Sarah Chen",
        email: "sarah.chen@campverse.com",
        avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20asian%20woman&width=100&height=100&seq=3",
        role: "member",
        status: "active",
        joinedDate: "2024-05-10T00:00:00Z",
        lastActive: "2025-06-11T16:45:00Z",
        permissions: ["events"],
        eventsManaged: 2
      },
      {
        id: "tm_4",
        name: "David Kim",
        email: "david.kim@campverse.com",
        avatar: "https://readdy.ai/api/search-image?query=professional%20portrait%20korean%20man&width=100&height=100&seq=4",
        role: "member",
        status: "invited",
        joinedDate: "2025-06-10T00:00:00Z",
        lastActive: null,
        permissions: ["events"],
        eventsManaged: 0
      }
    ];
    
    setTimeout(() => {
      setTeamMembers(mockTeamMembers);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleConfig = (role) => {
    const roleConfigs = {
      admin: { bg: "bg-red-500/20", text: "text-red-400", label: "Admin" },
      moderator: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Moderator" },
      member: { bg: "bg-green-500/20", text: "text-green-400", label: "Member" }
    };
    return roleConfigs[role] || roleConfigs.member;
  };

  const getStatusConfig = (status) => {
    const statusConfigs = {
      active: { bg: "bg-green-500/20", text: "text-green-400", label: "Active", icon: "ri-check-line" },
      invited: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Invited", icon: "ri-mail-line" },
      suspended: { bg: "bg-red-500/20", text: "text-red-400", label: "Suspended", icon: "ri-pause-line" }
    };
    return statusConfigs[status] || statusConfigs.active;
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add new member to list
      const newMember = {
        id: `tm_${Date.now()}`,
        name: inviteForm.email.split('@')[0],
        email: inviteForm.email,
        avatar: "https://readdy.ai/api/search-image?query=default%20avatar&width=100&height=100&seq=5",
        role: inviteForm.role,
        status: "invited",
        joinedDate: new Date().toISOString(),
        lastActive: null,
        permissions: inviteForm.role === "admin" ? ["events", "applications", "analytics", "team"] : 
                    inviteForm.role === "moderator" ? ["events", "applications"] : ["events"],
        eventsManaged: 0
      };
      
      setTeamMembers(prev => [...prev, newMember]);
      setShowInviteModal(false);
      setInviteForm({ email: "", role: "member", message: "" });
    } catch (error) {
      // Invite failed - silently ignore
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (memberId, newRole) => {
    setTeamMembers(prev =>
      prev.map(member =>
        member.id === memberId
          ? { 
              ...member, 
              role: newRole,
              permissions: newRole === "admin" ? ["events", "applications", "analytics", "team"] : 
                          newRole === "moderator" ? ["events", "applications"] : ["events"]
            }
          : member
      )
    );
  };

  const stats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.status === "active").length,
    pendingInvites: teamMembers.filter(m => m.status === "invited").length,
    totalEvents: teamMembers.reduce((sum, m) => sum + m.eventsManaged, 0)
  };

  if (loading && teamMembers.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
          <p className="text-gray-300">Loading team...</p>
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
                Team Control
              </h1>
              <p className="text-gray-300 mt-1">Manage your team members and their permissions</p>
            </div>
            
            <button 
              onClick={() => setShowInviteModal(true)}
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all hover:shadow-[0_0_15px_rgba(155,93,229,0.35)]"
            >
              <i className="ri-user-add-line text-lg"></i>
              Invite Member
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Members", count: stats.totalMembers, icon: "ri-team-line", color: "bg-[#9b5de5]/20 text-[#d9c4ff]" },
              { label: "Active Members", count: stats.activeMembers, icon: "ri-user-line", color: "bg-green-500/20 text-green-400" },
              { label: "Pending Invites", count: stats.pendingInvites, icon: "ri-mail-line", color: "bg-yellow-500/20 text-yellow-400" },
              { label: "Events Managed", count: stats.totalEvents, icon: "ri-calendar-event-line", color: "bg-blue-500/20 text-blue-400" }
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

          {/* Team Members Table */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Team Members</h2>
            </div>
            
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-700/60 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-team-line text-2xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No team members found</h3>
                <p className="text-gray-400">
                  {searchQuery ? "Try adjusting your search terms" : "Invite your first team member to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Member</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Role</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Events</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium text-sm">Last Active</th>
                      <th className="text-right py-4 px-6 text-gray-300 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member, index) => (
                      <tr key={member.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${index === filteredMembers.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              {member.status === "active" && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-gray-800"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">{member.name}</div>
                              <div className="text-sm text-gray-400">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className={`${getRoleConfig(member.role).bg} ${getRoleConfig(member.role).text} text-xs px-3 py-1 rounded-full font-medium bg-transparent border-none outline-none cursor-pointer`}
                            disabled={member.id === user?.id}
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`${getStatusConfig(member.status).bg} ${getStatusConfig(member.status).text} text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 w-fit`}>
                            <i className={getStatusConfig(member.status).icon}></i>
                            {getStatusConfig(member.status).label}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-white font-medium">{member.eventsManaged}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-300">
                            {member.lastActive ? (
                              <>
                                <div>{new Date(member.lastActive).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(member.lastActive).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500">Never</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                              title="View Permissions"
                            >
                              <i className="ri-key-line"></i>
                            </button>
                            <button 
                              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                              title="Send Message"
                            >
                              <i className="ri-message-line"></i>
                            </button>
                            {member.id !== user?.id && (
                              <button 
                                className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-500/20"
                                title="Remove Member"
                              >
                                <i className="ri-user-unfollow-line"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[#9b5de5] outline-none"
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[#9b5de5] outline-none"
                >
                  <option value="member">Member - Can manage events</option>
                  <option value="moderator">Moderator - Can manage events and applications</option>
                  <option value="admin">Admin - Full access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message (Optional)</label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-[#9b5de5] outline-none"
                  rows={3}
                  placeholder="Add a personal message..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostTeamControl;