
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getCertificateDashboard, approveCertificate, rejectCertificate } from "../api/certificates";
import { useAuth } from "../contexts/AuthContext";

export default function CertificateReview() {
  const { user } = useAuth();
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    async function fetchPendingCertificates() {
      setLoading(true);
      try {
        const res = await getCertificateDashboard({ status: "pending" });
        setPendingCertificates(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error('Error fetching certificates:', e);
        setPendingCertificates([]);
      }
      setLoading(false);
    }
    fetchPendingCertificates();
  }, []);

  const handleCertificateAction = async (certificateId, action) => {
    setActionLoading(certificateId);
    try {
      let result;
      if (action === 'approve') {
        result = await approveCertificate(certificateId);
      } else if (action === 'reject') {
        const reason = prompt('Please provide a reason for rejection (optional):');
        result = await rejectCertificate(certificateId, reason);
      }

      if (result.success !== false) {
        alert(`Certificate ${action}d successfully!`);
        // Refresh the list
        const res = await getCertificateDashboard({ status: "pending" });
        setPendingCertificates(Array.isArray(res?.data) ? res.data : []);
      } else {
        alert(`Failed to ${action} certificate: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to ${action} certificate:`, error);
      alert(`Failed to ${action} certificate`);
    }
    setActionLoading(null);
  };

  return (
    <Layout user={user} roles={user?.roles}>
      <div style={{ padding: "2rem" }}>
        <h3>Certificate Review</h3>
        {loading ? (
          <p>Loading certificates...</p>
        ) : pendingCertificates.length === 0 ? (
          <p>No certificates pending review.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {pendingCertificates.map(cert => (
              <li key={cert._id || cert.id} style={{ 
                border: "1px solid #ddd", 
                padding: "1rem", 
                marginBottom: "1rem",
                borderRadius: "8px"
              }}>
                <div>
                  <strong>{cert.name || cert.title || cert.certificateName}</strong> &mdash; {cert.eventName || cert.event || "Event"}
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>
                  User: {cert.userName || cert.userEmail || "Unknown"} | Type: {cert.certificateType || "N/A"}
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <button 
                    onClick={() => handleCertificateAction(cert._id || cert.id, 'approve')}
                    disabled={actionLoading === (cert._id || cert.id)}
                    style={{ 
                      background: "#28a745", 
                      color: "white", 
                      border: "none", 
                      padding: "0.5rem 1rem", 
                      borderRadius: "4px",
                      marginRight: "0.5rem",
                      cursor: actionLoading === (cert._id || cert.id) ? "not-allowed" : "pointer"
                    }}
                  >
                    {actionLoading === (cert._id || cert.id) ? "Processing..." : "Approve"}
                  </button>
                  <button 
                    onClick={() => handleCertificateAction(cert._id || cert.id, 'reject')}
                    disabled={actionLoading === (cert._id || cert.id)}
                    style={{ 
                      background: "#dc3545", 
                      color: "white", 
                      border: "none", 
                      padding: "0.5rem 1rem", 
                      borderRadius: "4px",
                      cursor: actionLoading === (cert._id || cert.id) ? "not-allowed" : "pointer"
                    }}
                  >
                    {actionLoading === (cert._id || cert.id) ? "Processing..." : "Reject"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
