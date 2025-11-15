import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BulkAttendance = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, attended, not-attended
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadEventAndParticipants();
  }, [eventId, user]);

  const loadEventAndParticipants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Load event details
      const eventResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const eventData = await eventResponse.json();
      if (eventResponse.ok && eventData.success) {
        setEvent(eventData.data);
        // Check if user is host or co-host
        const isHost = eventData.data.hostId === user.id;
        const isCoHost = eventData.data.coHosts?.some(ch => ch._id === user.id);
        if (!isHost && !isCoHost) {
          alert('⛔ You do not have permission to mark attendance for this event.');
          navigate('/host/manage-events');
          return;
        }
      }

      // Load participants
      const participantsResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const participantsData = await participantsResponse.json();
      if (participantsResponse.ok) {
        // Handle different response formats
        let participantsList = [];
        if (participantsData.success && participantsData.participants) {
          participantsList = participantsData.participants;
        } else if (participantsData.success && participantsData.data) {
          participantsList = participantsData.data;
        } else if (Array.isArray(participantsData)) {
          participantsList = participantsData;
        }
        setParticipants(participantsList);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      alert('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const filtered = getFilteredParticipants();
    const notAttendedUsers = filtered
      .filter(p => !p.attended && p.status !== 'attended')
      .map(p => p.userId?._id || p.userId);
    setSelectedUsers(new Set(notAttendedUsers));
  };

  const deselectAll = () => {
    setSelectedUsers(new Set());
  };

  const handleBulkMarkAttendance = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one participant');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark ${selectedUsers.size} participant(s) as attended?`
    );

    if (!confirmed) return;

    setBulkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/bulk-attendance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userIds: Array.from(selectedUsers),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`✅ Successfully marked ${data.marked || selectedUsers.size} participant(s) as attended!`);
        setSelectedUsers(new Set());
        await loadEventAndParticipants(); // Reload to update attendance status
      } else {
        alert(`❌ ${data.message || data.error || 'Failed to mark attendance'}`);
      }
    } catch (err) {
      console.error('Error marking bulk attendance:', err);
      alert('Failed to mark attendance. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  };

  const getFilteredParticipants = () => {
    let filtered = participants;

    // Filter by status
    if (filterStatus === 'attended') {
      filtered = filtered.filter(p => p.attended);
    } else if (filterStatus === 'not-attended') {
      filtered = filtered.filter(p => !p.attended);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const name = typeof p.userId === 'object' 
          ? p.userId?.name 
          : p.name || p.userName || '';
        const email = typeof p.userId === 'object'
          ? p.userId?.email
          : p.email || p.userEmail || '';
        
        return name.toLowerCase().includes(query) ||
               email.toLowerCase().includes(query);
      });
    }

    return filtered;
  };

  const getStats = () => {
    const total = participants.length;
    const attended = participants.filter(p => p.attended).length;
    const notAttended = total - attended;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, attended, notAttended, percentage };
  };

  const stats = getStats();
  const filteredParticipants = getFilteredParticipants();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading participants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/host/manage-events')}
            className="text-purple-300 hover:text-purple-200 mb-4 flex items-center gap-2"
          >
            ← Back to Events
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">📋 Bulk Attendance Marking</h1>
          <p className="text-purple-300">{event?.title}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[rgba(21,23,41,0.95)] border border-blue-500 backdrop-blur-lg rounded-xl p-4">
            <div className="text-blue-300 text-sm font-semibold mb-1">Total</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-green-500 backdrop-blur-lg rounded-xl p-4">
            <div className="text-green-300 text-sm font-semibold mb-1">Attended</div>
            <div className="text-3xl font-bold text-white">{stats.attended}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-red-500 backdrop-blur-lg rounded-xl p-4">
            <div className="text-red-300 text-sm font-semibold mb-1">Not Attended</div>
            <div className="text-3xl font-bold text-white">{stats.notAttended}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-purple-500 backdrop-blur-lg rounded-xl p-4">
            <div className="text-purple-300 text-sm font-semibold mb-1">Rate</div>
            <div className="text-3xl font-bold text-white">{stats.percentage}%</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
          {/* Controls */}
          <div className="mb-6 space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="flex-1 px-4 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white focus:outline-none focus:border-purple-400"
              >
                <option value="all">All Participants</option>
                <option value="attended">Attended Only</option>
                <option value="not-attended">Not Attended Only</option>
              </select>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                ✓ Select All Not Attended
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
              >
                ✗ Deselect All
              </button>
              <button
                onClick={handleBulkMarkAttendance}
                disabled={selectedUsers.size === 0 || bulkLoading}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedUsers.size === 0 || bulkLoading
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {bulkLoading
                  ? '⏳ Processing...'
                  : `✅ Mark ${selectedUsers.size} as Attended`}
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12 text-purple-300">
                <p className="text-xl mb-2">No participants found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              filteredParticipants.map((participant) => {
                const userId = participant.userId?._id || participant.userId;
                const userName = typeof participant.userId === 'object' 
                  ? participant.userId?.name 
                  : participant.name || participant.userName;
                const userEmail = typeof participant.userId === 'object'
                  ? participant.userId?.email
                  : participant.email || participant.userEmail;
                const isSelected = selectedUsers.has(userId);
                const isAttended = participant.attended || participant.status === 'attended';

                return (
                  <div
                    key={userId}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      isAttended
                        ? 'bg-green-900/20 border-green-500/30'
                        : isSelected
                        ? 'bg-blue-900/30 border-blue-500'
                        : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-400'
                    }`}
                  >
                    {/* Checkbox */}
                    {!isAttended && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUserSelection(userId)}
                        className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    )}

                    {/* User Info */}
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">
                        {userName || 'Unknown'}
                      </h4>
                      <p className="text-purple-300 text-sm">
                        {userEmail || 'N/A'}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="text-right">
                      {isAttended ? (
                        <div>
                          <span className="text-green-400 font-semibold">✅ Attended</span>
                          {participant.scanTime && (
                            <p className="text-green-300 text-xs mt-1">
                              {new Date(participant.scanTime).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-red-400 font-semibold">⏳ Not Attended</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAttendance;
