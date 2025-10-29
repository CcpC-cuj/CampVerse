import React, { useEffect, useState } from "react";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "../userdashboard/NavBar";
import { getPendingInstitutionVerifications, approveInstitutionVerificationAPI, rejectInstitutionVerificationAPI } from "../api/institution";
import { useAuth } from "../contexts/AuthContext";

export default function VerifierDashboard() {
  const { user } = useAuth();
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  // Removed unused pendingCertificates and eventCount
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const institutionsRes = await getPendingInstitutionVerifications();
        setPendingInstitutions(Array.isArray(institutionsRes?.pendingInstitutions) ? institutionsRes.pendingInstitutions : []);

  // Removed unused setters for certificates and events
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
        setPendingInstitutions(Array.isArray(institutionsRes?.pendingInstitutions) ? institutionsRes.pendingInstitutions : []);
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
    <div className="h-screen bg-[#141a45] text-white font-poppins">
      <div className="flex h-screen">
        <Sidebar user={user} roles={user?.roles} activeRole="verifier" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <NavBar user={user} />
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto py-10 px-4">
              <h2 className="text-3xl font-bold mb-8 text-white" style={{textShadow: "0 0 8px rgba(155, 93, 229, 0.35)"}}>
                Verifier Dashboard
              </h2>
              <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/40 mb-8">
                <h3 className="text-2xl font-semibold mb-6 text-[#9b5de5]">Pending Institution Verifications</h3>
                {loading ? (
                  <div className="flex items-center gap-3 text-gray-300">
                    <i className="ri-loader-4-line animate-spin text-2xl text-[#9b5de5]" />
                    <span>Loading institutions...</span>
                  </div>
                ) : pendingInstitutions.length === 0 ? (
                  <div className="text-gray-400 text-lg">No institutions pending verification.</div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {pendingInstitutions.map(inst => (
                      <div key={inst._id || inst.id} className="bg-[#141a45] rounded-lg p-6 border border-gray-700/40 shadow hover:shadow-[0_0_15px_rgba(155,93,229,0.25)] transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-[#9b5de5]/20 flex items-center justify-center text-[#9b5de5] font-bold text-xl">
                            {inst.name?.charAt(0) || "I"}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-white mb-1">{inst.name}</h4>
                            <div className="text-xs text-gray-400">{inst.email}</div>
                          </div>
                        </div>
                        <div className="mb-2 text-sm text-gray-300">
                          <span className="font-medium">Domain:</span> {inst.domain || "Unknown"}
                        </div>
                        <div className="mb-2 text-sm text-gray-300">
                          <span className="font-medium">Location:</span> {inst.location || "TBD"}
                        </div>
                        {inst.description && (
                          <div className="mb-2 text-sm text-gray-400">
                            <span className="font-medium">Description:</span> {inst.description}
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => handleInstitutionAction(inst._id || inst.id, 'approve')}
                            disabled={actionLoading === (inst._id || inst.id)}
                            className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white px-4 py-2 rounded-lg font-medium transition-all"
                          >
                            {actionLoading === (inst._id || inst.id) ? "Processing..." : "Approve"}
                          </button>
                          <button 
                            onClick={() => handleInstitutionAction(inst._id || inst.id, 'reject')}
                            disabled={actionLoading === (inst._id || inst.id)}
                            className="flex-1 bg-[#dc3545] hover:bg-[#c82333] text-white px-4 py-2 rounded-lg font-medium transition-all"
                          >
                            {actionLoading === (inst._id || inst.id) ? "Processing..." : "Reject"}
                          </button>
                        </div>
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
