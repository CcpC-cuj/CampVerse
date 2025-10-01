import { useState, useEffect } from 'react';
import { getEventParticipants, getEventAnalytics } from '../api/events';

export const useEventParticipants = (eventId) => {
  const [participants, setParticipants] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchParticipants = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both participants and analytics
      const [participantsResponse, analyticsResponse] = await Promise.allSettled([
        getEventParticipants(eventId),
        getEventAnalytics(eventId)
      ]);

      // Handle participants response
      if (participantsResponse.status === 'fulfilled') {
        const participantsData = participantsResponse.value;
        if (Array.isArray(participantsData)) {
          setParticipants(participantsData);
        } else if (participantsData.success && participantsData.data) {
          setParticipants(participantsData.data);
        } else {
          console.warn('Unexpected participants response format:', participantsData);
          setParticipants([]);
        }
      } else {
        console.error('Failed to fetch participants:', participantsResponse.reason);
        setParticipants([]);
      }

      // Handle analytics response
      if (analyticsResponse.status === 'fulfilled') {
        const analyticsData = analyticsResponse.value;
        if (analyticsData.success && analyticsData.data) {
          setAnalytics(analyticsData.data);
        } else {
          console.warn('Unexpected analytics response format:', analyticsData);
        }
      } else {
        console.error('Failed to fetch analytics:', analyticsResponse.reason);
      }

    } catch (err) {
      console.error('Error fetching event data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [eventId]);

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