import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { getAllTickets, updateTicket, getSupportAnalytics, getTicketById } from "../api/support";

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];
const TOPIC_OPTIONS = ["general", "bug", "billing", "feature", "events", "other"];

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", topic: "", priority: "" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters, page]);

  const loadAnalytics = async () => {
    try {
      const res = await getSupportAnalytics();
      setAnalytics(res?.data || res || null);
    } catch {
      setAnalytics(null);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllTickets({
        ...filters,
        page,
        limit: 20,
      });
      setTickets(res?.tickets || []);
      setPagination(res?.pagination || null);
    } catch (err) {
      setError("Failed to load tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (ticketId, payload) => {
    setUpdatingId(ticketId);
    try {
      await updateTicket(ticketId, payload);
      await loadTickets();
    } catch {
      setError("Failed to update ticket.");
    } finally {
      setUpdatingId(null);
    }
  };
  
  const handleViewDetails = async (ticketId) => {
    setDetailsLoading(true);
    try {
      const res = await getTicketById(ticketId);
      setSelectedTicket(res?.ticket || res || null);
    } catch {
      setSelectedTicket({ error: "Failed to load ticket." });
    } finally {
      setDetailsLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (!analytics) return null;
    return {
      total: analytics.totalTickets || 0,
      open: analytics.openTickets || 0,
      resolved: analytics.resolvedTickets || 0,
    };
  }, [analytics]);

  return (
    <Layout title="Support Tickets">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Tickets</p>
            <p className="text-2xl font-bold text-white">{stats?.total ?? "—"}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-4">
            <p className="text-blue-300 text-sm">Open</p>
            <p className="text-2xl font-bold text-blue-200">{stats?.open ?? "—"}</p>
          </div>
          <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4">
            <p className="text-green-300 text-sm">Resolved</p>
            <p className="text-2xl font-bold text-green-200">{stats?.resolved ?? "—"}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 flex flex-col md:flex-row gap-3">
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filters.topic}
            onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))}
            className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Topics</option>
            {TOPIC_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Tickets */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
          {loading ? (
            <div className="text-gray-300">Loading tickets...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : tickets.length === 0 ? (
            <div className="text-gray-400">No tickets found.</div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <SupportTicketCard
                  key={ticket._id}
                  ticket={ticket}
                  onUpdate={handleUpdate}
                  onViewDetails={handleViewDetails}
                  updating={updatingId === ticket._id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-gray-800/60 border border-gray-700 rounded-lg text-white"
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="text-gray-300 px-2">Page {pagination.page} of {pagination.pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              className="px-3 py-1 bg-gray-800/60 border border-gray-700 rounded-lg text-white"
              disabled={page === pagination.pages}
            >
              Next
            </button>
          </div>
        )}
      </div>
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Ticket Details</h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {detailsLoading ? (
              <p className="text-gray-300">Loading...</p>
            ) : selectedTicket?.error ? (
              <p className="text-red-400">{selectedTicket.error}</p>
            ) : (
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(selectedTicket, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function SupportTicketCard({ ticket, onUpdate, onViewDetails, updating }) {
  const [status, setStatus] = useState(ticket.status || "open");
  const [priority, setPriority] = useState(ticket.priority || "medium");
  const [note, setNote] = useState("");

  const handleSave = () => {
    onUpdate(ticket._id, {
      status,
      priority,
      adminNotes: note,
    });
    setNote("");
  };

  return (
    <div className="bg-gray-900/60 border border-gray-700/40 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="text-white font-semibold">{ticket.subject}</h4>
          <p className="text-sm text-gray-400">{ticket.topic} • {ticket.ticketId}</p>
          <p className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-gray-800/60 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-gray-800/60 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-gray-300 mt-3 whitespace-pre-wrap">{ticket.message}</p>

      {ticket.attachment?.url && (
        <a
          href={ticket.attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
        >
          View Attachment
        </a>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add admin note (optional)"
          className="flex-1 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
        />
        <button
          onClick={handleSave}
          disabled={updating}
          className="px-4 py-2 bg-[#9b5de5] hover:bg-[#8c4be1] rounded-lg text-white text-sm disabled:opacity-60"
        >
          {updating ? "Updating..." : "Update"}
        </button>
        <button
          onClick={() => onViewDetails(ticket._id)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
