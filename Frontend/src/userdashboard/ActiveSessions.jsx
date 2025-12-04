import React, { useState, useEffect } from 'react';
import { getActiveSessions, revokeSession, revokeAllSessions } from '../api/auth';

/**
 * ActiveSessions Component
 * Displays and manages active user sessions across devices
 */
export default function ActiveSessions({ onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showConfirmAll, setShowConfirmAll] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await getActiveSessions();
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
    setLoading(false);
  };

  const handleRevokeSession = async (sessionId) => {
    if (!confirm('Are you sure you want to end this session? The device will be logged out.')) {
      return;
    }
    
    setActionLoading(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to revoke session:', error);
      alert('Failed to end session. Please try again.');
    }
    setActionLoading(null);
  };

  const handleRevokeAll = async () => {
    setActionLoading('all');
    try {
      await revokeAllSessions(true); // Keep current session
      await loadSessions();
      setShowConfirmAll(false);
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      alert('Failed to end sessions. Please try again.');
    }
    setActionLoading(null);
  };

  const getDeviceIcon = (device, os) => {
    const d = (device + ' ' + os).toLowerCase();
    if (d.includes('iphone') || d.includes('ios')) {
      return <i className="ri-apple-fill text-gray-300" />;
    }
    if (d.includes('android')) {
      return <i className="ri-android-fill text-green-400" />;
    }
    if (d.includes('mac')) {
      return <i className="ri-macbook-line text-gray-300" />;
    }
    if (d.includes('windows')) {
      return <i className="ri-windows-fill text-blue-400" />;
    }
    if (d.includes('linux')) {
      return <i className="ri-ubuntu-fill text-orange-400" />;
    }
    return <i className="ri-computer-line text-gray-400" />;
  };

  const getBrowserIcon = (browser) => {
    const b = browser?.toLowerCase() || '';
    if (b.includes('chrome')) return <i className="ri-chrome-fill text-yellow-400" />;
    if (b.includes('firefox')) return <i className="ri-firefox-fill text-orange-400" />;
    if (b.includes('safari')) return <i className="ri-safari-fill text-blue-400" />;
    if (b.includes('edge')) return <i className="ri-edge-fill text-blue-500" />;
    return <i className="ri-global-line text-gray-400" />;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Active now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCurrentSession = (session) => {
    // Simple heuristic - most recent session is likely current
    // In production, you'd pass session ID from login
    return sessions.indexOf(session) === 0;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f4d] rounded-2xl border border-gray-700/50 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <i className="ri-device-line text-[#9b5de5]" />
              Active Sessions
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Security Alert if multiple sessions */}
        {sessions.length > 1 && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/30 flex items-start gap-3">
            <i className="ri-shield-check-line text-yellow-400 text-xl flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-300 font-medium">Multiple active sessions detected</p>
              <p className="text-yellow-400/80 mt-0.5">
                If you don't recognize a session, revoke it immediately.
              </p>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="overflow-y-auto max-h-[55vh] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-device-line text-5xl text-gray-600 mb-3" />
              <p className="text-gray-400">No active sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isCurrent = isCurrentSession(session);
                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border ${
                      isCurrent
                        ? 'bg-[#9b5de5]/10 border-[#9b5de5]/30'
                        : 'bg-gray-800/40 border-gray-700/40'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Device Icon */}
                      <div className="w-12 h-12 rounded-xl bg-gray-800/60 flex items-center justify-center text-2xl flex-shrink-0">
                        {getDeviceIcon(session.device, session.os)}
                      </div>
                      
                      {/* Session Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium truncate">
                            {session.device}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-xs bg-[#9b5de5] text-white flex-shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            {getBrowserIcon(session.browser)}
                            {session.browser}
                          </span>
                          <span className="flex items-center gap-1">
                            <i className="ri-map-pin-line" />
                            {session.location}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>
                            Started: {new Date(session.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <i className="ri-time-line" />
                            Last active: {formatTime(session.lastActivity)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Revoke Button */}
                      {!isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={actionLoading === session.id}
                          className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                        >
                          {actionLoading === session.id ? (
                            <i className="ri-loader-4-line animate-spin" />
                          ) : (
                            <i className="ri-logout-box-r-line" />
                          )}
                          <span className="hidden sm:inline">End</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {sessions.length > 1 && (
          <div className="p-4 border-t border-gray-700/50">
            {showConfirmAll ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-900/20 border border-red-700/30">
                <p className="text-sm text-red-300">
                  This will log you out from all other devices. Continue?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmAll(false)}
                    className="px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevokeAll}
                    disabled={actionLoading === 'all'}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 text-sm flex items-center gap-1 disabled:opacity-50"
                  >
                    {actionLoading === 'all' ? (
                      <i className="ri-loader-4-line animate-spin" />
                    ) : null}
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmAll(true)}
                className="w-full py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <i className="ri-logout-box-r-line" />
                Sign out from all other devices
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
