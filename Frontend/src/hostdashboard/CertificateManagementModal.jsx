import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CertificateManagementModal = ({ event, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  
  // Certificate settings
  const [certificateType, setCertificateType] = useState('participation');
  const [awardText, setAwardText] = useState('');
  const [leftSignatory, setLeftSignatory] = useState({ name: '', title: '' });
  const [rightSignatory, setRightSignatory] = useState({ name: '', title: '' });
  
  // Upload files
  const [leftLogoFile, setLeftLogoFile] = useState(null);
  const [leftSignatureFile, setLeftSignatureFile] = useState(null);
  const [rightSignatureFile, setRightSignatureFile] = useState(null);

  useEffect(() => {
    if (event?.certificateSettings) {
      setCertificateType(event.certificateSettings.certificateType || 'participation');
      setAwardText(event.certificateSettings.awardText || '');
      setLeftSignatory(event.certificateSettings.leftSignatory || { name: '', title: '' });
      setRightSignatory(event.certificateSettings.rightSignatory || { name: '', title: '' });
    }
  }, [event]);

  const handleUploadAssets = async () => {
    if (!leftLogoFile && !leftSignatureFile && !rightSignatureFile) {
      setError('Please select at least one file to upload');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      if (leftLogoFile) formData.append('leftLogo', leftLogoFile);
      if (leftSignatureFile) formData.append('leftSignature', leftSignatureFile);
      if (rightSignatureFile) formData.append('rightSignature', rightSignatureFile);

      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space'}/api/certificate-management/events/${event._id}/upload-assets`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess('Assets uploaded successfully!');
      setLeftLogoFile(null);
      setLeftSignatureFile(null);
      setRightSignatureFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload assets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space'}/api/certificate-management/events/${event._id}/settings`,
        {
          certificateType,
          awardText,
          leftSignatory,
          rightSignatory,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess('Settings updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificates = () => {
    // Navigate to dedicated certificate generation page
    window.location.href = `/host/events/${event._id}/certificates`;
  };

  // Check if certificates are enabled for this event
  const isCertificateEnabled = event?.features?.certificateEnabled || event?.certificateEnabled;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-linear-to-r from-[#151729] via-[#1b1f3b] to-[#151729]">
          <div>
            <h2 className="text-2xl font-bold text-white">Certificate Management</h2>
            <p className="text-gray-400 text-sm mt-1">{event?.title}</p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-purple-500/30 text-purple-300 bg-purple-500/10">
              {isCertificateEnabled ? 'Certificates Enabled' : 'Certificates Disabled'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6 gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-purple-300 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Upload Assets
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-purple-300 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Certificate Template
                </label>
                <div className="text-sm text-gray-400">
                  Templates are managed by admins. Choose a template from the Certificate Management page.
                </div>
                <button
                  onClick={handleGenerateCertificates}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#9b5de5]/20 text-[#9b5de5] rounded-lg hover:bg-[#9b5de5]/30"
                >
                  Open Certificate Management
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Left Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLeftLogoFile(e.target.files[0])}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                  />
                  {leftLogoFile && (
                    <p className="mt-2 text-xs text-gray-400">Selected: {leftLogoFile.name}</p>
                  )}
                </div>

                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <div className="text-sm text-purple-300 mb-1">Right Logo</div>
                  <div className="text-xs text-gray-400">
                    CampVerse logo is fixed and applied automatically.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Left Signature
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLeftSignatureFile(e.target.files[0])}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                  />
                  {leftSignatureFile && (
                    <p className="mt-2 text-xs text-gray-400">Selected: {leftSignatureFile.name}</p>
                  )}
                </div>

                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <label className="block text-sm font-medium text-purple-300 mb-2">
                    Right Signature
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRightSignatureFile(e.target.files[0])}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                  />
                  {rightSignatureFile && (
                    <p className="mt-2 text-xs text-gray-400">Selected: {rightSignatureFile.name}</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleUploadAssets}
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Assets
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Certificate Type
                </label>
                <select
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="participation">Participation</option>
                  <option value="completion">Completion</option>
                  <option value="achievement">Achievement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Award Text
                </label>
                <textarea
                  value={awardText}
                  onChange={(e) => setAwardText(e.target.value)}
                  placeholder="e.g. {name} has successfully participated in {event_name}"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span>Suggestions:</span>
                  <button
                    type="button"
                    onClick={() => setAwardText((prev) => `${prev}{name}`)}
                    className="px-2 py-1 rounded-full border border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                  >
                    {"{name}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAwardText((prev) => `${prev}{event_name}`)}
                    className="px-2 py-1 rounded-full border border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                  >
                    {"{event_name}"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Left Signatory</h3>
                  <input
                    type="text"
                    value={leftSignatory.name}
                    onChange={(e) => setLeftSignatory({ ...leftSignatory, name: e.target.value })}
                    placeholder="Name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    value={leftSignatory.title}
                    onChange={(e) => setLeftSignatory({ ...leftSignatory, title: e.target.value })}
                    placeholder="Title"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-white">Right Signatory</h3>
                  <input
                    type="text"
                    value={rightSignatory.name}
                    onChange={(e) => setRightSignatory({ ...rightSignatory, name: e.target.value })}
                    placeholder="Name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    value={rightSignatory.title}
                    onChange={(e) => setRightSignatory({ ...rightSignatory, title: e.target.value })}
                    placeholder="Title"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdateSettings}
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Settings
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex flex-col gap-3">
          {!isCertificateEnabled && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-yellow-300 text-sm">
              <strong>Note:</strong> Certificates are not enabled for this event. Click "Manage Certificates" to enable and configure them first.
            </div>
          )}
          <div className="flex justify-between items-center">
            <button
              onClick={handleGenerateCertificates}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isCertificateEnabled ? 'Generate Certificates' : 'Manage Certificates'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateManagementModal;
