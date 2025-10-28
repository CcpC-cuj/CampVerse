
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
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
        const res = await listEvents({ status: "pending-verification" });
        setPendingEvents(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error('Error fetching events:', e);
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
          // Refresh the list
          const res = await listEvents({ status: "pending-verification" });
          setPendingEvents(Array.isArray(res?.data) ? res.data : []);
        } else {
          alert('Failed to verify event: ' + (result.error || 'Unknown error'));
        }
      } else if (action === 'reject') {
        const reason = prompt('Please provide a reason for rejection (optional):');
        result = await rejectEvent(eventId, reason);
        if (result.success !== false) {
          alert('Event rejected successfully!');
          // Refresh the list
          const res = await listEvents({ status: "pending-verification" });
          setPendingEvents(Array.isArray(res?.data) ? res.data : []);
        } else {
          alert('Failed to reject event: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} event:`, error);
      alert(`Failed to ${action} event`);
    }
    setActionLoading(null);
  };

  return (
    <Layout user={user} roles={user?.roles}>
      <div style={{ padding: "2rem" }}>
        <h3>Event Verification Queue</h3>
        {loading ? (
          <p>Loading events...</p>
        ) : pendingEvents.length === 0 ? (
          <p>No events pending verification.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {pendingEvents.map(event => (
              <li key={event._id || event.id} style={{ 
                border: "1px solid #ddd", 
                padding: "1rem", 
                marginBottom: "1rem",
                borderRadius: "8px"
              }}>
                <div>
                  <strong>{event.name}</strong> &mdash; {event.date}
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>
                  Host: {event.hostUserId?.name || "Unknown"} | Location: {event.location?.venue || event.location?.type || "TBD"}
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <button 
                    onClick={() => handleEventVerification(event._id || event.id, 'verify')}
                    disabled={actionLoading === (event._id || event.id)}
                    style={{ 
                      background: "#28a745", 
                      color: "white", 
                      border: "none", 
                      padding: "0.5rem 1rem", 
                      borderRadius: "4px",
                      marginRight: "0.5rem",
                      cursor: actionLoading === (event._id || event.id) ? "not-allowed" : "pointer"
                    }}
                  >
                    {actionLoading === (event._id || event.id) ? "Processing..." : "Verify Event"}
                  </button>
                  <button 
                    onClick={() => handleEventVerification(event._id || event.id, 'reject')}
                    disabled={actionLoading === (event._id || event.id)}
                    style={{ 
                      background: "#dc3545", 
                      color: "white", 
                      border: "none", 
                      padding: "0.5rem 1rem", 
                      borderRadius: "4px",
                      cursor: actionLoading === (event._id || event.id) ? "not-allowed" : "pointer"
                    }}
                  >
                    {actionLoading === (event._id || event.id) ? "Processing..." : "Reject Event"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}