import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventById, rsvpEvent, cancelRsvp } from '../api/events';
import { useAuth } from '../contexts/AuthContext';
import ShareButton from '../userdashboard/ShareButton';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRsvped, setIsRsvped] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await getEventById(id);
      if (response.success && response.data) {
        setEvent(response.data);
        // Check if user is already registered
        setIsRsvped(response.data.userRegistration ? true : false);
      } else {
        setError('Event not found');
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    if (!user) {
      // Please log in to register for events (alert removed)
      return;
    }

    try {
      const response = isRsvped ? await cancelRsvp(id) : await rsvpEvent(id);
      if (response.success) {
        setIsRsvped(!isRsvped);
          // RSVP ${isRsvped ? 'cancelled' : 'successful'}! (alert removed)
      } else {
          // RSVP failed (alert removed)
      }
    } catch (err) {
      console.error('RSVP error:', err);
        // Error processing RSVP (alert removed)
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  if (!event) return <div className="flex justify-center items-center min-h-screen">Event not found</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {event.bannerURL && (
            <img 
              src={event.bannerURL} 
              alt={event.title}
              className="w-full h-64 object-cover"
            />
          )}
          
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
              <ShareButton event={event} />
            </div>
            
            <p className="text-gray-600 mb-6">{event.description}</p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Event Details</h3>
                <p><strong>Date:</strong> {formatDate(event.date)}</p>
                <p><strong>Location:</strong> {event.location?.venue || 'Online'}</p>
                <p><strong>Category:</strong> {event.category}</p>
                <p><strong>Organization:</strong> {event.organizationName}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Registration</h3>
                <p><strong>Capacity:</strong> {event.capacity}</p>
                <p><strong>Status:</strong> {event.status}</p>
                <p><strong>Type:</strong> {event.isPaid ? `Paid (₹${event.price})` : 'Free'}</p>
              </div>
            </div>
            
            {event.requirements && event.requirements.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
                <ul className="list-disc list-inside text-gray-600">
                  {event.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              
              {user && event.verificationStatus === 'approved' && (
                <button
                  onClick={handleRSVP}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    isRsvped
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRsvped ? 'Cancel Registration' : 'Register for Event'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;