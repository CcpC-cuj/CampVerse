import React, { useEffect, useState } from "react";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "../userdashboard/NavBar";
import { getCertificateDashboard } from "../api/certificates";
import { useAuth } from "../contexts/AuthContext";

export default function CertificateReview() {
  const { user } = useAuth();
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  // Removed unused actionLoading

  useEffect(() => {
    async function fetchPendingCertificates() {
      setLoading(true);
      try {
        // Use dashboard API to get pending certificates
        const res = await getCertificateDashboard({ status: "pending" });
        const certs = Array.isArray(res?.data?.certificates) ? res.data.certificates : [];
        setPendingCertificates(certs);
      } catch {
        setPendingCertificates([]);
      }
      setLoading(false);
    }
    fetchPendingCertificates();
  }, []);

  // Removed unused handleCertificateVerification

  return (
    <div className="h-screen bg-[#141a45] text-white font-poppins">
      <div className="flex h-screen">
        <Sidebar user={user} roles={user?.roles} activeRole="verifier" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <NavBar user={user} />
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto py-10 px-4">
              <h2 className="text-3xl font-bold mb-8 text-white" style={{textShadow: "0 0 8px rgba(155, 93, 229, 0.35)"}}>
                Certificate Review
              </h2>
              <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/40 mb-8">
                <h3 className="text-2xl font-semibold mb-6 text-[#9b5de5]">Pending Certificates</h3>
                {loading ? (
                  <div className="flex items-center gap-3 text-gray-300">
                    <i className="ri-loader-4-line animate-spin text-2xl text-[#9b5de5]" />
                    <span>Loading certificates...</span>
                  </div>
                ) : pendingCertificates.length === 0 ? (
                  <div className="text-gray-400 text-lg">No certificates pending review.</div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {pendingCertificates.map(cert => (
                      <div key={cert._id || cert.id} className="bg-[#141a45] rounded-lg p-6 border border-gray-700/40 shadow hover:shadow-[0_0_15px_rgba(155,93,229,0.25)] transition-all">
                        <h4 className="text-lg font-semibold text-white mb-1">{cert.title || cert.name}</h4>
                        {/* Certificate details would go here */}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
