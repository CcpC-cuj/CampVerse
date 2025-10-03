import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const QRViewer = () => {
  const { id } = useParams(); // eventId
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadQRCode();
  }, [id, user]);

  const loadQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/my-qr/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQrData(data.qrCode);
      } else {
        // Handle specific error cases
        if (response.status === 404) {
          setError(data.message || 'QR code not found. You may not be registered for this event.');
        } else if (response.status === 410) {
          setError(data.message || 'QR code has expired or been used.');
        } else {
          setError(data.message || data.error || 'Failed to load QR code.');
        }
      }
    } catch (err) {
      console.error('❌ Error loading QR code:', err);
      setError('Failed to load QR code. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const weekday = d.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const year = d.getUTCFullYear();
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate();
    let hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${weekday}, ${month} ${day}, ${year}, ${hours}:${formattedMinutes} ${ampm}`;
  };

  const isExpired = () => {
    if (!qrData?.expiresAt) return false;
    return new Date() > new Date(qrData.expiresAt);
  };

  const getTimeRemaining = () => {
    if (!qrData?.expiresAt) return null;
    const now = new Date();
    const expiry = new Date(qrData.expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const downloadQR = () => {
    if (!qrData?.image) return;
    
    const link = document.createElement('a');
    link.href = qrData.image;
    link.download = `QR-${qrData.eventTitle.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerateQR = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to regenerate your QR code? Your old QR code will no longer work.'
    );

    if (!confirmed) return;

    setRegenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${id}/regenerate-qr`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        alert('✅ QR code regenerated successfully! Check your email for the new QR code.');
        // Reload QR code
        await loadQRCode();
      } else {
        if (response.status === 410) {
          alert('❌ Cannot regenerate QR code for past events.');
        } else {
          alert(`❌ ${data.message || data.error || 'Failed to regenerate QR code'}`);
        }
      }
    } catch (err) {
      console.error('Error regenerating QR code:', err);
      alert('Failed to regenerate QR code. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading your QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
        <div className="bg-[rgba(21,23,41,0.95)] border border-red-500 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-white text-2xl font-bold mb-4">Unable to Load QR Code</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              ← Go Back
            </button>
            <button
              onClick={loadQRCode}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-white text-xl">QR code not available</div>
      </div>
    );
  }

  const expired = isExpired();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎫 Your Event QR Code</h1>
          <p className="text-purple-300">Show this QR code at the event for attendance</p>
        </div>

        {/* QR Code Card */}
        <div className="bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          {/* Event Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{qrData.eventTitle}</h2>
            <div className="space-y-1 text-purple-300">
              <p>📅 {formatDate(qrData.eventDate)}</p>
              <p>📍 {qrData.eventLocation}</p>
            </div>
          </div>

          {/* Status Banner */}
          {expired ? (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-red-300 font-semibold text-lg">⚠️ This QR code has expired</p>
              <p className="text-red-200 text-sm mt-2">Please contact the event organizer for assistance</p>
            </div>
          ) : qrData.expiresAt ? (
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-green-300 font-semibold">✅ QR Code Active</p>
              <p className="text-green-200 text-sm mt-1">{getTimeRemaining()}</p>
            </div>
          ) : (
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-6 text-center">
              <p className="text-blue-300 font-semibold">✅ QR Code Active</p>
            </div>
          )}

          {/* QR Code Image */}
          <div className="bg-white p-8 rounded-xl mb-6 flex items-center justify-center">
            <img 
              src={qrData.image} 
              alt="Event QR Code" 
              className={`max-w-full h-auto ${expired ? 'opacity-40 grayscale' : ''}`}
              style={{ maxWidth: '300px', width: '100%' }}
            />
          </div>

          {/* Expiry Info */}
          {qrData.expiresAt && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
              <div className="text-center">
                <p className="text-purple-300 text-sm mb-1">Expires At</p>
                <p className="text-white font-semibold">{formatDate(qrData.expiresAt)}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 mb-6">
            <h3 className="text-purple-300 font-semibold text-lg mb-3">📋 Instructions</h3>
            <ul className="space-y-2 text-white">
              <li className="flex items-start">
                <span className="mr-2">1️⃣</span>
                <span>Save this page or take a screenshot of the QR code</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2️⃣</span>
                <span>Show this QR code to the event staff upon arrival</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3️⃣</span>
                <span>Your attendance will be marked instantly after scanning</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">⚠️</span>
                <span>This QR code can only be used once and expires after the event</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate(`/events/${id}`)}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              📄 View Event Details
            </button>
            <button
              onClick={downloadQR}
              disabled={expired}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                expired
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              💾 Download QR Code
            </button>
          </div>
          
          {/* Regenerate QR Button */}
          {expired && (
            <div className="mt-4">
              <button
                onClick={handleRegenerateQR}
                disabled={regenerating}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                  regenerating
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate QR Code'}
              </button>
              <p className="text-purple-300 text-sm text-center mt-2">
                Generate a new QR code if this one has expired
              </p>
            </div>
          )}

          {/* Support Link */}
          <div className="mt-6 text-center">
            <p className="text-purple-300 text-sm">
              Need help? <a href="/support" className="text-blue-400 hover:text-blue-300 underline">Contact Support</a>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-purple-400 text-sm">
            🔒 This QR code is unique to you. Do not share it with others.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRViewer;
