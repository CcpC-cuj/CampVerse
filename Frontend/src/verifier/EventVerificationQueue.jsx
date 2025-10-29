import React, { useEffect, useState } from "react";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "../userdashboard/NavBar";
import { listEvents, verifyEvent, rejectEvent } from "../api/events";
import { useAuth } from "../contexts/AuthContext";

export default function EventVerificationQueue() {
  const { user } = useAuth();
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    async function fetchPendingEvents() {
      setLoading(true);
      try {
        const res = await listEvents({ status: "pending" });
        const events = res?.data?.events || [];
        setPendingEvents(Array.isArray(events) ? events : []);
      } catch {
        setPendingEvents([]);
      }
      setLoading(false);
    }
    fetchPendingEvents();
  }, []);

  const handleEventVerification = async (eventId, action) => {
    setActionLoading(eventId);
    try {
      let result;
      if (action === 'verify') {
        result = await verifyEvent(eventId);
        if (result.success !== false) {
          alert('Event verified successfully!');
          const res = await listEvents({ status: "pending" });
          const events = res?.data?.events || [];
          setPendingEvents(Array.isArray(events) ? events : []);
        } else {
          alert('Failed to verify event: ' + (result.error || 'Unknown error'));
        }
      } else if (action === 'reject') {
        const reason = prompt('Please provide a reason for rejection (optional):');
        result = await rejectEvent(eventId, reason);
        if (result.success !== false) {
          alert('Event rejected successfully!');
          const res = await listEvents({ status: "pending" });
          const events = res?.data?.events || [];
          setPendingEvents(Array.isArray(events) ? events : []);
        } else {
          alert('Failed to reject event: ' + (result.error || 'Unknown error'));
        }
      }
    } catch {
      alert(`Failed to ${action} event`);
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
                Event Verification Queue
              </h2>
              <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/40 mb-8">
                <h3 className="text-2xl font-semibold mb-6 text-[#9b5de5]">Pending Events</h3>
                {loading ? (
                  <div className="flex items-center gap-3 text-gray-300">
                    <i className="ri-loader-4-line animate-spin text-2xl text-[#9b5de5]" />
                    <span>Loading events...</span>
                  </div>
                ) : pendingEvents.length === 0 ? (
                  <div className="text-gray-400 text-lg">No events pending verification.</div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {pendingEvents.map(event => (
                      <div key={event._id || event.id} className="bg-[#141a45] rounded-lg p-6 border border-gray-700/40 shadow hover:shadow-[0_0_15px_rgba(155,93,229,0.25)] transition-all">
                        <h4 className="text-lg font-semibold text-white mb-4">{event.title || event.name}</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-sm text-gray-300"><span className="font-medium">Type:</span> {event.type || "Not specified"}</div>
                          <div className="text-sm text-gray-300"><span className="font-medium">Audience:</span> {event.audienceType || "Public"}</div>
                          <div className="text-sm text-gray-300"><span className="font-medium">Capacity:</span> {event.capacity || "Unlimited"}</div>
                          <div className="text-sm text-gray-300"><span className="font-medium">Price:</span> {event.isPaid ? `₹${event.price || 0}` : "Free"}</div>
                        </div>
                        <div className="mb-4 text-sm text-gray-400"><span className="font-medium text-gray-300">Description:</span> {event.description || "No description provided"}</div>
                        {event.about && (<div className="mb-4 text-sm text-gray-400"><span className="font-medium text-gray-300">About:</span> {event.about}</div>)}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-sm text-gray-300"><span className="font-medium">Date:</span> {event.date ? new Date(event.date).toLocaleString('en-IN') : "TBD"}</div>
                          <div className="text-sm text-gray-300"><span className="font-medium">Location:</span> {event.location?.venue || event.location?.type || "TBD"}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-sm text-gray-300"><span className="font-medium">Host:</span> {event.hostUserId?.name || event.organizer || "Unknown"}</div>
                          <div className="text-sm text-gray-300"><span className="font-medium">Organization:</span> {event.organizationName || "Not specified"}</div>
                        </div>
                        {event.tags && event.tags.length > 0 && (<div className="mb-4 text-sm text-gray-300"><span className="font-medium">Tags:</span> {event.tags.join(", ")}</div>)}
                        {event.requirements && event.requirements.length > 0 && (<div className="mb-4 text-sm text-gray-300"><span className="font-medium">Requirements:</span> {event.requirements.join(", ")}</div>)}
                        {event.sessions && event.sessions.length > 0 && (
                          <div className="mb-4">
                            <span className="font-medium text-gray-300 text-sm">Sessions:</span>
                            <ul className="text-sm text-gray-400 mt-1">
                              {event.sessions.map((session, idx) => (
                                <li key={idx}>- {session.title} by {session.speaker} at {session.time}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mb-4 text-sm text-gray-300">
                          <span className="font-medium">Features:</span> 
                          {event.features?.certificateEnabled ? " Certificates" : ""} 
                          {event.features?.chatEnabled ? " Chat" : ""} 
                          {!event.features?.certificateEnabled && !event.features?.chatEnabled ? " None" : ""}
                        </div>
                        {(event.socialLinks?.website || event.socialLinks?.linkedin) && (
                          <div className="mb-4 text-sm text-gray-300">
                            <span className="font-medium">Links:</span>
                            {event.socialLinks.website && <a href={event.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-[#9b5de5] ml-1">Website</a>}
                            {event.socialLinks.linkedin && <a href={event.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#9b5de5] ml-2">LinkedIn</a>}
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleEventVerification(event._id || event.id, 'verify')} disabled={actionLoading === (event._id || event.id)} className="flex-1 bg-[#28a745] hover:bg-[#218838] text-white px-4 py-2 rounded-lg font-medium transition-all">
                            {actionLoading === (event._id || event.id) ? "Processing..." : "Verify"}
                          </button>
                          <button onClick={() => handleEventVerification(event._id || event.id, 'reject')} disabled={actionLoading === (event._id || event.id)} className="flex-1 bg-[#dc3545] hover:bg-[#c82333] text-white px-4 py-2 rounded-lg font-medium transition-all">
                            {actionLoading === (event._id || event.id) ? "Processing..." : "Reject"}
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