import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axiosInstance";
import { getCertificateDashboard, approveCertificate, rejectCertificate } from "../api/certificates";
import { useModal } from "../components/Modal";

export default function CertificateReview() {
  const { showSuccess, showError, showPrompt } = useModal();
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchPendingCertificates();
  }, []);

  async function fetchPendingCertificates() {
    setLoading(true);
    try {
      // Use dashboard API to get pending certificates
      const res = await getCertificateDashboard({ status: "pending" });
      const certs = Array.isArray(res?.data?.certificates) ? res.data.certificates : 
                    Array.isArray(res?.certificates) ? res.certificates : [];
      setPendingCertificates(certs);
    } catch {
      setPendingCertificates([]);
    }
    setLoading(false);
  }

  const handleApproveCertificate = async (certId) => {
    setActionLoading(certId);
    try {
      const res = await approveCertificate(certId);
      if (res?.message || res?.success !== false) {
        await showSuccess('Certificate approved successfully!');
        fetchPendingCertificates();
      } else {
        await showError('Failed to approve certificate');
      }
    } catch {
      await showError('Error approving certificate');
    }
    setActionLoading(null);
  };

  const handleRejectCertificate = async (certId) => {
    const reason = await showPrompt('Please provide a reason for rejection:', {
      title: 'Reject Certificate',
      placeholder: 'Enter rejection reason...',
      confirmText: 'Reject',
      variant: 'danger'
    });
    if (!reason) return;
    
    setActionLoading(certId);
    try {
      const res = await rejectCertificate(certId, reason);
      if (res?.message || res?.success !== false) {
        await showSuccess('Certificate rejected successfully!');
        fetchPendingCertificates();
      } else {
        await showError('Failed to reject certificate');
      }
    } catch {
      await showError('Error rejecting certificate');
    }
    setActionLoading(null);
  };

  const handlePreview = async (cert) => {
    try {
      setActionLoading(cert.id || cert._id);
      const eventId = cert.eventId || cert.event?._id;
      const userId = cert.userId || cert.user?._id;
      
      if (!eventId || !userId) {
        showError('Missing event or user information');
        return;
      }

      const response = await api.get(
        `/api/certificate-management/events/${eventId}/render/${userId}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (err) {
      showError('Failed to load certificate preview');
    } finally {
      setActionLoading(null);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const filteredCertificates = pendingCertificates.filter((cert) => {
    const haystack = `${cert.title || ''} ${cert.eventTitle || ''} ${cert.userName || ''} ${cert.recipientName || ''}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  return (
    <Layout title="Certificate Review">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-linear-to-br from-[#151729] via-[#1b1f3b] to-[#151729] rounded-2xl p-6 border border-purple-500/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-white">Pending Certificates</h3>
              <p className="text-sm text-purple-200">Review and approve certificates submitted by hosts</p>
            </div>
            <button 
              onClick={fetchPendingCertificates}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <i className="ri-refresh-line" />
              Refresh
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-purple-200">Total Pending</p>
              <p className="text-3xl font-semibold text-white">{pendingCertificates.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-purple-200">Participation</p>
              <p className="text-3xl font-semibold text-white">
                {pendingCertificates.filter((cert) => (cert.type || cert.certificateType) === 'participation').length}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-purple-200">Achievement</p>
              <p className="text-3xl font-semibold text-white">
                {pendingCertificates.filter((cert) => (cert.type || cert.certificateType) === 'achievement').length}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recipient or event name..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <div className="bg-gray-800/60 rounded-xl p-4 sm:p-6 border border-gray-700/40">
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-300 py-10">
              <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
              <span>Loading certificates...</span>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center py-10">
              <i className="ri-file-check-line text-6xl text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No certificates match your search.</p>
              <p className="text-gray-500 text-sm mt-2">Try a different keyword.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                    {filteredCertificates.map(cert => (
                      <div key={cert._id || cert.id} className="bg-[#141a45] rounded-xl p-6 border border-gray-700/40 shadow hover:shadow-[0_0_15px_rgba(155,93,229,0.25)] transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-white mb-1">{cert.title || cert.eventTitle || 'Certificate'}</h4>
                            <p className="text-sm text-gray-400">ID: {cert.certificateId || cert._id?.slice(-8)}</p>
                          </div>
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Pending</span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="text-sm text-gray-300">
                            <span className="font-medium text-gray-400">Recipient:</span> {cert.userName || cert.recipientName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-300">
                            <span className="font-medium text-gray-400">Event:</span> {cert.eventTitle || cert.eventName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-300">
                            <span className="font-medium text-gray-400">Type:</span> {cert.type || cert.certificateType || 'Participation'}
                          </div>
                          <div className="text-sm text-gray-300">
                            <span className="font-medium text-gray-400">Issued:</span> {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handlePreview(cert)}
                            disabled={actionLoading === (cert._id || cert.id)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                             <i className="ri-eye-line" />
                            Preview
                          </button>
                          <button
                            onClick={() => handleApproveCertificate(cert._id || cert.id)}
                            disabled={actionLoading === (cert._id || cert.id)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {actionLoading === (cert._id || cert.id) ? (
                              <i className="ri-loader-4-line animate-spin" />
                            ) : (
                              <i className="ri-check-line" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectCertificate(cert._id || cert.id)}
                            disabled={actionLoading === (cert._id || cert.id)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <i className="ri-close-line" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col relative">
            <div className="p-4 border-b flex justify-between items-center bg-gray-900 rounded-t-xl text-white">
              <h3 className="font-semibold">Certificate Preview</h3>
              <button onClick={closePreview} className="text-gray-400 hover:text-white">
                <i className="ri-close-line text-2xl" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
              {previewUrl && (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full rounded border-0" 
                  title="Certificate Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
