import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosInstance';
import { useToast } from '../components/Toast';
import ErrorBoundary from '../components/ErrorBoundary';
import { ATTENDANCE_FILTERS, ATTENDANCE_STATUS } from '../constants/statuses';

const BulkAttendance = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState(ATTENDANCE_FILTERS.ALL); // all, attended, not-attended
  const [bulkLoading, setBulkLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, attended: 0, notAttended: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectAllServerLoading, setSelectAllServerLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const initialize = async () => {
      setLoading(true);
      await loadEventDetails();
      await loadParticipants(page, pageSize, true);
      setLoading(false);
    };

    initialize();
  }, [eventId, user]);

  useEffect(() => {
    if (!user) return;
    loadParticipants(page, pageSize);
  }, [page, pageSize]);

  const loadEventDetails = async () => {
    try {
      const eventResponse = await api.get(`/api/events/${eventId}`);
      const eventData = eventResponse.data;

      if (eventData.success) {
        setEvent(eventData.data);
        const isHost = eventData.data.hostId === user.id;
        const isCoHost = eventData.data.coHosts?.some(ch => ch._id === user.id);
        if (!isHost && !isCoHost) {
          toast.error('You do not have permission to mark attendance for this event.');
          navigate('/host/manage-events');
          return;
        }
      }
    } catch (err) {
      toast.error('Failed to load event details.');
    }
  };

  const loadParticipants = async (pageNumber = page, limit = pageSize, isInitial = false) => {
    try {
      if (!isInitial) setParticipantsLoading(true);

      const participantsResponse = await api.get(`/api/events/${eventId}/participants`, {
        params: { page: pageNumber, limit },
      });
      const participantsData = participantsResponse.data;

      let participantsList = [];
      if (participantsData?.participants) {
        participantsList = participantsData.participants;
        setTotalParticipants(participantsData.total || participantsList.length);
        setTotalPages(participantsData.totalPages || 1);
        if (participantsData.stats) {
          setStats({
            total: participantsData.total || participantsList.length,
            attended: participantsData.stats.attended || 0,
            notAttended: participantsData.stats.notAttended || 0,
          });
        }
      } else if (participantsData.success && participantsData.participants) {
        participantsList = participantsData.participants;
      } else if (participantsData.success && participantsData.data) {
        participantsList = participantsData.data;
      } else if (Array.isArray(participantsData)) {
        participantsList = participantsData;
        setTotalParticipants(participantsList.length);
        setTotalPages(1);
      }

      setParticipants(participantsList);
    } catch (err) {
      toast.error('Failed to load participants.');
    } finally {
      setParticipantsLoading(false);
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

  const selectPage = () => {
    const notAttendedUsers = filteredParticipants
      .filter(p => !p.attended && p.status !== ATTENDANCE_STATUS.ATTENDED)
      .map(p => p.userId?._id || p.userId)
      .filter(Boolean);
    setSelectedUsers(new Set(notAttendedUsers));
  };

  const deselectAll = () => {
    setSelectedUsers(new Set());
  };

  const selectAllServer = async () => {
    try {
      setSelectAllServerLoading(true);
      const ids = new Set();
      const limit = 200;
      const pagesToFetch = Math.max(
        1,
        Math.ceil((totalParticipants || totalPages * pageSize || 1) / limit),
      );

      for (let currentPage = 1; currentPage <= pagesToFetch; currentPage += 1) {
        const response = await api.get(`/api/events/${eventId}/participants`, {
          params: { page: currentPage, limit, mode: 'ids' },
        });
        const data = response.data;
        const pageParticipants = data?.participants || data || [];

        pageParticipants
          .filter((participant) => participant.status !== ATTENDANCE_STATUS.ATTENDED)
          .forEach((participant) => {
            if (participant.userId) ids.add(participant.userId);
          });
      }

      setSelectedUsers(ids);
      toast.info(`Selected ${ids.size} participant(s) across all pages.`);
    } catch (err) {
      toast.error('Failed to select all participants.');
    } finally {
      setSelectAllServerLoading(false);
    }
  };

  const handleBulkMarkAttendance = async () => {
    if (selectedUsers.size === 0) {
      toast.warning('Please select at least one participant.');
      return;
    }
    setConfirmOpen(true);
  };

  const confirmBulkAttendance = async () => {
    setConfirmOpen(false);
    setBulkLoading(true);
    try {
      const response = await api.post(`/api/events/${eventId}/bulk-attendance`, {
        userIds: Array.from(selectedUsers),
      });

      const data = response.data;

      if (data.success) {
        toast.success(`Marked ${data.marked || selectedUsers.size} participant(s) as attended.`);
        setSelectedUsers(new Set());
        await loadParticipants(page, pageSize);
      } else {
        toast.error(data.message || data.error || 'Failed to mark attendance');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredParticipants = useMemo(() => {
    let filtered = participants;

    if (filterStatus === ATTENDANCE_FILTERS.ATTENDED) {
      filtered = filtered.filter(p => p.attended || p.status === ATTENDANCE_STATUS.ATTENDED);
    } else if (filterStatus === ATTENDANCE_FILTERS.NOT_ATTENDED) {
      filtered = filtered.filter(p => !p.attended && p.status !== ATTENDANCE_STATUS.ATTENDED);
    }

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
  }, [participants, filterStatus, searchQuery]);

  const computedStats = useMemo(() => {
    const total = stats.total || totalParticipants || participants.length;
    const attended = stats.attended || participants.filter(p => p.attended || p.status === ATTENDANCE_STATUS.ATTENDED).length;
    const notAttended = stats.notAttended || Math.max(total - attended, 0);
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, attended, notAttended, percentage };
  }, [stats, totalParticipants, participants]);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-linear-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading participants...</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-linear-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] py-8 px-4">
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
            <div className="text-3xl font-bold text-white">{computedStats.total}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-green-500 backdrop-blur-lg rounded-xl p-4">
            <div className="text-green-300 text-sm font-semibold mb-1">Attended</div>
            <div className="text-3xl font-bold text-white">{computedStats.attended}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-red-500 backdrop-blur-lg rounded-xl p-4">
            <div className="text-red-300 text-sm font-semibold mb-1">Not Attended</div>
            <div className="text-3xl font-bold text-white">{computedStats.notAttended}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-purple-500 backdrop-blur-lg rounded-xl p-4">
            <div className="text-purple-300 text-sm font-semibold mb-1">Rate</div>
            <div className="text-3xl font-bold text-white">{computedStats.percentage}%</div>
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email..."
                className="flex-1 px-4 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
              />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white focus:outline-none focus:border-purple-400"
              >
                <option value={ATTENDANCE_FILTERS.ALL}>All Participants</option>
                <option value={ATTENDANCE_FILTERS.ATTENDED}>Attended Only</option>
                <option value={ATTENDANCE_FILTERS.NOT_ATTENDED}>Not Attended Only</option>
              </select>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={selectPage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                ✓ Select Page
              </button>
              <button
                onClick={selectAllServer}
                disabled={selectAllServerLoading}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectAllServerLoading
                    ? 'bg-blue-900/40 text-blue-200 cursor-wait'
                    : 'bg-blue-900 hover:bg-blue-800 text-white'
                }`}
              >
                {selectAllServerLoading ? 'Selecting...' : '✓ Select All (Server)'}
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
            {participantsLoading && (
              <div className="text-center py-4 text-purple-300">Refreshing participants...</div>
            )}
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
                const isAttended = participant.attended || participant.status === ATTENDANCE_STATUS.ATTENDED;

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

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            <div className="text-purple-300 text-sm">
              Showing page {page} of {totalPages} • {totalParticipants} total participants
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  page <= 1 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  page >= totalPages ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >
                Next →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-3 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white focus:outline-none focus:border-purple-400"
              >
                {[25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      </div>

      {selectedUsers.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#151729]/90 backdrop-blur-lg border-t border-purple-600/40 px-4 py-3 z-40">
          <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-purple-200 font-semibold">
              {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} selected
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleBulkMarkAttendance}
                disabled={bulkLoading}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  bulkLoading ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                Mark Attended
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1b1e36] border border-purple-500/40 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-2">Confirm attendance update</h3>
            <p className="text-purple-200 mb-6">
              Mark {selectedUsers.size} participant{selectedUsers.size === 1 ? '' : 's'} as attended?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkAttendance}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

export default BulkAttendance;
