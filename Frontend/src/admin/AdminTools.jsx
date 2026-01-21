import React, { useState } from "react";
import Layout from "../components/Layout";
import {
  getAdvancedEventAnalytics,
  getUserAnalytics,
  getUserActivityTimeline,
  getZeroResultSearches,
  getEventQrCode,
  getGoogleCalendarLink,
  searchEvents,
} from "../api/events";
import { getInstitutionDashboard, requestInstitutionVerification } from "../api/institution";
import { getCertificatesForUser, getCertificateById, getCertificateStats, verifyCertificate, exportAttendedUsers } from "../api/certificates";

export default function AdminTools() {
  const [eventId, setEventId] = useState("");
  const [userId, setUserId] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const [certificateQr, setCertificateQr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn) => {
    setLoading(true);
    setError("");
    setOutput(null);
    try {
      const res = await fn();
      setOutput(res);
    } catch (err) {
      setError(err?.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const requireId = (value, label, fn) => {
    if (!value) {
      setError(`${label} is required.`);
      return;
    }
    run(fn);
  };

  return (
    <Layout title="Admin Tools">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
          <p className="text-gray-300 text-sm">
            Quick access to advanced analytics and admin-only APIs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event tools */}
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white">Event Tools</h3>
            <input
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Event ID"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => requireId(eventId, 'Event ID', () => getAdvancedEventAnalytics(eventId))}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                Advanced Analytics
              </button>
              <button
                onClick={() => requireId(eventId, 'Event ID', () => getEventQrCode(eventId))}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Event QR Code
              </button>
              <button
                onClick={() => requireId(eventId, 'Event ID', () => getGoogleCalendarLink(eventId))}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
              >
                Google Calendar Link
              </button>
            </div>
          </div>

          {/* User tools */}
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white">User Tools</h3>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => requireId(userId, 'User ID', () => getUserAnalytics(userId))}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                User Analytics
              </button>
              <button
                onClick={() => requireId(userId, 'User ID', () => getUserActivityTimeline(userId))}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Activity Timeline
              </button>
              <button
                onClick={() => requireId(userId, 'User ID', () => getCertificatesForUser(userId))}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm"
              >
                Certificates
              </button>
            </div>
          </div>

          {/* Certificate tools */}
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white">Certificate Tools</h3>
            <input
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              placeholder="Certificate ID"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
            <textarea
              value={certificateQr}
              onChange={(e) => setCertificateQr(e.target.value)}
              placeholder="Certificate QR JSON"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white h-24"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => run(() => getCertificateById(certificateId))}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                Get Certificate
              </button>
              <button
                onClick={() => run(() => getCertificateStats())}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Certificate Stats
              </button>
              <button
                onClick={() => run(() => verifyCertificate({ qrCode: certificateQr }))}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
              >
                Verify Certificate
              </button>
              <button
                onClick={() => run(() => exportAttendedUsers(eventId))}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm"
              >
                Export Attended Users
              </button>
            </div>
          </div>

          {/* Institution tools */}
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white">Institution Tools</h3>
            <input
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              placeholder="Institution ID"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => run(() => getInstitutionDashboard(institutionId))}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                Institution Dashboard
              </button>
              <button
                onClick={() => run(() => requestInstitutionVerification(institutionId, {}))}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Request Verification (Legacy)
              </button>
            </div>
          </div>

          {/* Search tools */}
          <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-semibold text-white">Search Tools</h3>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search query"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
            <button
              onClick={() => run(() => searchEvents(searchQuery))}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Search Events
            </button>
            <button
              onClick={() => run(() => getZeroResultSearches())}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              Zero Result Searches
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 min-h-[200px]">
          {loading ? (
            <p className="text-gray-300">Loading...</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : output ? (
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(output, null, 2)}</pre>
          ) : (
            <p className="text-gray-500 text-sm">Run a tool to see output.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
