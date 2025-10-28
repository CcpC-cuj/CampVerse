
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getPendingInstitutionVerifications, approveInstitutionVerificationAPI, rejectInstitutionVerificationAPI } from "../api/institution";
import { getCertificateDashboard } from "../api/certificates";
import { listEvents } from "../api/events";
import { useAuth } from "../contexts/AuthContext";

export default function VerifierDashboard() {
  const { user } = useAuth();
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [pendingCertificates, setPendingCertificates] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const institutionsRes = await getPendingInstitutionVerifications();
        setPendingInstitutions(Array.isArray(institutionsRes?.data) ? institutionsRes.data : []);

        const certificatesRes = await getCertificateDashboard({ status: "pending" });
        setPendingCertificates(Array.isArray(certificatesRes?.data) ? certificatesRes.data.length : 0);

        const eventsRes = await listEvents();
        setEventCount(Array.isArray(eventsRes?.data) ? eventsRes.data.length : 0);
      } catch (err) {
        console.error('Error fetching data:', err);
        // Handle error (could show a message)
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleInstitutionAction = async (institutionId, action) => {
    setActionLoading(institutionId);
    try {
      let result;
      if (action === 'approve') {
        result = await approveInstitutionVerificationAPI(institutionId, {});
      } else if (action === 'reject') {
        result = await rejectInstitutionVerificationAPI(institutionId);
      }
      
      if (result.success || result.message) {
        alert(`Institution ${action}d successfully!`);
        // Refresh the list
        const institutionsRes = await getPendingInstitutionVerifications();
        setPendingInstitutions(Array.isArray(institutionsRes?.data) ? institutionsRes.data : []);
      } else {
        alert(`Failed to ${action} institution: ` + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error(`Failed to ${action} institution:`, error);
      alert(`Failed to ${action} institution`);
    }
    setActionLoading(null);
  };

  return (
    <Layout user={user} roles={user?.roles}>
      <div style={{ padding: "2rem" }}>
        <h2>Verifier Dashboard</h2>
        <p>Welcome! Here you can review event verification requests, certificates, and analytics.</p>
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <div>
            <div style={{ display: "flex", gap: "2rem", marginTop: "2rem", marginBottom: "2rem" }}>
              <div>
                <h4>Pending Institution Verifications</h4>
                <p>{pendingInstitutions.length}</p>
              </div>
              <div>
                <h4>Pending Certificates</h4>
                <p>{pendingCertificates}</p>
              </div>
              <div>
                <h4>Total Events</h4>
                <p>{eventCount}</p>
              </div>
            </div>
            
            {pendingInstitutions.length > 0 && (
              <div>
                <h3>Pending Institution Verifications</h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {pendingInstitutions.map(institution => (
                    <li key={institution._id || institution.id} style={{ 
                      border: "1px solid #ddd", 
                      padding: "1rem", 
                      marginBottom: "1rem",
                      borderRadius: "8px"
                    }}>
                      <div>
                        <strong>{institution.name}</strong> &mdash; {institution.type}
                      </div>
                      <div style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>
                        Domain: {institution.emailDomain} | Website: {institution.website || "N/A"}
                      </div>
                      <div style={{ marginTop: "0.5rem" }}>
                        <button 
                          onClick={() => handleInstitutionAction(institution._id || institution.id, 'approve')}
                          disabled={actionLoading === (institution._id || institution.id)}
                          style={{ 
                            background: "#28a745", 
                            color: "white", 
                            border: "none", 
                            padding: "0.5rem 1rem", 
                            borderRadius: "4px",
                            marginRight: "0.5rem",
                            cursor: actionLoading === (institution._id || institution.id) ? "not-allowed" : "pointer"
                          }}
                        >
                          {actionLoading === (institution._id || institution.id) ? "Processing..." : "Approve"}
                        </button>
                        <button 
                          onClick={() => handleInstitutionAction(institution._id || institution.id, 'reject')}
                          disabled={actionLoading === (institution._id || institution.id)}
                          style={{ 
                            background: "#dc3545", 
                            color: "white", 
                            border: "none", 
                            padding: "0.5rem 1rem", 
                            borderRadius: "4px",
                            cursor: actionLoading === (institution._id || institution.id) ? "not-allowed" : "pointer"
                          }}
                        >
                          {actionLoading === (institution._id || institution.id) ? "Processing..." : "Reject"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
