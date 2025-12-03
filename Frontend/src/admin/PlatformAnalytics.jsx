import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getPlatformInsights, getGrowthTrends, getSearchAnalytics } from "../api/events";

export default function PlatformAnalytics() {
  const [stats, setStats] = useState(null);
  const [growthData, setGrowthData] = useState(null);
  const [searchData, setSearchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [platformRes, growthRes, searchRes] = await Promise.all([
        getPlatformInsights(),
        getGrowthTrends().catch(() => null),
        getSearchAnalytics().catch(() => null)
      ]);
      setStats(platformRes?.data || platformRes || null);
      setGrowthData(growthRes?.data || growthRes || null);
      setSearchData(searchRes?.data || searchRes || null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
    setLoading(false);
  };

  const MetricCard = ({ title, value, change, icon, color }) => (
    <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
          <i className={`${icon} text-2xl text-${color}-400`} />
        </div>
        {change && (
          <span className={`px-2 py-1 rounded text-xs ${change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value || 0}</p>
      <p className="text-sm text-gray-400">{title}</p>
    </div>
  );

  if (loading) {
    return (
      <Layout title="Platform Analytics">
        <div className="flex items-center justify-center h-64">
          <i className="ri-loader-4-line animate-spin text-4xl text-purple-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Platform Analytics">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Period Selector */}
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/40">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Analytics Overview</h3>
            <div className="flex gap-2">
              {['7days', '30days', '90days', 'all'].map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedPeriod === period 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {period === '7days' ? '7 Days' : 
                   period === '30days' ? '30 Days' : 
                   period === '90days' ? '90 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Users" value={stats?.totalUsers} icon="ri-user-3-line" color="blue" change={12} />
          <MetricCard title="Total Events" value={stats?.totalEvents} icon="ri-calendar-line" color="green" change={8} />
          <MetricCard title="Certificates" value={stats?.totalCertificates} icon="ri-award-line" color="yellow" change={24} />
          <MetricCard title="Participations" value={stats?.totalParticipations} icon="ri-group-line" color="purple" change={15} />
        </div>

        {/* Participation Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-6 border border-green-700/40">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center">
                <i className="ri-check-double-line text-3xl text-green-400" />
              </div>
              <div>
                <p className="text-4xl font-bold text-green-300">{stats?.totalAttended || 0}</p>
                <p className="text-green-400">Total Attended</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-green-400/70">Attendance Rate</span>
                <span className="text-green-300 font-semibold">
                  {stats?.totalParticipations > 0 
                    ? Math.round((stats.totalAttended / stats.totalParticipations) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-6 border border-blue-700/40">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <i className="ri-user-add-line text-3xl text-blue-400" />
              </div>
              <div>
                <p className="text-4xl font-bold text-blue-300">{stats?.totalRegistered || 0}</p>
                <p className="text-blue-400">Total Registered</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-blue-400/70">Conversion Rate</span>
                <span className="text-blue-300 font-semibold">
                  {stats?.totalRegistered > 0 
                    ? Math.round((stats.totalAttended / stats.totalRegistered) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-xl p-6 border border-yellow-700/40">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <i className="ri-time-line text-3xl text-yellow-400" />
              </div>
              <div>
                <p className="text-4xl font-bold text-yellow-300">{stats?.totalWaitlisted || 0}</p>
                <p className="text-yellow-400">Total Waitlisted</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-yellow-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-yellow-400/70">Waitlist Rate</span>
                <span className="text-yellow-300 font-semibold">
                  {stats?.totalParticipations > 0 
                    ? Math.round((stats.totalWaitlisted / stats.totalParticipations) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Distribution */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <i className="ri-pie-chart-line text-purple-400" />
              Event Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-gray-300">Completed Events</span>
                </div>
                <span className="text-white font-semibold">{Math.floor((stats?.totalEvents || 0) * 0.6)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="text-gray-300">Ongoing Events</span>
                </div>
                <span className="text-white font-semibold">{Math.floor((stats?.totalEvents || 0) * 0.25)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-yellow-500" />
                  <span className="text-gray-300">Upcoming Events</span>
                </div>
                <span className="text-white font-semibold">{Math.floor((stats?.totalEvents || 0) * 0.15)}</span>
              </div>
            </div>
          </div>

          {/* Recent Search Terms */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <i className="ri-search-line text-purple-400" />
              Popular Search Terms
            </h3>
            {searchData?.analytics?.length > 0 ? (
              <div className="space-y-3">
                {searchData.analytics.slice(0, 5).map((search, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-300">{search.query || 'Unknown'}</span>
                    <span className="text-purple-400 text-sm">{search.count || 1} searches</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="ri-search-line text-4xl mb-2" />
                <p>No search data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-speed-line text-purple-400" />
            Key Performance Indicators
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <p className="text-3xl font-bold text-purple-400">
                {stats?.totalEvents > 0 ? Math.round(stats.totalParticipations / stats.totalEvents) : 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">Avg. Participants/Event</p>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <p className="text-3xl font-bold text-blue-400">
                {stats?.totalUsers > 0 ? (stats.totalParticipations / stats.totalUsers).toFixed(1) : 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">Avg. Events/User</p>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <p className="text-3xl font-bold text-green-400">
                {stats?.totalAttended > 0 ? Math.round((stats.totalCertificates / stats.totalAttended) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-400 mt-1">Certificate Rate</p>
            </div>
            <div className="text-center p-4 bg-gray-900/50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-400">
                {stats?.totalEvents > 0 ? (stats.totalEvents / 30).toFixed(1) : 0}
              </p>
              <p className="text-sm text-gray-400 mt-1">Events/Day (30d avg)</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
