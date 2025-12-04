import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getPendingInstitutionVerifications, approveInstitutionVerificationAPI, rejectInstitutionVerificationAPI } from "../api/institution";
import { listPendingHostRequests, approveHostRequest, rejectHostRequest } from "../api/user";
import { useAuth } from "../contexts/AuthContext";

// Modal Component for viewing and editing details
function DetailModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a2150] rounded-t-2xl sm:rounded-2xl border border-gray-700/50 w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-700/50">
          <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
            <i className="ri-close-line text-xl text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-70px)] sm:max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Field display component with edit capability
function EditableField({ label, value, fieldKey, editMode, editData, setEditData, type = "text", placeholder, required = false }) {
  const displayValue = value || <span className="text-gray-500 italic">Not provided</span>;
  const isMissing = !value || value === 'N/A';
  
  if (editMode) {
    return (
      <div className="space-y-1">
        <label className="text-sm text-gray-400 flex items-center gap-2">
          {label}
          {required && <span className="text-red-400">*</span>}
          {isMissing && <span className="text-amber-400 text-xs">(missing)</span>}
        </label>
        {type === "textarea" ? (
          <textarea
            value={editData[fieldKey] || ""}
            onChange={(e) => setEditData({ ...editData, [fieldKey]: e.target.value })}
            placeholder={placeholder}
            className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-[#9b5de5] focus:ring-1 focus:ring-[#9b5de5] outline-none transition-all min-h-[80px]"
          />
        ) : (
          <input
            type={type}
            value={editData[fieldKey] || ""}
            onChange={(e) => setEditData({ ...editData, [fieldKey]: e.target.value })}
            placeholder={placeholder}
            className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-[#9b5de5] focus:ring-1 focus:ring-[#9b5de5] outline-none transition-all"
          />
        )}
      </div>
    );
  }
  
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-700/30">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-white text-sm text-right max-w-[60%] ${isMissing ? 'text-amber-400' : ''}`}>
        {displayValue}
      </span>
    </div>
  );
}

export default function VerifierDashboard() {
  const { user } = useAuth();
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [pendingHosts, setPendingHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('institutions');
  
  // Modal states
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [selectedHost, setSelectedHost] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [remarks, setRemarks] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

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
      // Failed to fetch data - silently ignore
    }
    setLoading(false);
  };

  // Institution handlers
  const openInstitutionModal = (inst) => {
    setSelectedInstitution(inst);
    setEditMode(false);
    setEditData({
      name: inst.name || '',
      type: inst.type || 'college',
      emailDomain: inst.emailDomain || '',
      website: inst.website || inst.latestRequest?.website || '',
      phone: inst.phone || inst.latestRequest?.phone || '',
      info: inst.info || inst.latestRequest?.info || '',
      city: inst.location?.city || '',
      state: inst.location?.state || '',
      country: inst.location?.country || 'India',
    });
    setRemarks("");
    setRejectReason("");
    setShowRejectConfirm(false);
  };

  const handleInstitutionApprove = async () => {
    if (!selectedInstitution) return;
    const instId = String(selectedInstitution._id || selectedInstitution.id);
    setActionLoading(instId);
    
    try {
      const payload = {
        location: {
          city: editData.city,
          state: editData.state,
          country: editData.country,
        },
        website: editData.website,
        phone: editData.phone,
        info: editData.info,
        remarks: remarks || 'Approved by verifier',
      };
      
      const result = await approveInstitutionVerificationAPI(instId, payload);
      
      if (result.success || result.message || result.institution) {
        alert('Institution approved successfully!');
        setSelectedInstitution(null);
        fetchData();
      } else {
        alert('Failed to approve: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to approve institution');
    }
    setActionLoading(null);
  };

  const handleInstitutionReject = async () => {
    if (!selectedInstitution) return;
    const instId = String(selectedInstitution._id || selectedInstitution.id);
    setActionLoading(instId);
    
    try {
      const result = await rejectInstitutionVerificationAPI(instId, { reason: rejectReason });
      
      if (result.success || result.message) {
        alert('Institution rejected.');
        setSelectedInstitution(null);
        fetchData();
      } else {
        alert('Failed to reject: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to reject institution');
    }
    setActionLoading(null);
  };

  // Host handlers
  const openHostModal = (hostUser) => {
    setSelectedHost(hostUser);
    setRemarks("");
    setRejectReason("");
    setShowRejectConfirm(false);
  };

  const handleHostApprove = async () => {
    if (!selectedHost) return;
    const hostId = String(selectedHost._id || selectedHost.id);
    setActionLoading(hostId);
    
    try {
      const result = await approveHostRequest(hostId, { remarks: remarks || 'Approved by verifier' });
      
      if (result.success || result.message || result.user) {
        alert('Host request approved successfully!');
        setSelectedHost(null);
        fetchData();
      } else {
        alert('Failed to approve: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to approve host request');
    }
    setActionLoading(null);
  };

  const handleHostReject = async () => {
    if (!selectedHost) return;
    const hostId = String(selectedHost._id || selectedHost.id);
    setActionLoading(hostId);
    
    try {
      const result = await rejectHostRequest(hostId, { reason: rejectReason || 'Application rejected by verifier' });
      
      if (result.success || result.message) {
        alert('Host request rejected.');
        setSelectedHost(null);
        fetchData();
      } else {
        alert('Failed to reject: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to reject host request');
    }
    setActionLoading(null);
  };

  // Helper functions
  const getInstitutionLocation = (inst) => {
    if (!inst.location) return 'Not provided';
    if (typeof inst.location === 'string') return inst.location;
    const parts = [inst.location.city, inst.location.state, inst.location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  const getInstitutionName = (hostUser) => {
    if (hostUser.institutionId?.name) return hostUser.institutionId.name;
    if (typeof hostUser.institution === 'string') return hostUser.institution;
    if (hostUser.institution?.name) return hostUser.institution.name;
    return 'Not provided';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[status] || colors.pending;
  };

  return (
    <Layout title="Verifier Dashboard">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-4 sm:p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <i className="ri-building-line text-2xl sm:text-3xl text-blue-400" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">{pendingInstitutions.length}</div>
                <div className="text-xs sm:text-sm text-gray-400">Pending Institutions</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 sm:p-6 border border-green-500/20 hover:border-green-500/40 transition-all">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                <i className="ri-user-star-line text-2xl sm:text-3xl text-green-400" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">{pendingHosts.length}</div>
                <div className="text-xs sm:text-sm text-gray-400">Pending Host Requests</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 sm:p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <i className="ri-shield-check-line text-2xl sm:text-3xl text-purple-400" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">{pendingInstitutions.length + pendingHosts.length}</div>
                <div className="text-xs sm:text-sm text-gray-400">Total Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Full width on mobile */}
        <div className="flex gap-1 bg-gray-800/40 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('institutions')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'institutions'
                ? 'bg-[#9b5de5] text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <i className="ri-building-line" />
            <span className="hidden xs:inline">Institutions</span>
            <span className="xs:hidden">Inst.</span>
            {pendingInstitutions.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'institutions' ? 'bg-white/20' : 'bg-blue-500/30 text-blue-300'}`}>
                {pendingInstitutions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('hosts')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'hosts'
                ? 'bg-[#9b5de5] text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <i className="ri-user-star-line" />
            <span className="hidden xs:inline">Host Requests</span>
            <span className="xs:hidden">Hosts</span>
            {pendingHosts.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'hosts' ? 'bg-white/20' : 'bg-green-500/30 text-green-300'}`}>
                {pendingHosts.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <i className="ri-loader-4-line animate-spin text-5xl text-[#9b5de5] mb-4" />
              <p className="text-gray-400">Loading verification requests...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Institutions Tab */}
            {activeTab === 'institutions' && (
              <div className="space-y-4">
                {pendingInstitutions.length === 0 ? (
                  <div className="bg-gray-800/40 rounded-xl p-8 sm:p-12 text-center border border-gray-700/40">
                    <i className="ri-building-line text-5xl sm:text-6xl text-gray-600 mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No Pending Institutions</h3>
                    <p className="text-sm sm:text-base text-gray-400">All institution verification requests have been processed.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                    {pendingInstitutions.map(inst => {
                      const instId = String(inst._id || inst.id || '');
                      const instName = typeof inst.name === 'string' ? inst.name : 'Unknown Institution';
                      const instType = inst.type || 'college';
                      const instDomain = inst.emailDomain || 'N/A';
                      const instLocation = getInstitutionLocation(inst);
                      const requestedBy = inst.latestRequest?.requestedBy;
                      const hasMissingData = !inst.location?.city || !inst.website;
                      
                      return (
                        <div 
                          key={instId} 
                          className="bg-gradient-to-br from-gray-800/60 to-gray-900/40 rounded-xl border border-gray-700/40 hover:border-[#9b5de5]/40 transition-all overflow-hidden group"
                        >
                          {/* Card Header */}
                          <div className="p-5 border-b border-gray-700/30">
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#9b5de5]/30 to-blue-500/20 flex items-center justify-center text-[#9b5de5] font-bold text-2xl shrink-0">
                                {instName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-lg font-semibold text-white truncate">{instName}</h4>
                                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${getStatusBadge('pending')} border`}>
                                    Pending
                                  </span>
                                  {hasMissingData && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      <i className="ri-alert-line mr-1" />Missing Data
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                                  <i className="ri-mail-line" />
                                  {instDomain}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Card Body */}
                          <div className="p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-gray-400">
                                <i className="ri-building-4-line" />
                                <span className="capitalize">{instType}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-400">
                                <i className="ri-map-pin-line" />
                                <span className={instLocation === 'Not provided' ? 'text-amber-400' : ''}>{instLocation}</span>
                              </div>
                            </div>
                            
                            {requestedBy && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-700/30">
                                <i className="ri-user-line" />
                                Requested by: {requestedBy.name || requestedBy.email || 'Unknown'}
                              </div>
                            )}
                          </div>
                          
                          {/* Card Actions */}
                          <div className="p-4 bg-gray-900/30 border-t border-gray-700/30">
                            <button 
                              onClick={() => openInstitutionModal(inst)}
                              className="w-full bg-[#9b5de5] hover:bg-[#8b4dd5] text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                            >
                              <i className="ri-eye-line" />
                              View Details & Verify
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Host Requests Tab */}
            {activeTab === 'hosts' && (
              <div className="space-y-4">
                {pendingHosts.length === 0 ? (
                  <div className="bg-gray-800/40 rounded-xl p-8 sm:p-12 text-center border border-gray-700/40">
                    <i className="ri-user-star-line text-5xl sm:text-6xl text-gray-600 mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No Pending Host Requests</h3>
                    <p className="text-sm sm:text-base text-gray-400">All host applications have been processed.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                    {pendingHosts.map(hostUser => {
                      const hostId = String(hostUser._id || hostUser.id || '');
                      const hostName = typeof hostUser.name === 'string' ? hostUser.name : 'Unknown';
                      const hostEmail = typeof hostUser.email === 'string' ? hostUser.email : '';
                      const hostPhone = typeof hostUser.phone === 'string' ? hostUser.phone : null;
                      const institutionName = getInstitutionName(hostUser);
                      const requestedAt = hostUser.hostEligibilityStatus?.requestedAt;
                      const hasIdCard = !!hostUser.hostRequestIdCardPhoto;
                      const hasPermission = !!hostUser.hostRequestEventPermission;
                      
                      return (
                        <div 
                          key={hostId} 
                          className="bg-gradient-to-br from-gray-800/60 to-gray-900/40 rounded-xl border border-gray-700/40 hover:border-green-500/40 transition-all overflow-hidden"
                        >
                          {/* Card Header */}
                          <div className="p-5 border-b border-gray-700/30">
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                                {hostUser.profilePhoto ? (
                                  <img src={hostUser.profilePhoto} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-green-400 font-bold text-2xl">{hostName.charAt(0)}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-lg font-semibold text-white truncate">{hostName}</h4>
                                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge('pending')} border`}>
                                    Pending
                                  </span>
                                </div>
                                <div className="text-sm text-gray-400 mt-1">{hostEmail}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Card Body */}
                          <div className="p-5 space-y-3">
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-400">
                                <i className="ri-building-line" />
                                <span>{institutionName}</span>
                              </div>
                              {hostPhone && (
                                <div className="flex items-center gap-2 text-gray-400">
                                  <i className="ri-phone-line" />
                                  <span>{hostPhone}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Document indicators */}
                            <div className="flex gap-2 pt-2">
                              <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${hasIdCard ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-500'}`}>
                                <i className={hasIdCard ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} />
                                ID Card
                              </span>
                              <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${hasPermission ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-500'}`}>
                                <i className={hasPermission ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} />
                                Permission Doc
                              </span>
                            </div>
                            
                            {requestedAt && (
                              <div className="text-xs text-gray-500 pt-2 border-t border-gray-700/30">
                                <i className="ri-time-line mr-1" />
                                Applied: {formatDate(requestedAt)}
                              </div>
                            )}
                          </div>
                          
                          {/* Card Actions */}
                          <div className="p-4 bg-gray-900/30 border-t border-gray-700/30">
                            <button 
                              onClick={() => openHostModal(hostUser)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                            >
                              <i className="ri-eye-line" />
                              View Details & Verify
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Institution Detail Modal */}
      <DetailModal 
        isOpen={!!selectedInstitution} 
        onClose={() => setSelectedInstitution(null)}
        title="Institution Verification"
      >
        {selectedInstitution && (
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-700/30">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#9b5de5]/30 to-blue-500/20 flex items-center justify-center text-[#9b5de5] font-bold text-3xl">
                {(selectedInstitution.name || 'I').charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedInstitution.name || 'Unknown Institution'}</h3>
                <div className="text-gray-400">{selectedInstitution.emailDomain}</div>
              </div>
            </div>

            {/* Toggle Edit Mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {editMode ? 'Edit mode enabled - Update missing or incorrect information' : 'Review the submitted information'}
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  editMode 
                    ? 'bg-[#9b5de5] text-white' 
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <i className={editMode ? 'ri-check-line' : 'ri-edit-line'} />
                {editMode ? 'Editing' : 'Edit Data'}
              </button>
            </div>

            {/* Institution Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Basic Information</h4>
              
              {editMode ? (
                <div className="grid gap-4">
                  <EditableField label="Institution Name" value={selectedInstitution.name} fieldKey="name" editMode={editMode} editData={editData} setEditData={setEditData} required />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-400">Type <span className="text-red-400">*</span></label>
                      <select 
                        value={editData.type || 'college'} 
                        onChange={(e) => setEditData({...editData, type: e.target.value})}
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-[#9b5de5] outline-none"
                      >
                        <option value="college">College</option>
                        <option value="university">University</option>
                        <option value="org">Organization</option>
                      </select>
                    </div>
                    <EditableField label="Email Domain" value={selectedInstitution.emailDomain} fieldKey="emailDomain" editMode={editMode} editData={editData} setEditData={setEditData} required />
                  </div>
                  <EditableField label="Website" value={selectedInstitution.website || selectedInstitution.latestRequest?.website} fieldKey="website" editMode={editMode} editData={editData} setEditData={setEditData} placeholder="https://example.edu" />
                  <EditableField label="Phone" value={selectedInstitution.phone || selectedInstitution.latestRequest?.phone} fieldKey="phone" editMode={editMode} editData={editData} setEditData={setEditData} placeholder="+91 1234567890" />
                  <EditableField label="Description" value={selectedInstitution.info || selectedInstitution.latestRequest?.info} fieldKey="info" editMode={editMode} editData={editData} setEditData={setEditData} type="textarea" placeholder="Brief description of the institution" />
                  
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide pt-2">Location</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <EditableField label="City" value={selectedInstitution.location?.city} fieldKey="city" editMode={editMode} editData={editData} setEditData={setEditData} placeholder="City" />
                    <EditableField label="State" value={selectedInstitution.location?.state} fieldKey="state" editMode={editMode} editData={editData} setEditData={setEditData} placeholder="State" />
                    <EditableField label="Country" value={selectedInstitution.location?.country} fieldKey="country" editMode={editMode} editData={editData} setEditData={setEditData} placeholder="Country" />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/30 rounded-xl p-4 space-y-1">
                  <EditableField label="Name" value={selectedInstitution.name} />
                  <EditableField label="Type" value={selectedInstitution.type} />
                  <EditableField label="Email Domain" value={selectedInstitution.emailDomain} />
                  <EditableField label="Website" value={selectedInstitution.website || selectedInstitution.latestRequest?.website} />
                  <EditableField label="Phone" value={selectedInstitution.phone || selectedInstitution.latestRequest?.phone} />
                  <EditableField label="Description" value={selectedInstitution.info || selectedInstitution.latestRequest?.info} />
                  <EditableField label="Location" value={getInstitutionLocation(selectedInstitution)} />
                </div>
              )}
            </div>

            {/* Request Info */}
            {selectedInstitution.latestRequest && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Request Information</h4>
                <div className="bg-gray-800/30 rounded-xl p-4 space-y-1">
                  <EditableField label="Requested By" value={selectedInstitution.latestRequest.requestedBy?.name || selectedInstitution.latestRequest.requestedBy?.email} />
                  <EditableField label="Request Date" value={formatDate(selectedInstitution.latestRequest.createdAt)} />
                  <EditableField label="Submitted Name" value={selectedInstitution.latestRequest.institutionName} />
                </div>
              </div>
            )}

            {/* Verifier Remarks */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Verifier Remarks (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes or remarks about this verification..."
                className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm focus:border-[#9b5de5] focus:ring-1 focus:ring-[#9b5de5] outline-none transition-all min-h-[80px]"
              />
            </div>

            {/* Reject Confirmation */}
            {showRejectConfirm && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <i className="ri-error-warning-line text-xl" />
                  <span className="font-medium">Reject Institution?</span>
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full bg-gray-800/50 border border-red-500/30 rounded-lg px-4 py-3 text-white text-sm focus:border-red-500 outline-none min-h-[60px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleInstitutionReject}
                    disabled={actionLoading === String(selectedInstitution._id || selectedInstitution.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    {actionLoading === String(selectedInstitution._id || selectedInstitution.id) ? (
                      <i className="ri-loader-4-line animate-spin" />
                    ) : (
                      'Confirm Reject'
                    )}
                  </button>
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {!showRejectConfirm && (
              <div className="flex gap-3 pt-4 border-t border-gray-700/30">
                <button
                  onClick={handleInstitutionApprove}
                  disabled={actionLoading === String(selectedInstitution._id || selectedInstitution.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === String(selectedInstitution._id || selectedInstitution.id) ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    <>
                      <i className="ri-checkbox-circle-line" />
                      Approve Institution
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={actionLoading === String(selectedInstitution._id || selectedInstitution.id)}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="ri-close-circle-line" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Host Detail Modal */}
      <DetailModal 
        isOpen={!!selectedHost} 
        onClose={() => setSelectedHost(null)}
        title="Host Request Verification"
      >
        {selectedHost && (
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-700/30">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center overflow-hidden">
                {selectedHost.profilePhoto ? (
                  <img src={selectedHost.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-green-400 font-bold text-3xl">{(selectedHost.name || 'H').charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedHost.name || 'Unknown User'}</h3>
                <div className="text-gray-400">{selectedHost.email}</div>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Applicant Information</h4>
              <div className="bg-gray-800/30 rounded-xl p-4 space-y-1">
                <EditableField label="Full Name" value={selectedHost.name} />
                <EditableField label="Email" value={selectedHost.email} />
                <EditableField label="Phone" value={selectedHost.phone} />
                <EditableField label="Institution" value={getInstitutionName(selectedHost)} />
                <EditableField label="College ID" value={selectedHost.collegeIdNumber} />
                <EditableField label="Account Verified" value={selectedHost.isVerified ? 'Yes' : 'No'} />
                <EditableField label="Institution Status" value={selectedHost.institutionVerificationStatus} />
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Request Details</h4>
              <div className="bg-gray-800/30 rounded-xl p-4 space-y-1">
                <EditableField label="Request Date" value={formatDate(selectedHost.hostEligibilityStatus?.requestedAt)} />
                <EditableField label="Status" value={selectedHost.hostEligibilityStatus?.status || 'pending'} />
                {selectedHost.hostEligibilityStatus?.remarks && (
                  <EditableField label="User Remarks" value={selectedHost.hostEligibilityStatus.remarks} />
                )}
              </div>
            </div>

            {/* Uploaded Documents */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Submitted Documents</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* ID Card */}
                <div className="bg-gray-800/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">ID Card Photo</span>
                    {selectedHost.hostRequestIdCardPhoto ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <i className="ri-checkbox-circle-fill" /> Uploaded
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <i className="ri-error-warning-line" /> Not provided
                      </span>
                    )}
                  </div>
                  {selectedHost.hostRequestIdCardPhoto ? (
                    <div 
                      onClick={() => setImagePreview(selectedHost.hostRequestIdCardPhoto)}
                      className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#9b5de5] transition-all group"
                    >
                      <img 
                        src={selectedHost.hostRequestIdCardPhoto} 
                        alt="ID Card" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i className="ri-zoom-in-line text-2xl text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center border border-dashed border-gray-600">
                      <span className="text-gray-500 text-sm">No image</span>
                    </div>
                  )}
                </div>

                {/* Permission Document */}
                <div className="bg-gray-800/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Event Permission</span>
                    {selectedHost.hostRequestEventPermission ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <i className="ri-checkbox-circle-fill" /> Uploaded
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <i className="ri-information-line" /> Optional
                      </span>
                    )}
                  </div>
                  {selectedHost.hostRequestEventPermission ? (
                    <div 
                      onClick={() => setImagePreview(selectedHost.hostRequestEventPermission)}
                      className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#9b5de5] transition-all group"
                    >
                      <img 
                        src={selectedHost.hostRequestEventPermission} 
                        alt="Permission" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i className="ri-zoom-in-line text-2xl text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center border border-dashed border-gray-600">
                      <span className="text-gray-500 text-sm">Not required</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verifier Remarks */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Verifier Remarks (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes or remarks about this verification..."
                className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm focus:border-[#9b5de5] focus:ring-1 focus:ring-[#9b5de5] outline-none transition-all min-h-[80px]"
              />
            </div>

            {/* Reject Confirmation */}
            {showRejectConfirm && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <i className="ri-error-warning-line text-xl" />
                  <span className="font-medium">Reject Host Application?</span>
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection (will be sent to the applicant)..."
                  className="w-full bg-gray-800/50 border border-red-500/30 rounded-lg px-4 py-3 text-white text-sm focus:border-red-500 outline-none min-h-[60px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleHostReject}
                    disabled={actionLoading === String(selectedHost._id || selectedHost.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    {actionLoading === String(selectedHost._id || selectedHost.id) ? (
                      <i className="ri-loader-4-line animate-spin" />
                    ) : (
                      'Confirm Reject'
                    )}
                  </button>
                  <button
                    onClick={() => setShowRejectConfirm(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {!showRejectConfirm && (
              <div className="flex gap-3 pt-4 border-t border-gray-700/30">
                <button
                  onClick={handleHostApprove}
                  disabled={actionLoading === String(selectedHost._id || selectedHost.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === String(selectedHost._id || selectedHost.id) ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    <>
                      <i className="ri-checkbox-circle-line" />
                      Approve as Host
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  disabled={actionLoading === String(selectedHost._id || selectedHost.id)}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="ri-close-circle-line" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"
          onClick={() => setImagePreview(null)}
        >
          <button 
            className="absolute top-4 right-4 p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
            onClick={() => setImagePreview(null)}
          >
            <i className="ri-close-line text-2xl text-white" />
          </button>
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Layout>
  );
}
