
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getPendingInstitutionVerifications } from "../api/institution";
import { getCertificateDashboard } from "../api/certificates";
import { listEvents } from "../api/events";

export default function VerifierDashboard() {
  const [pendingInstitutions, setPendingInstitutions] = useState(0);
  const [pendingCertificates, setPendingCertificates] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const institutionsRes = await getPendingInstitutionVerifications();
        setPendingInstitutions(Array.isArray(institutionsRes?.data) ? institutionsRes.data.length : 0);

        const certificatesRes = await getCertificateDashboard({ status: "pending" });
        setPendingCertificates(Array.isArray(certificatesRes?.data) ? certificatesRes.data.length : 0);

        const eventsRes = await listEvents();
        setEventCount(Array.isArray(eventsRes?.data) ? eventsRes.data.length : 0);
      } catch (err) {
        // Handle error (could show a message)
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <Layout>
      <div style={{ padding: "2rem" }}>
        <h2>Verifier Dashboard</h2>
        <p>Welcome! Here you can review event verification requests, certificates, and analytics.</p>
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
            <div>
              <h4>Pending Institution Verifications</h4>
              <p>{pendingInstitutions}</p>
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
        )}
      </div>
    </Layout>
  );
}
