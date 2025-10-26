
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { listEvents } from "../api/events";

export default function EventVerificationQueue() {
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPendingEvents() {
      setLoading(true);
      try {
        const res = await listEvents({ status: "pending-verification" });
        setPendingEvents(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        setPendingEvents([]);
      }
      setLoading(false);
    }
    fetchPendingEvents();
  }, []);

  return (
    <Layout>
      <div style={{ padding: "2rem" }}>
        <h3>Event Verification Queue</h3>
        {loading ? (
          <p>Loading events...</p>
        ) : pendingEvents.length === 0 ? (
          <p>No events pending verification.</p>
        ) : (
          <ul>
            {pendingEvents.map(event => (
              <li key={event._id || event.id}>
                <strong>{event.name}</strong> &mdash; {event.date}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}