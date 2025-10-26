
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getInstitutionAnalytics } from "../api/institution";
import { getCertificateStats } from "../api/certificates";

export default function VerifierAnalytics() {
  const [institutionStats, setInstitutionStats] = useState(null);
  const [certificateStats, setCertificateStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        // For demo, use institutionId = 'demo' (replace with real ID if available)
        const institutionRes = await getInstitutionAnalytics('demo');
        setInstitutionStats(institutionRes?.data || null);

        const certificateRes = await getCertificateStats();
        setCertificateStats(certificateRes?.data || null);
      } catch (e) {
        setInstitutionStats(null);
        setCertificateStats(null);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  return (
    <Layout>
      <div style={{ padding: "2rem" }}>
        <h3>Verifier Analytics</h3>
        {loading ? (
          <p>Loading analytics...</p>
        ) : (
          <div>
            <h4>Institution Analytics</h4>
            {institutionStats ? (
              <pre style={{ background: '#f5f5f5', padding: '1rem' }}>{JSON.stringify(institutionStats, null, 2)}</pre>
            ) : (
              <p>No institution analytics available.</p>
            )}
            <h4>Certificate Stats</h4>
            {certificateStats ? (
              <pre style={{ background: '#f5f5f5', padding: '1rem' }}>{JSON.stringify(certificateStats, null, 2)}</pre>
            ) : (
              <p>No certificate stats available.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
