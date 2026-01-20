import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useModal } from "../components/Modal";

const API_URL = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

// Helper to format location object
const formatLocation = (location) => {
  if (!location) return null;
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    const parts = [location.city, location.state, location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
};

export default function InstitutionManagement() {
  const { showSuccess, showError, showPrompt } = useModal();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/institutions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setInstitutions(Array.isArray(data?.institutions) ? data.institutions : Array.isArray(data) ? data : []);
    } catch {
      setInstitutions([]);
    }
    setLoading(false);
  };

  const handleApprove = async (institutionId) => {
    setActionLoading(institutionId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/institutions/${institutionId}/approve-verification`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        await showSuccess('Institution approved successfully!');
        fetchInstitutions();
      } else {
        await showError('Failed to approve institution');
      }
    } catch {
      await showError('Error approving institution');
    }
    setActionLoading(null);
  };

  const handleReject = async (institutionId) => {
    const reason = await showPrompt('Please provide a reason for rejection:', {
      title: 'Reject Institution',
      placeholder: 'Enter rejection reason...',
      confirmText: 'Reject',
      variant: 'danger'
    });
    if (!reason) return;

    setActionLoading(institutionId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/institutions/${institutionId}/reject-verification`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        await showSuccess('Institution rejected');
        fetchInstitutions();
      } else {
        await showError('Failed to reject institution');
      }
    } catch {
      await showError('Error rejecting institution');
    }
    setActionLoading(null);
  };

  const filteredInstitutions = institutions.filter(inst => {
    if (filter === 'all') return true;
    if (filter === 'pending') return inst.verificationStatus === 'pending' || !inst.isVerified;
    if (filter === 'verified') return inst.isVerified;
    if (filter === 'rejected') return inst.verificationStatus === 'rejected';
    return true;
  });

  const getStatusBadge = (inst) => {
    if (inst.isVerified) {
      return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Verified</span>;
    }
    if (inst.verificationStatus === 'rejected') {
      return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Rejected</span>;
    }
    return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Pending</span>;
  };

  return (
    <Layout title="Institution Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setFilter('all')}
            className={`bg-gray-800/60 rounded-lg p-4 border cursor-pointer transition-all ${filter === 'all' ? 'border-purple-500' : 'border-gray-700/40 hover:border-gray-600'}`}
          >
            <p className="text-2xl font-bold text-white">{institutions.length}</p>
            <p className="text-sm text-gray-400">Total Institutions</p>
          </div>
          <div 
            onClick={() => setFilter('pending')}
            className={`bg-gray-800/60 rounded-lg p-4 border cursor-pointer transition-all ${filter === 'pending' ? 'border-yellow-500' : 'border-gray-700/40 hover:border-gray-600'}`}
          >
            <p className="text-2xl font-bold text-yellow-400">
              {institutions.filter(i => !i.isVerified && i.verificationStatus !== 'rejected').length}
            </p>
            <p className="text-sm text-gray-400">Pending</p>
          </div>
          <div 
            onClick={() => setFilter('verified')}
            className={`bg-gray-800/60 rounded-lg p-4 border cursor-pointer transition-all ${filter === 'verified' ? 'border-green-500' : 'border-gray-700/40 hover:border-gray-600'}`}
          >
            <p className="text-2xl font-bold text-green-400">
              {institutions.filter(i => i.isVerified).length}
            </p>
            <p className="text-sm text-gray-400">Verified</p>
          </div>
          <div 
            onClick={() => setFilter('rejected')}
            className={`bg-gray-800/60 rounded-lg p-4 border cursor-pointer transition-all ${filter === 'rejected' ? 'border-red-500' : 'border-gray-700/40 hover:border-gray-600'}`}
          >
            <p className="text-2xl font-bold text-red-400">
              {institutions.filter(i => i.verificationStatus === 'rejected').length}
            </p>
            <p className="text-sm text-gray-400">Rejected</p>
          </div>
        </div>

        {/* Institutions Grid */}
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/40 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">
              {filter === 'all' ? 'All Institutions' : 
               filter === 'pending' ? 'Pending Verification' :
               filter === 'verified' ? 'Verified Institutions' : 'Rejected Institutions'}
            </h3>
            <button
              onClick={fetchInstitutions}
              className="px-4 py-2 bg-purple-600/30 text-purple-300 rounded-lg hover:bg-purple-600/50 transition-colors flex items-center gap-2"
            >
              <i className="ri-refresh-line" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <i className="ri-loader-4-line animate-spin text-3xl text-purple-500" />
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <div className="text-center py-20">
              <i className="ri-building-4-line text-5xl text-gray-600 mb-4" />
              <p className="text-gray-400">No institutions found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredInstitutions.map(inst => (
                <div key={inst._id} className="bg-gray-900/50 rounded-lg p-5 border border-gray-700/40 hover:border-purple-500/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl">
                        {inst.name?.charAt(0) || 'I'}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{inst.name}</h4>
                        <p className="text-gray-400 text-sm">{inst.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(inst)}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {inst.domain && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <i className="ri-global-line text-gray-500" />
                        <span>{inst.domain}</span>
                      </div>
                    )}
                    {formatLocation(inst.location) && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <i className="ri-map-pin-line text-gray-500" />
                        <span>{formatLocation(inst.location)}</span>
                      </div>
                    )}
                    {inst.description && (
                      <p className="text-gray-400 text-xs mt-2 line-clamp-2">{inst.description}</p>
                    )}
                  </div>

                  {/* Actions for pending institutions */}
                  {!inst.isVerified && inst.verificationStatus !== 'rejected' && (
                    <div className="flex gap-2 pt-3 border-t border-gray-700/50">
                      <button
                        onClick={() => handleApprove(inst._id)}
                        disabled={actionLoading === inst._id}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-1"
                      >
                        {actionLoading === inst._id ? (
                          <i className="ri-loader-4-line animate-spin" />
                        ) : (
                          <>
                            <i className="ri-check-line" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(inst._id)}
                        disabled={actionLoading === inst._id}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-1"
                      >
                        <i className="ri-close-line" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
