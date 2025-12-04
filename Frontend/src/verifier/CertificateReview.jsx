import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getCertificateDashboard } from "../api/certificates";

export default function CertificateReview() {
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

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
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setPendingCertificates([]);
    }
    setLoading(false);
  }

  const handleApproveCertificate = async (certId) => {
    setActionLoading(certId);
    try {
      // API call to approve certificate
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/certificates/${certId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Certificate approved successfully!');
        fetchPendingCertificates();
      } else {
        alert('Failed to approve certificate');
      }
    } catch (err) {
      console.error('Error approving certificate:', err);
      alert('Error approving certificate');
    }
    setActionLoading(null);
  };

  const handleRejectCertificate = async (certId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    setActionLoading(certId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/certificates/${certId}/reject`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert('Certificate rejected successfully!');
        fetchPendingCertificates();
      } else {
        alert('Failed to reject certificate');
      }
    } catch (err) {
      console.error('Error rejecting certificate:', err);
      alert('Error rejecting certificate');
    }
    setActionLoading(null);
  };

  return (
    <Layout title="Certificate Review">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gray-800/60 rounded-xl p-4 sm:p-8 border border-gray-700/40 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h3 className="text-xl sm:text-2xl font-semibold text-[#9b5de5]">Pending Certificates</h3>
            <button 
              onClick={fetchPendingCertificates}
              className="px-4 py-2 bg-[#9b5de5]/20 text-[#9b5de5] rounded-lg hover:bg-[#9b5de5]/30 transition-colors flex items-center gap-2"
            >
              <i className="ri-refresh-line" />
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-300 py-10">
              <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
              <span>Loading certificates...</span>
            </div>
          ) : pendingCertificates.length === 0 ? (
            <div className="text-center py-10">
              <i className="ri-file-check-line text-6xl text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No certificates pending review.</p>
              <p className="text-gray-500 text-sm mt-2">All certificates have been reviewed or none have been submitted yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                    {pendingCertificates.map(cert => (
                      <div key={cert._id || cert.id} className="bg-[#141a45] rounded-lg p-6 border border-gray-700/40 shadow hover:shadow-[0_0_15px_rgba(155,93,229,0.25)] transition-all">
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
    </Layout>
  );
}
