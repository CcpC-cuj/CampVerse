import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import api from '../api/axiosInstance';

const AttendanceDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    attended: 0,
    notAttended: 0,
    percentage: 0,
  });
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    if (document.visibilityState === 'hidden') {
      return;
    }
    try {
      // Load event details
      const eventResponse = await api.get(`/api/events/${eventId}`);
      const eventData = eventResponse.data;

      if (eventData.success) {
        setEvent(eventData.data);
        // Check permissions
        const hostId = eventData.data.hostUserId?._id || eventData.data.hostUserId?.id || eventData.data.hostUserId;
        const hostEmail = eventData.data.hostUserId?.email;
        const currentUserId = user?.id || user?._id;
        const currentUserEmail = user?.email;
        const isHost = hostId && currentUserId && String(hostId) === String(currentUserId);
        const isCoHost = Array.isArray(eventData.data.coHosts)
          ? eventData.data.coHosts.some(ch => {
              const coHostId = ch?._id || ch?.id || ch;
              const coHostEmail = ch?.email;
              return (
                (coHostId && currentUserId && String(coHostId) === String(currentUserId)) ||
                (coHostEmail && currentUserEmail && String(coHostEmail).toLowerCase() === String(currentUserEmail).toLowerCase())
              );
            })
          : false;
        const isHostByEmail = hostEmail && currentUserEmail
          ? String(hostEmail).toLowerCase() === String(currentUserEmail).toLowerCase()
          : false;
        if (!isHost && !isCoHost && !isHostByEmail) {
          toast.error('You do not have permission to view this dashboard.');
          navigate('/host/manage-events');
          return;
        }
      }

      // Load attendance data
      const attendanceResponse = await api.get(`/api/events/${eventId}/attendance`);
      const attendanceData = attendanceResponse.data;

      if (attendanceData.success) {
        const total = attendanceData.totalRegistered || 0;
        const attended = attendanceData.attendees?.length || 0;
        const notAttended = total - attended;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

        setStats({ total, attended, notAttended, percentage });
        setRecentScans(attendanceData.attendees?.slice(-10).reverse() || []);
      }
    } catch (err) {
      // Failed to load dashboard data - silently ignore
    } finally {
      setLoading(false);
    }
  }, [eventId, navigate, toast, user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();

    // Set up auto-refresh
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, 15000); // Refresh every 15 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [eventId, user, autoRefresh, loadData, navigate]);

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getAttendanceColor = () => {
    if (stats.percentage >= 80) return 'text-green-400';
    if (stats.percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading dashboard...</p>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">📊 Live Attendance Dashboard</h1>
              <p className="text-purple-300">{event?.title}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                🔄 Refresh Now
              </button>
              <button
                onClick={toggleAutoRefresh}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  autoRefresh
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {autoRefresh ? '⚡ Auto-Refresh ON' : '⏸️ Auto-Refresh OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[rgba(21,23,41,0.95)] border border-blue-500 backdrop-blur-lg rounded-xl p-6 transform hover:scale-105 transition-transform">
            <div className="text-blue-300 text-sm font-semibold mb-2">Total Registered</div>
            <div className="text-5xl font-bold text-white">{stats.total}</div>
            <div className="text-blue-200 text-xs mt-2">All participants</div>
          </div>
          
          <div className="bg-[rgba(21,23,41,0.95)] border border-green-500 backdrop-blur-lg rounded-xl p-6 transform hover:scale-105 transition-transform">
            <div className="text-green-300 text-sm font-semibold mb-2">Attended</div>
            <div className="text-5xl font-bold text-white animate-pulse">{stats.attended}</div>
            <div className="text-green-200 text-xs mt-2">Marked present</div>
          </div>
          
          <div className="bg-[rgba(21,23,41,0.95)] border border-red-500 backdrop-blur-lg rounded-xl p-6 transform hover:scale-105 transition-transform">
            <div className="text-red-300 text-sm font-semibold mb-2">Not Attended</div>
            <div className="text-5xl font-bold text-white">{stats.notAttended}</div>
            <div className="text-red-200 text-xs mt-2">Still pending</div>
          </div>
          
          <div className="bg-[rgba(21,23,41,0.95)] border border-purple-500 backdrop-blur-lg rounded-xl p-6 transform hover:scale-105 transition-transform">
            <div className="text-purple-300 text-sm font-semibold mb-2">Attendance Rate</div>
            <div className={`text-5xl font-bold ${getAttendanceColor()}`}>
              {stats.percentage}%
            </div>
            <div className="text-purple-200 text-xs mt-2">Overall rate</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Attendance Progress</h2>
          <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-green-400 h-full flex items-center justify-center text-white font-semibold transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            >
              {stats.percentage > 10 && `${stats.attended} / ${stats.total}`}
            </div>
          </div>
          <div className="flex justify-between text-purple-300 text-sm mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate(`/host/events/${eventId}/qr-scanner`)}
            className="bg-[rgba(21,23,41,0.95)] border border-green-500 backdrop-blur-lg rounded-xl p-6 hover:bg-green-900/20 transition-all text-left"
          >
            <div className="text-4xl mb-3">📷</div>
            <h3 className="text-white font-bold text-lg mb-2">QR Scanner</h3>
            <p className="text-purple-300 text-sm">Scan QR codes to mark attendance</p>
          </button>

          <button
            onClick={() => navigate(`/host/events/${eventId}/bulk-attendance`)}
            className="bg-[rgba(21,23,41,0.95)] border border-blue-500 backdrop-blur-lg rounded-xl p-6 hover:bg-blue-900/20 transition-all text-left"
          >
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-white font-bold text-lg mb-2">Bulk Marking</h3>
            <p className="text-purple-300 text-sm">Mark attendance for multiple users</p>
          </button>

          <button
            onClick={() => navigate(`/host/manage-events`)}
            className="bg-[rgba(21,23,41,0.95)] border border-purple-500 backdrop-blur-lg rounded-xl p-6 hover:bg-purple-900/20 transition-all text-left"
          >
            <div className="text-4xl mb-3">⚙️</div>
            <h3 className="text-white font-bold text-lg mb-2">Event Settings</h3>
            <p className="text-purple-300 text-sm">Manage event details and settings</p>
          </button>
        </div>

        {/* Recent Scans */}
        <div className="bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            ⚡ Recent Check-ins
            {autoRefresh && <span className="text-green-400 text-sm">(Live)</span>}
          </h2>
          
          {recentScans.length === 0 ? (
            <div className="text-center py-12 text-purple-300">
              <div className="text-6xl mb-4">📱</div>
              <p className="text-xl mb-2">No check-ins yet</p>
              <p className="text-sm">Start scanning QR codes to see real-time updates</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div
                  key={scan._id || index}
                  className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400 transition-all animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {typeof scan.userId === 'object' && scan.userId?.profilePhoto ? (
                          <img 
                            src={scan.userId.profilePhoto} 
                            alt="Profile" 
                            className="w-12 h-12 rounded-full object-cover border-2 border-green-500/50"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl text-green-400">✓</span>
                          </div>
                        )}
                        <div className="min-w-0 pr-2">
                          <h4 className="text-white font-semibold text-lg truncate">
                            {typeof scan.userId === 'object' && scan.userId?.name 
                              ? scan.userId.name 
                              : scan.userName || scan.name || 'Unknown User'}
                          </h4>
                          <p className="text-purple-300 text-sm truncate">
                            {typeof scan.userId === 'object' && scan.userId?.email 
                              ? scan.userId.email 
                              : scan.userEmail || scan.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-green-400 font-semibold text-sm">Checked In</div>
                      <div className="text-purple-300 text-xs mt-1">
                        {formatTime(scan.scanTime)}
                      </div>
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

export default AttendanceDashboard;
