import React, { useState, useEffect } from 'react';
import { getLoginHistory, getLoginStats } from '../api/auth';

/**
 * LoginHistory Component
 * Displays user's login history with device/location info
 */
export default function LoginHistory({ onClose }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'success', 'failed'
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadData();
  }, [filter, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        getLoginHistory({ 
          limit, 
          skip: page * limit, 
          status: filter === 'all' ? null : filter 
        }),
        getLoginStats(30)
      ]);
      
      setHistory(historyRes.history || []);
      setStats(statsRes.stats || null);
    } catch (error) {
      // Failed to load login history - silently ignore
    }
    setLoading(false);
  };

  const getStatusIcon = (status) => {
    if (status === 'success') {
      return <i className="ri-checkbox-circle-fill text-green-400" />;
    }
    return <i className="ri-close-circle-fill text-red-400" />;
  };

  const getDeviceIcon = (device) => {
    const d = device?.toLowerCase() || '';
    if (d.includes('iphone') || d.includes('android') || d.includes('mobile')) {
      return <i className="ri-smartphone-line" />;
    }
    if (d.includes('ipad') || d.includes('tablet')) {
      return <i className="ri-tablet-line" />;
    }
    return <i className="ri-computer-line" />;
  };

  const getAuthMethodBadge = (method) => {
    const colors = {
      email: 'bg-blue-500/20 text-blue-400',
      google: 'bg-red-500/20 text-red-400',
      github: 'bg-gray-500/20 text-gray-300',
      refresh_token: 'bg-purple-500/20 text-purple-400',
      magic_link: 'bg-yellow-500/20 text-yellow-400'
    };
    return colors[method] || 'bg-gray-500/20 text-gray-400';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f4d] rounded-2xl border border-gray-700/50 w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <i className="ri-history-line text-[#9b5de5]" />
              Login History
            </h2>
            <p className="text-sm text-gray-400 mt-1">View your recent login activity</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 p-4 bg-gray-800/30 border-b border-gray-700/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total Logins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.successful}</p>
              <p className="text-xs text-gray-400">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
              <p className="text-xs text-gray-400">Failed</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-700/50">
          {['all', 'success', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[#9b5de5] text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* History List */}
        <div className="overflow-y-auto max-h-[45vh] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-history-line text-5xl text-gray-600 mb-3" />
              <p className="text-gray-400">No login history found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border ${
                    entry.status === 'success'
                      ? 'bg-gray-800/40 border-gray-700/40'
                      : 'bg-red-900/10 border-red-700/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="text-2xl mt-0.5">
                      {getStatusIcon(entry.status)}
                    </div>
                    
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-white font-medium">
                          {entry.status === 'success' ? 'Signed in' : 'Failed login'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getAuthMethodBadge(entry.authMethod)}`}>
                          {entry.authMethod}
                        </span>
                        {entry.failReason && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                            {entry.failReason.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          {getDeviceIcon(entry.device)}
                          {entry.browser} on {entry.os}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-map-pin-line" />
                          {entry.location}
                        </span>
                      </div>
                    </div>
                    
                    {/* Time */}
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                      {formatTime(entry.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {history.length >= limit && (
          <div className="flex justify-center gap-2 p-4 border-t border-gray-700/50">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={history.length < limit}
              className="px-4 py-2 rounded-lg bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
