import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getUserBadges } from "../api/user";

export default function UserBadges() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getUserBadges();
      const list = res?.data?.badges || res?.badges || res || [];
      setBadges(Array.isArray(list) ? list : []);
    } catch {
      setError("Failed to load badges.");
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="My Badges">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Badges</h2>
            <button
              onClick={loadBadges}
              className="px-3 py-2 bg-[#9b5de5]/20 text-[#9b5de5] rounded-lg hover:bg-[#9b5de5]/30 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-gray-300">Loading badges...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : badges.length === 0 ? (
            <div className="text-gray-400">No badges earned yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div key={badge._id || badge.id || badge.name} className="bg-gray-900/60 border border-gray-700/40 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-1">{badge.name || 'Badge'}</h3>
                  <p className="text-gray-400 text-sm mb-2">{badge.description || ''}</p>
                  {badge.earnedAt && (
                    <p className="text-gray-500 text-xs">Earned: {new Date(badge.earnedAt).toLocaleDateString()}</p>
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
