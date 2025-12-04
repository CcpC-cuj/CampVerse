import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "./sidebar";
import { 
  getInstitutionById, 
  getInstitutionMembers, 
  getInstitutionEvents,
  getInstitutionAnalytics 
} from "../api/institution";
import GradientCircularProgress from "../components/GradientCircularProgress";

const MyInstitution = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("events");
  const [eventFilter, setEventFilter] = useState("upcoming");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const institutionId = user?.institutionId;

  useEffect(() => {
    if (!institutionId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get institution ID as string
        const instId = typeof institutionId === 'object' && institutionId._id 
          ? institutionId._id 
          : String(institutionId);

        const [instData, membersData, eventsData, analyticsData] = await Promise.all([
          getInstitutionById(instId),
          getInstitutionMembers ? getInstitutionMembers(instId, 1, 20).catch(() => ({ members: [] })) : Promise.resolve({ members: [] }),
          getInstitutionEvents ? getInstitutionEvents(instId, 1, 10, eventFilter).catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
          getInstitutionAnalytics ? getInstitutionAnalytics(instId).catch(() => ({})) : Promise.resolve({})
        ]);

        if (instData.error) {
          setError(instData.error);
        } else {
          setInstitution(instData);
        }
        
        setMembers(membersData?.members || []);
        setEvents(eventsData?.events || []);
        setAnalytics(analyticsData || {});
      } catch (err) {
        setError("Failed to load institution data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [institutionId, eventFilter]);

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  // No institution linked
  if (!institutionId) {
    return (
      <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 sm:translate-x-0`}>
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto bg-[#141a45] p-4 sm:p-6 flex flex-col">
          {/* Mobile Header with Hamburger */}
          <div className="sm:hidden flex items-center justify-between mb-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-gray-800/60 text-white hover:bg-gray-700 transition-colors"
            >
              <i className="ri-menu-line text-xl"></i>
            </button>
            <h1 className="text-lg font-bold">My Institution</h1>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-lg w-full bg-gray-800/60 border border-gray-700 rounded-xl p-8 text-center">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-building-2-line text-purple-400 text-4xl"></i>
              </div>
              <h2 className="text-2xl font-bold mb-3">No Institution Linked</h2>
              <p className="text-gray-300 mb-6">
                You haven't linked your account to an institution yet. Link your institution to see events and connect with other students from your college.
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-2 rounded-lg transition-colors"
              >
                <i className="ri-link mr-2"></i>
                Link Institution
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 sm:translate-x-0`}>
          <Sidebar />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <GradientCircularProgress />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 sm:translate-x-0`}>
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto bg-[#141a45] p-4 sm:p-6 flex flex-col">
          {/* Mobile Header with Hamburger */}
          <div className="sm:hidden flex items-center justify-between mb-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-gray-800/60 text-white hover:bg-gray-700 transition-colors"
            >
              <i className="ri-menu-line text-xl"></i>
            </button>
            <h1 className="text-lg font-bold">My Institution</h1>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-400">
              <i className="ri-error-warning-line text-4xl mb-2"></i>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 sm:translate-x-0`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#141a45] p-4 sm:p-6">
        {/* Mobile Header with Hamburger */}
        <div className="sm:hidden flex items-center justify-between mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-gray-800/60 text-white hover:bg-gray-700 transition-colors"
          >
            <i className="ri-menu-line text-xl"></i>
          </button>
          <h1 className="text-lg font-bold">My Institution</h1>
          <div className="w-10"></div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-[#9b5de5]/20 rounded-xl flex items-center justify-center">
                <i className="ri-building-2-fill text-[#9b5de5] text-3xl"></i>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{institution?.name || "My Institution"}</h1>
                  {institution?.isVerified && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <i className="ri-verified-badge-fill"></i> Verified
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm capitalize">{institution?.type || "Institution"}</p>
                {institution?.location && (
                  <p className="text-gray-500 text-sm mt-1">
                    <i className="ri-map-pin-line mr-1"></i>
                    {[institution.location.city, institution.location.state, institution.location.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#9b5de5]">{analytics?.studentCount || 0}</div>
                <div className="text-xs text-gray-400">Students</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{analytics?.eventCount || 0}</div>
                <div className="text-xs text-gray-400">Total Events</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {events.filter(e => e.isUpcoming).length}
                </div>
                <div className="text-xs text-gray-400">Upcoming</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{members.length}</div>
                <div className="text-xs text-gray-400">Active Members</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("events")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "events"
                  ? "bg-[#9b5de5] text-white"
                  : "bg-gray-800/60 text-gray-400 hover:bg-gray-800"
              }`}
            >
              <i className="ri-calendar-event-line mr-2"></i>
              Events
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "members"
                  ? "bg-[#9b5de5] text-white"
                  : "bg-gray-800/60 text-gray-400 hover:bg-gray-800"
              }`}
            >
              <i className="ri-group-line mr-2"></i>
              Members
            </button>
          </div>

          {/* Events Tab */}
          {activeTab === "events" && (
            <div>
              {/* Filter */}
              <div className="flex gap-2 mb-4">
                {["upcoming", "past", "all"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setEventFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                      eventFilter === filter
                        ? "bg-[#9b5de5]/30 text-[#9b5de5] border border-[#9b5de5]/50"
                        : "bg-gray-800/40 text-gray-400 hover:bg-gray-800/60"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Events List */}
              {events.length === 0 ? (
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-8 text-center">
                  <i className="ri-calendar-line text-4xl text-gray-600 mb-2"></i>
                  <p className="text-gray-400">No {eventFilter} events found</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {events.map((event) => (
                    <div
                      key={event._id}
                      onClick={() => handleEventClick(event._id)}
                      className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 cursor-pointer hover:border-[#9b5de5]/50 transition-all"
                    >
                      <div className="flex gap-4">
                        {event.posterImage && (
                          <img
                            src={event.posterImage}
                            alt={event.title}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{event.title}</h3>
                              <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                event.isUpcoming
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {event.isUpcoming ? "Upcoming" : "Past"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                            <span>
                              <i className="ri-calendar-line mr-1"></i>
                              {new Date(event.date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span>
                              <i className="ri-map-pin-line mr-1"></i>
                              {event.location?.venue || "TBA"}
                            </span>
                            <span>
                              <i className="ri-group-line mr-1"></i>
                              {event.registrationCount || 0}/{event.maxParticipants || "∞"}
                            </span>
                            {event.isRegistered && (
                              <span className="text-green-400">
                                <i className="ri-check-line mr-1"></i>
                                Registered
                              </span>
                            )}
                          </div>
                          {event.hostUserId && (
                            <div className="flex items-center gap-2 mt-2">
                              <img
                                src={event.hostUserId.profilePic || "/default-avatar.png"}
                                alt={event.hostUserId.name}
                                className="w-5 h-5 rounded-full"
                              />
                              <span className="text-xs text-gray-500">
                                Hosted by {event.hostUserId.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <div>
              {members.length === 0 ? (
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-8 text-center">
                  <i className="ri-user-line text-4xl text-gray-600 mb-2"></i>
                  <p className="text-gray-400">No members found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <div
                      key={member._id}
                      className={`bg-gray-800/60 border rounded-xl p-4 ${
                        member.isCurrentUser
                          ? "border-[#9b5de5]/50"
                          : "border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.profilePic || "/default-avatar.png"}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{member.name}</h4>
                            {member.isCurrentUser && (
                              <span className="text-xs bg-[#9b5de5]/20 text-[#9b5de5] px-2 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.roles?.map((role) => (
                              <span
                                key={role}
                                className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded capitalize"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {member.interests?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {member.interests.map((interest, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyInstitution;
