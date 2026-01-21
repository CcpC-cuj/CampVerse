import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { getAllFeedback, updateFeedbackStatus, getFeedbackAnalytics } from "../api/feedback";

const STATUS_OPTIONS = ["pending", "reviewed", "resolved"];
const CATEGORY_OPTIONS = ["ui", "bug", "feature", "performance", "events", "other"];

export default function FeedbackManagement() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({ status: "", category: "" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [filters, page]);

  const loadAnalytics = async () => {
    try {
      const res = await getFeedbackAnalytics();
      setAnalytics(res?.data || res || null);
    } catch {
      setAnalytics(null);
    }
  };

  const loadFeedback = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllFeedback({
        ...filters,
        page,
        limit: 20,
      });
      setFeedbackList(res?.feedback || []);
      setPagination(res?.pagination || null);
    } catch {
      setError("Failed to load feedback.");
      setFeedbackList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, payload) => {
    setUpdatingId(id);
    try {
      await updateFeedbackStatus(id, payload);
      await loadFeedback();
    } catch {
      setError("Failed to update feedback.");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    if (!analytics) return null;
    return {
      total: analytics.totalFeedback || 0,
      pending: analytics.pendingFeedback || 0,
      resolved: analytics.resolvedFeedback || 0,
    };
  }, [analytics]);

  return (
    <Layout title="Feedback Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Feedback</p>
            <p className="text-2xl font-bold text-white">{stats?.total ?? "—"}</p>
          </div>
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl p-4">
            <p className="text-amber-300 text-sm">Pending</p>
            <p className="text-2xl font-bold text-amber-200">{stats?.pending ?? "—"}</p>
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
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Feedback list */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
          {loading ? (
            <div className="text-gray-300">Loading feedback...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : feedbackList.length === 0 ? (
            <div className="text-gray-400">No feedback found.</div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((fb) => (
                <FeedbackCard
                  key={fb._id}
                  feedback={fb}
                  onUpdate={handleUpdate}
                  updating={updatingId === fb._id}
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
    </Layout>
  );
}

function FeedbackCard({ feedback, onUpdate, updating }) {
  const [status, setStatus] = useState(feedback.status || "pending");
  const [note, setNote] = useState("");

  const handleSave = () => {
    onUpdate(feedback._id, { status, adminNotes: note });
    setNote("");
  };

  return (
    <div className="bg-gray-900/60 border border-gray-700/40 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="text-white font-semibold">{feedback.subject}</h4>
          <p className="text-sm text-gray-400">{feedback.category} • Rating: {feedback.rating}/5</p>
          <p className="text-xs text-gray-500">{new Date(feedback.createdAt).toLocaleString()}</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-gray-800/60 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <p className="text-gray-300 mt-3 whitespace-pre-wrap">{feedback.message}</p>

      {feedback.attachment?.url && (
        <a
          href={feedback.attachment.url}
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
      </div>
    </div>
  );
}
