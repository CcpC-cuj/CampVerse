import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getPlatformInsights, getVerifierAnalytics } from "../api/events";

export default function VerifierAnalytics() {
  const [platformAnalytics, setPlatformAnalytics] = useState(null);
  const [verifierStats, setVerifierStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [platformRes, verifierRes] = await Promise.all([
          getPlatformInsights(),
          getVerifierAnalytics()
        ]);
        setPlatformAnalytics(platformRes?.data || platformRes || null);
        setVerifierStats(verifierRes?.data || verifierRes || null);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setPlatformAnalytics(null);
        setVerifierStats(null);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  const StatCard = ({ title, value, icon, color = "purple" }) => (
    <div className="bg-[#141a45] rounded-lg p-4 sm:p-6 border border-gray-700/40 shadow hover:shadow-[0_0_15px_rgba(155,93,229,0.25)] transition-all">
      <div className="flex items-center justify-between mb-2">
        <i className={`${icon} text-xl sm:text-2xl text-${color}-400`} />
        <span className={`text-2xl sm:text-3xl font-bold text-${color}-300`}>{value || 0}</span>
      </div>
      <h4 className="text-xs sm:text-sm font-medium text-gray-400">{title}</h4>
    </div>
  );

  return (
    <Layout title="Verifier Analytics">
              
              {loading ? (
                <div className="flex items-center justify-center gap-3 text-gray-300 py-20">
                  <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
                  <span className="text-lg">Loading analytics...</span>
                </div>
              ) : (
                <>
                  {/* Your Verification Stats */}
                  <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/40 mb-8">
                    <h3 className="text-2xl font-semibold mb-6 text-[#9b5de5]">Your Verification Stats</h3>
                    {verifierStats ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard 
                          title="Events Verified" 
                          value={verifierStats.eventsVerified} 
                          icon="ri-calendar-check-line"
                        />
                        <StatCard 
                          title="Institutions Verified" 
                          value={verifierStats.institutionsVerified} 
                          icon="ri-building-2-line"
                        />
                        <StatCard 
                          title="Certificates Reviewed" 
                          value={verifierStats.certificatesReviewed} 
                          icon="ri-file-check-line"
                        />
                        <StatCard 
                          title="Avg Review Time (hrs)" 
                          value={verifierStats.avgReviewTime || 'N/A'} 
                          icon="ri-time-line"
                        />
                      </div>
                    ) : (
                      <div className="text-gray-400 text-lg">No personal stats available yet. Start verifying to see your stats!</div>
                    )}
                  </div>

                  {/* Platform Overview */}
                  <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/40 mb-8">
                    <h3 className="text-2xl font-semibold mb-6 text-[#9b5de5]">Platform Overview</h3>
                    {platformAnalytics ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard 
                          title="Total Users" 
                          value={platformAnalytics.totalUsers} 
                          icon="ri-user-3-line"
                          color="blue"
                        />
                        <StatCard 
                          title="Total Events" 
                          value={platformAnalytics.totalEvents} 
                          icon="ri-calendar-line"
                          color="green"
                        />
                        <StatCard 
                          title="Total Certificates" 
                          value={platformAnalytics.totalCertificates} 
                          icon="ri-award-line"
                          color="yellow"
                        />
                        <StatCard 
                          title="Total Participations" 
                          value={platformAnalytics.totalParticipations} 
                          icon="ri-group-line"
                          color="pink"
                        />
                      </div>
                    ) : (
                      <div className="text-gray-400 text-lg">Platform analytics unavailable.</div>
                    )}
                  </div>

                  {/* Participation Breakdown */}
                  {platformAnalytics && (
                    <div className="bg-gray-800/60 rounded-xl p-4 sm:p-8 border border-gray-700/40">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-[#9b5de5]">Participation Breakdown</h3>
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
                        <div className="bg-green-900/30 rounded-lg p-4 sm:p-6 border border-green-700/40">
                          <div className="flex items-center gap-3 mb-2">
                            <i className="ri-check-double-line text-xl sm:text-2xl text-green-400" />
                            <span className="text-xl sm:text-2xl font-bold text-green-300">{platformAnalytics.totalAttended || 0}</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-medium text-green-400">Attended</h4>
                        </div>
                        <div className="bg-blue-900/30 rounded-lg p-4 sm:p-6 border border-blue-700/40">
                          <div className="flex items-center gap-3 mb-2">
                            <i className="ri-user-add-line text-xl sm:text-2xl text-blue-400" />
                            <span className="text-xl sm:text-2xl font-bold text-blue-300">{platformAnalytics.totalRegistered || 0}</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-medium text-blue-400">Registered</h4>
                        </div>
                        <div className="bg-yellow-900/30 rounded-lg p-4 sm:p-6 border border-yellow-700/40">
                          <div className="flex items-center gap-3 mb-2">
                            <i className="ri-time-line text-xl sm:text-2xl text-yellow-400" />
                            <span className="text-xl sm:text-2xl font-bold text-yellow-300">{platformAnalytics.totalWaitlisted || 0}</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-medium text-yellow-400">Waitlisted</h4>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
    </Layout>
  );
}
