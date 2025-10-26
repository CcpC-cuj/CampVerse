
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getCertificateDashboard } from "../api/certificates";

export default function CertificateReview() {
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPendingCertificates() {
      setLoading(true);
      try {
        const res = await getCertificateDashboard({ status: "pending" });
        setPendingCertificates(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        setPendingCertificates([]);
      }
      setLoading(false);
    }
    fetchPendingCertificates();
  }, []);

  return (
    <Layout>
      <div style={{ padding: "2rem" }}>
        <h3>Certificate Review</h3>
        {loading ? (
          <p>Loading certificates...</p>
        ) : pendingCertificates.length === 0 ? (
          <p>No certificates pending review.</p>
        ) : (
          <ul>
            {pendingCertificates.map(cert => (
              <li key={cert._id || cert.id}>
                <strong>{cert.name || cert.title || cert.certificateName}</strong> &mdash; {cert.eventName || cert.event || "Event"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
