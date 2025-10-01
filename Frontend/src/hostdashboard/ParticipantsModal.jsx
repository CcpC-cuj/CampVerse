import React, { useState, useEffect } from "react";
import { getEventParticipants } from "../api/events";

const ParticipantsModal = ({ event, onClose }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (event?._id) {
      loadParticipants();
    }
  }, [event]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getEventParticipants(event._id);
      
      if (Array.isArray(response)) {
        setParticipants(response);
      } else if (response.success && response.data) {
        setParticipants(response.data);
      } else {
        setError(response.error || 'Failed to load participants');
      }
    } catch (err) {
      console.error('Error loading participants:', err);
      setError('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredParticipants = () => {
    if (filter === "all") return participants;
    return participants.filter(p => p.status === filter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'registered':
        return 'bg-green-500/20 text-green-300';
      case 'waitlisted':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'attended':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-300';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'failed':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Status', 'Payment Status', 'Payment Type', 'Attendance Time'],
      ...getFilteredParticipants().map(p => [
        p.name || 'N/A',
        p.email || 'N/A',
        p.phone || 'N/A',
        p.status || 'N/A',
        p.paymentStatus || 'N/A',
        p.paymentType || 'N/A',
        p.attendanceTimestamp ? new Date(p.attendanceTimestamp).toLocaleString() : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}_participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: participants.length,
    registered: participants.filter(p => p.status === 'registered').length,
    waitlisted: participants.filter(p => p.status === 'waitlisted').length,
    attended: participants.filter(p => p.status === 'attended').length,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Event Participants</h3>
            <p className="text-gray-400 text-sm">{event.title}</p>
            {event.organizer && (
              <p className="text-gray-500 text-xs mt-1">Organized by {event.organizer}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.registered}</div>
              <div className="text-sm text-gray-400">Registered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.waitlisted}</div>
              <div className="text-sm text-gray-400">Waitlisted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.attended}</div>
              <div className="text-sm text-gray-400">Attended</div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex gap-2">
            {['all', 'registered', 'waitlisted', 'attended'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                  filter === status
                    ? 'bg-[#9b5de5] text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status} {status !== 'all' && `(${stats[status] || 0})`}
              </button>
            ))}
          </div>
          
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b5de5] mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading participants...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadParticipants}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {getFilteredParticipants().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No participants found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredParticipants().map((participant, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[#9b5de5] rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-white">
                                {participant.name || 'Unknown User'}
                              </h4>
                              <p className="text-sm text-gray-400">{participant.email}</p>
                            </div>
                          </div>
                          
                          {participant.phone && (
                            <p className="text-sm text-gray-400 mb-2">
                              📞 {participant.phone}
                            </p>
                          )}
                          
                          {participant.attendanceTimestamp && (
                            <p className="text-sm text-gray-400">
                              ✅ Attended: {new Date(participant.attendanceTimestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 items-end">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(participant.status)}`}>
                            {participant.status || 'Unknown'}
                          </span>
                          
                          {participant.paymentStatus && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(participant.paymentStatus)}`}>
                              {participant.paymentType === 'paid' ? `Paid (${participant.paymentStatus})` : 'Free'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Organization Logo Footer */}
        {(event.organizationName || event.logoURL) && (
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-center gap-3">
              {event.logoURL && (
                <img 
                  src={event.logoURL} 
                  alt="Organization Logo" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              {event.organizationName && (
                <span className="text-sm text-gray-400">
                  {event.organizationName}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantsModal;