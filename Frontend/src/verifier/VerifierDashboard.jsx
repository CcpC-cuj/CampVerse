import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getPendingInstitutionVerifications, approveInstitutionVerificationAPI, rejectInstitutionVerificationAPI } from "../api/institution";
import { listPendingHostRequests, approveHostRequest, rejectHostRequest } from "../api/user";
import { useAuth } from "../contexts/AuthContext";

export default function VerifierDashboard() {
  const { user } = useAuth();
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [pendingHosts, setPendingHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('institutions');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [institutionsRes, hostsRes] = await Promise.all([
        getPendingInstitutionVerifications(),
        listPendingHostRequests()
      ]);
      setPendingInstitutions(Array.isArray(institutionsRes?.pendingInstitutions) ? institutionsRes.pendingInstitutions : []);
      setPendingHosts(Array.isArray(hostsRes?.pendingUsers) ? hostsRes.pendingUsers : (Array.isArray(hostsRes) ? hostsRes : []));
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  };

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
        fetchData();
      } else {
        alert(`Failed to ${action} institution: ` + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error(`Failed to ${action} institution:`, error);
      alert(`Failed to ${action} institution`);
    }
    setActionLoading(null);
  };

  const handleHostAction = async (userId, action) => {
    setActionLoading(userId);
    try {
      let result;
      if (action === 'approve') {
        result = await approveHostRequest(userId, {});
      } else if (action === 'reject') {
        result = await rejectHostRequest(userId, { reason: 'Application rejected by verifier' });
      }
      
      if (result.success || result.message) {
        alert(`Host request ${action}d successfully!`);
        fetchData();
      } else {
        alert(`Failed to ${action} host request: ` + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error(`Failed to ${action} host request:`, error);
      alert(`Failed to ${action} host request`);
    }
    setActionLoading(null);
  };

  return (
    <Layout title="Verifier Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <i className="ri-building-line text-2xl text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{pendingInstitutions.length}</div>
                <div className="text-sm text-gray-400">Pending Institutions</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <i className="ri-user-star-line text-2xl text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{pendingHosts.length}</div>
                <div className="text-sm text-gray-400">Pending Host Requests</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <i className="ri-shield-check-line text-2xl text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{pendingInstitutions.length + pendingHosts.length}</div>
                <div className="text-sm text-gray-400">Total Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('institutions')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'institutions'
                ? 'text-[#9b5de5] border-b-2 border-[#9b5de5]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="ri-building-line mr-2" />
            Institutions ({pendingInstitutions.length})
          </button>
          <button
            onClick={() => setActiveTab('hosts')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'hosts'
                ? 'text-[#9b5de5] border-b-2 border-[#9b5de5]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="ri-user-star-line mr-2" />
            Host Requests ({pendingHosts.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <i className="ri-loader-4-line animate-spin text-4xl text-[#9b5de5]" />
          </div>
        ) : (
          <>
            {/* Institutions Tab */}
            {activeTab === 'institutions' && (
              <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
                <h3 className="text-xl font-semibold mb-6 text-white">Pending Institution Verifications</h3>
                {pendingInstitutions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <i className="ri-building-line text-5xl mb-4 block opacity-50" />
                    <p>No institutions pending verification.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingInstitutions.map(inst => (
                      <div key={inst._id || inst.id} className="bg-[#141a45] rounded-lg p-5 border border-gray-700/40 hover:border-[#9b5de5]/30 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-[#9b5de5]/20 flex items-center justify-center text-[#9b5de5] font-bold text-xl">
                            {inst.name?.charAt(0) || "I"}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white">{inst.name}</h4>
                            <div className="text-xs text-gray-400">{inst.email}</div>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-300 mb-4">
                          <div><span className="text-gray-500">Domain:</span> {inst.domain || "N/A"}</div>
                          <div><span className="text-gray-500">Location:</span> {inst.location || "N/A"}</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleInstitutionAction(inst._id || inst.id, 'approve')}
                            disabled={actionLoading === (inst._id || inst.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                          >
                            {actionLoading === (inst._id || inst.id) ? <i className="ri-loader-4-line animate-spin" /> : "Approve"}
                          </button>
                          <button 
                            onClick={() => handleInstitutionAction(inst._id || inst.id, 'reject')}
                            disabled={actionLoading === (inst._id || inst.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                          >
                            {actionLoading === (inst._id || inst.id) ? <i className="ri-loader-4-line animate-spin" /> : "Reject"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Host Requests Tab */}
            {activeTab === 'hosts' && (
              <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/40">
                <h3 className="text-xl font-semibold mb-6 text-white">Pending Host Requests</h3>
                {pendingHosts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <i className="ri-user-star-line text-5xl mb-4 block opacity-50" />
                    <p>No host requests pending verification.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingHosts.map(hostUser => (
                      <div key={hostUser._id || hostUser.id} className="bg-[#141a45] rounded-lg p-5 border border-gray-700/40 hover:border-[#9b5de5]/30 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                            {hostUser.profilePhoto ? (
                              <img src={hostUser.profilePhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <span className="text-green-400 font-bold text-xl">{hostUser.name?.charAt(0) || "H"}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-white">{hostUser.name}</h4>
                            <div className="text-xs text-gray-400">{hostUser.email}</div>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-300 mb-4">
                          <div><span className="text-gray-500">Phone:</span> {hostUser.phone || "N/A"}</div>
                          <div><span className="text-gray-500">Institution:</span> {
                            (() => {
                              if (hostUser.institutionId && typeof hostUser.institutionId === 'object' && hostUser.institutionId.name) {
                                return hostUser.institutionId.name;
                              }
                              if (hostUser.institution && typeof hostUser.institution === 'string') {
                                return hostUser.institution;
                              }
                              if (hostUser.institution && typeof hostUser.institution === 'object' && hostUser.institution.name) {
                                return hostUser.institution.name;
                              }
                              return "N/A";
                            })()
                          }</div>
                          {hostUser.hostEligibilityStatus?.reason && typeof hostUser.hostEligibilityStatus.reason === 'string' && (
                            <div><span className="text-gray-500">Reason:</span> {hostUser.hostEligibilityStatus.reason}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleHostAction(hostUser._id || hostUser.id, 'approve')}
                            disabled={actionLoading === (hostUser._id || hostUser.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                          >
                            {actionLoading === (hostUser._id || hostUser.id) ? <i className="ri-loader-4-line animate-spin" /> : "Approve"}
                          </button>
                          <button 
                            onClick={() => handleHostAction(hostUser._id || hostUser.id, 'reject')}
                            disabled={actionLoading === (hostUser._id || hostUser.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                          >
                            {actionLoading === (hostUser._id || hostUser.id) ? <i className="ri-loader-4-line animate-spin" /> : "Reject"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
