import React, { useEffect, useState } from "react";
import { getMyTickets } from "../api/support";

const SupportTicketHistoryModal = ({ open, onClose }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLoading(true);
      getMyTickets()
        .then((res) => {
          setTickets(res || []);
          setError("");
        })
        .catch(() => setError("Failed to load tickets."))
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-900 rounded-xl shadow-lg w-full max-w-2xl p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <i className="ri-close-line text-2xl" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-white">My Support Tickets</h2>
        {loading ? (
          <div className="text-gray-300">Loading...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="text-gray-400">No tickets found.</div>
        ) : (
          <ul className="space-y-4 max-h-[400px] overflow-y-auto">
            {tickets.map((t) => (
              <li key={t._id} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-white">{t.subject}</span>
                  <span className={`px-2 py-1 rounded text-xs ${t.status === "resolved" ? "bg-green-700 text-green-200" : "bg-yellow-700 text-yellow-200"}`}>{t.status}</span>
                </div>
                <div className="text-gray-300 text-sm mb-1">{t.topic}</div>
                <div className="text-gray-400 text-xs">Created: {new Date(t.createdAt).toLocaleString()}</div>
                <div className="text-gray-300 mt-2">{t.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SupportTicketHistoryModal;
