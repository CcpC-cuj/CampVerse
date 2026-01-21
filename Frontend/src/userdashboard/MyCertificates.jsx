import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getMyCertificates } from "../api/certificates";

const MyCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyCertificates();
      const list = res?.data?.certificates || res?.certificates || res || [];
      setCertificates(Array.isArray(list) ? list : []);
    } catch {
      setError("Failed to load certificates.");
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="My Certificates">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Certificates</h2>
            <button
              onClick={loadCertificates}
              className="px-3 py-2 bg-[#9b5de5]/20 text-[#9b5de5] rounded-lg hover:bg-[#9b5de5]/30 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-gray-300">Loading certificates...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : certificates.length === 0 ? (
            <div className="text-gray-400">No certificates found yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <div key={cert._id || cert.id} className="bg-gray-900/60 border border-gray-700/40 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-1 line-clamp-2">{cert.title || cert.eventTitle || "Certificate"}</h3>
                  <p className="text-gray-400 text-sm mb-2">{cert.certificateId || cert._id?.slice(-8)}</p>
                  {cert.issuedAt && (
                    <p className="text-gray-500 text-xs mb-3">Issued: {new Date(cert.issuedAt).toLocaleDateString()}</p>
                  )}
                  {cert.fileUrl && (
                    <a
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                    >
                      View Certificate
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyCertificates;
