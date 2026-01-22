import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { getPlatformInsights } from "../api/events";
import api from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    api: { label: 'API Server', status: 'unknown' },
    mongodb: { label: 'Database', status: 'unknown' },
    ml: { label: 'ML Services', status: 'unknown' },
    payment: { label: 'Payment Gateway', status: 'unknown' },
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadHealth = async () => {
      try {
        const response = await api.get('/health');
        const services = response?.data?.services || {};
        if (!mounted) return;

        setSystemStatus({
          api: { label: 'API Server', status: services.api || 'operational' },
          mongodb: { label: 'Database', status: services.mongodb || 'unknown' },
          ml: { label: 'ML Services', status: services.ml || 'unknown' },
          payment: { label: 'Payment Gateway', status: services.payment || 'maintenance' },
        });
      } catch (error) {
        if (!mounted) return;
        setSystemStatus((prev) => ({
          ...prev,
          api: { ...prev.api, status: 'degraded' },
        }));
      }
    };

    loadHealth();
    const intervalId = setInterval(loadHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const statusStyles = (status) => {
    switch (status) {
      case 'operational':
      case 'connected':
      case 'healthy':
        return { dot: 'bg-green-500', text: 'text-green-400', label: 'Operational' };
      case 'warning':
      case 'partial':
        return { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Partial' };
      case 'maintenance':
      case 'critical':
      case 'degraded':
      case 'disconnected':
      case 'error':
        return { dot: 'bg-red-500', text: 'text-red-400', label: 'Maintenance' };
      case 'disabled':
        return { dot: 'bg-gray-500', text: 'text-gray-400', label: 'Disabled' };
      default:
        return { dot: 'bg-gray-500', text: 'text-gray-400', label: 'Unknown' };
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const insights = await getPlatformInsights();
      setStats(insights?.data || insights || null);
      
      // Mock recent activity - replace with real API when available
      setRecentActivity([
        { type: 'user_signup', message: 'New user registered', time: '5 minutes ago', icon: 'ri-user-add-line', color: 'green' },
        { type: 'event_created', message: 'New event created: Tech Symposium', time: '1 hour ago', icon: 'ri-calendar-line', color: 'blue' },
        { type: 'institution_pending', message: 'Institution verification pending', time: '2 hours ago', icon: 'ri-building-line', color: 'yellow' },
        { type: 'certificate_issued', message: '50 certificates issued for AI Workshop', time: '3 hours ago', icon: 'ri-award-line', color: 'purple' },
      ]);
    } catch (err) {
      // Failed to fetch dashboard data - silently ignore
    }
    setLoading(false);
  };

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <div 
      onClick={onClick}
      className={`bg-gray-800/60 rounded-xl p-6 border border-gray-700/40 hover:shadow-[0_0_20px_rgba(155,93,229,0.2)] transition-all cursor-pointer`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}-400`}>{value || 0}</p>
        </div>
        <div className={`w-14 h-14 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
          <i className={`${icon} text-2xl text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon, color, onClick }) => (
    <button
      onClick={onClick}
      className="w-full bg-gray-800/40 hover:bg-gray-800/60 rounded-xl p-4 border border-gray-700/40 text-left transition-all hover:border-purple-500/50"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg bg-${color}-500/20 flex items-center justify-center flex-shrink-0`}>
          <i className={`${icon} text-xl text-${color}-400`} />
        </div>
        <div>
          <h4 className="font-semibold text-white">{title}</h4>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <i className="ri-arrow-right-s-line text-gray-500 ml-auto" />
      </div>
    </button>
  );

  if (loading) {
    return (
      <Layout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <i className="ri-loader-4-line animate-spin text-4xl text-purple-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-900/60 to-indigo-900/60 rounded-xl p-6 border border-purple-500/30">
          <h2 className="text-xl font-bold text-white mb-2">Welcome to Platform Administration</h2>
          <p className="text-purple-200">Manage users, institutions, events, and monitor platform analytics.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Users" 
            value={stats?.totalUsers} 
            icon="ri-user-3-line" 
            color="blue"
            onClick={() => navigate('/admin/users')}
          />
          <StatCard 
            title="Total Events" 
            value={stats?.totalEvents} 
            icon="ri-calendar-line" 
            color="green"
          />
          <StatCard 
            title="Certificates Issued" 
            value={stats?.totalCertificates} 
            icon="ri-award-line" 
            color="yellow"
          />
          <StatCard 
            title="Total Participations" 
            value={stats?.totalParticipations} 
            icon="ri-group-line" 
            color="purple"
          />
        </div>

        {/* Participation Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-900/30 rounded-xl p-6 border border-green-700/40">
            <div className="flex items-center gap-3">
              <i className="ri-check-double-line text-2xl text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-300">{stats?.totalAttended || 0}</p>
                <p className="text-sm text-green-400">Attended Events</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-900/30 rounded-xl p-6 border border-blue-700/40">
            <div className="flex items-center gap-3">
              <i className="ri-user-add-line text-2xl text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-blue-300">{stats?.totalRegistered || 0}</p>
                <p className="text-sm text-blue-400">Registered</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-900/30 rounded-xl p-6 border border-yellow-700/40">
            <div className="flex items-center gap-3">
              <i className="ri-time-line text-2xl text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-300">{stats?.totalWaitlisted || 0}</p>
                <p className="text-sm text-yellow-400">Waitlisted</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <i className="ri-flashlight-line text-purple-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <QuickActionCard 
                title="User Management" 
                description="View and manage platform users"
                icon="ri-user-settings-line"
                color="blue"
                onClick={() => navigate('/admin/users')}
              />
              <QuickActionCard 
                title="Institution Verification" 
                description="Review pending institution requests"
                icon="ri-building-4-line"
                color="green"
                onClick={() => navigate('/admin/institutions')}
              />
              <QuickActionCard 
                title="Platform Analytics" 
                description="View detailed platform metrics"
                icon="ri-line-chart-line"
                color="purple"
                onClick={() => navigate('/admin/analytics')}
              />
              <QuickActionCard 
                title="Support Tickets" 
                description="Review and resolve user support tickets"
                icon="ri-customer-service-2-line"
                color="blue"
                onClick={() => navigate('/admin/support')}
              />
              <QuickActionCard 
                title="Feedback Management" 
                description="Review user feedback and mark status"
                icon="ri-feedback-line"
                color="green"
                onClick={() => navigate('/admin/feedback')}
              />
              <QuickActionCard 
                title="Admin Tools" 
                description="Advanced analytics & utilities"
                icon="ri-tools-line"
                color="purple"
                onClick={() => navigate('/admin/tools')}
              />
              <QuickActionCard 
                title="System Settings" 
                description="Configure platform settings"
                icon="ri-settings-4-line"
                color="yellow"
                onClick={() => navigate('/admin/settings')}
              />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <i className="ri-history-line text-purple-400" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${activity.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                    <i className={`${activity.icon} text-${activity.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.message}</p>
                    <p className="text-gray-500 text-xs">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-heart-pulse-line text-purple-400" />
            System Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.values(systemStatus).map((service) => {
              const styles = statusStyles(service.status);
              return (
                <div key={service.label} className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-4">
                  <div className={`w-3 h-3 rounded-full ${styles.dot} ${service.status === 'operational' ? 'animate-pulse' : ''}`} />
                  <div>
                    <p className="text-white text-sm font-medium">{service.label}</p>
                    <p className={`${styles.text} text-xs`}>{styles.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
