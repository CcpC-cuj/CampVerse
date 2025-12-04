import React, { useState, useEffect } from 'react';
import { getEventParticipants, getEventAnalytics } from '../api/events';


export const useEventParticipants = (eventId, options = {}) => {
  const [participants, setParticipants] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = React.useRef();

  const fetchParticipants = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const [participantsResponse, analyticsResponse] = await Promise.allSettled([
        getEventParticipants(eventId),
        getEventAnalytics(eventId)
      ]);
      if (participantsResponse.status === 'fulfilled') {
        const participantsData = participantsResponse.value;
        if (Array.isArray(participantsData)) {
          setParticipants(participantsData);
        } else if (participantsData.success && participantsData.data) {
          setParticipants(participantsData.data);
        } else {
          setParticipants([]);
        }
      } else {
        setParticipants([]);
      }
      if (analyticsResponse.status === 'fulfilled') {
        const analyticsData = analyticsResponse.value;
        if (analyticsData.success && analyticsData.data) {
          setAnalytics(analyticsData.data);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    if (options.autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchParticipants, options.refreshInterval || 60000);
      return () => clearInterval(intervalRef.current);
    }
    // Clean up interval if not using autoRefresh
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [eventId, options.autoRefresh, options.refreshInterval]);

  const participantStats = {
    total: participants.length,
    registered: participants.filter(p => p.status === 'registered').length,
    waitlisted: participants.filter(p => p.status === 'waitlisted').length,
    attended: participants.filter(p => p.status === 'attended').length,
    pending: participants.filter(p => p.status === 'pending').length,
  };

  return {
    participants,
    analytics,
    participantStats,
    loading,
    error,
    refetch: fetchParticipants
  };
};

export default useEventParticipants;