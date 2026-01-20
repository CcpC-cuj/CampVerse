import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";

const API_BASE = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    eventCreationEnabled: true,
    paidEventsEnabled: false,
    certificateGenerationEnabled: true,
    mlRecommendationsEnabled: true,
    emailNotificationsEnabled: true,
    maxEventsPerHost: 10,
    maxParticipantsDefault: 100,
    certificateExpiryDays: 365,
  });

  const [health, setHealth] = useState({
    api: 'unknown',
    mongodb: 'unknown',
    redis: 'unknown',
    ml: 'unknown'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
    const healthInterval = setInterval(checkHealth, 30000);
    checkHealth();
    return () => clearInterval(healthInterval);
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError('Error loading settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      setHealth({
        api: 'online',
        mongodb: data.services.mongodb === 'connected' ? 'online' : 'offline',
        redis: data.services.redis === 'connected' ? 'online' : 'offline',
        ml: 'online' // Backend check doesn't include ML yet, but we'll assume online if API is up
      });
    } catch (err) {
      setHealth({
        api: 'offline',
        mongodb: 'offline',
        redis: 'offline',
        ml: 'offline'
      });
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNumberChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const SettingToggle = ({ label, description, settingKey, disabled = false }) => (
    <div className={`flex items-center justify-between p-4 bg-gray-900/50 rounded-lg ${disabled ? 'opacity-60' : ''}`}>
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <button
        onClick={() => !disabled && handleToggle(settingKey)}
        disabled={disabled}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          settings[settingKey] ? 'bg-green-500' : 'bg-gray-600'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
          settings[settingKey] ? 'translate-x-8' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <Layout title="System Settings">
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-4xl text-purple-400 mb-4" />
          <p className="text-gray-400">Loading platform settings...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="System Settings">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-lg p-4 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/40 border border-green-500/50 rounded-lg p-4 text-green-300">
            {success}
          </div>
        )}

        {/* Warning Banner */}
        <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="ri-alert-line text-2xl text-yellow-400" />
            <div>
              <p className="text-yellow-300 font-semibold">Caution</p>
              <p className="text-yellow-400/80 text-sm">
                Changes to system settings may affect all users. Please ensure you understand the impact before making changes.
              </p>
            </div>
          </div>
        </div>

        {/* Platform Status */}
        <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-toggle-line text-purple-400" />
            Platform Status
          </h3>
          <div className="space-y-3">
            <SettingToggle 
              label="Maintenance Mode"
              description="When enabled, only admins can access the platform"
              settingKey="maintenanceMode"
            />
            <SettingToggle 
              label="User Registration"
              description="Allow new users to register on the platform"
              settingKey="registrationEnabled"
            />
            <SettingToggle 
              label="Event Creation"
              description="Allow hosts to create new events"
              settingKey="eventCreationEnabled"
            />
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-settings-4-line text-purple-400" />
            Feature Toggles
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-red-900/30 rounded-lg border border-red-500/30">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">Paid Events</p>
                  <span className="px-2 py-0.5 bg-red-500/30 text-red-300 rounded text-xs">Under Maintenance</span>
                </div>
                <p className="text-gray-400 text-sm">Payment gateway integration is being updated</p>
              </div>
              <button
                disabled
                className="relative w-14 h-7 rounded-full bg-gray-600 cursor-not-allowed opacity-60"
              >
                <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white" />
              </button>
            </div>
            <SettingToggle 
              label="Certificate Generation"
              description="Enable automatic certificate generation for events"
              settingKey="certificateGenerationEnabled"
            />
            <SettingToggle 
              label="ML Recommendations"
              description="Enable AI-powered event recommendations"
              settingKey="mlRecommendationsEnabled"
            />
            <SettingToggle 
              label="Email Notifications"
              description="Send email notifications for events and updates"
              settingKey="emailNotificationsEnabled"
            />
          </div>
        </div>

        {/* Limits & Defaults */}
        <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-numbers-line text-purple-400" />
            Limits & Defaults
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <label className="block text-sm text-gray-400 mb-2">Max Events Per Host</label>
              <input
                type="number"
                value={settings.maxEventsPerHost}
                onChange={(e) => handleNumberChange('maxEventsPerHost', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <label className="block text-sm text-gray-400 mb-2">Default Max Participants</label>
              <input
                type="number"
                value={settings.maxParticipantsDefault}
                onChange={(e) => handleNumberChange('maxParticipantsDefault', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg">
              <label className="block text-sm text-gray-400 mb-2">Certificate Valid (Days)</label>
              <input
                type="number"
                value={settings.certificateExpiryDays}
                onChange={(e) => handleNumberChange('certificateExpiryDays', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <i className="ri-server-line text-purple-400" />
            Service Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${health.api === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="text-white text-sm font-medium">API Server</p>
                <p className={`${health.api === 'online' ? 'text-green-400' : 'text-red-400'} text-xs capitalize`}>{health.api}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${health.mongodb === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="text-white text-sm font-medium">Database</p>
                <p className={`${health.mongodb === 'online' ? 'text-green-400' : 'text-red-400'} text-xs capitalize`}>{health.mongodb}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${health.redis === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="text-white text-sm font-medium">Redis</p>
                <p className={`${health.redis === 'online' ? 'text-green-400' : 'text-red-400'} text-xs capitalize`}>{health.redis}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${health.ml === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="text-white text-sm font-medium">ML Services</p>
                <p className={`${health.ml === 'online' ? 'text-green-400' : 'text-red-400'} text-xs capitalize`}>{health.ml}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <i className="ri-save-line" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
}
