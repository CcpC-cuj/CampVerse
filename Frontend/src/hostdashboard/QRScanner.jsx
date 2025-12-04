import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, attended: 0, percentage: 0 });
  const scannerRef = useRef(null);
  const html5QrCodeScannerRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadEventDetails();
    loadScanHistory();
  }, [eventId, user]);

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.clear().catch(() => {
          // Error clearing scanner - silently ignore
        });
      }
    };
  }, []);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setEvent(data.data);
        // Check if user is host or co-host
        const isHost = data.data.hostId === user.id;
        const isCoHost = data.data.coHosts?.some(ch => ch._id === user.id);
        if (!isHost && !isCoHost) {
          alert('⛔ You do not have permission to scan QR codes for this event.');
          navigate('/host/manage-events');
        }
      } else {
        alert('Failed to load event details');
        navigate('/host/manage-events');
      }
    } catch (err) {
      alert('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const loadScanHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setScanHistory(data.attendees || []);
        setStats({
          total: data.totalRegistered || 0,
          attended: data.attendees?.length || 0,
          percentage: data.totalRegistered > 0 
            ? Math.round((data.attendees?.length / data.totalRegistered) * 100) 
            : 0
        });
      }
    } catch (err) {
      // Failed to load scan history - silently ignore
    }
  };

  const startScanner = () => {
    if (scanning) return;

    setScanning(true);
    setScanResult(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    const html5QrCodeScanner = new Html5QrcodeScanner(
      'qr-reader',
      config,
      false
    );

    html5QrCodeScannerRef.current = html5QrCodeScanner;

    html5QrCodeScanner.render(
      async (decodedText) => {
        // Success callback - pause scanner immediately
        try {
          if (html5QrCodeScannerRef.current) {
            await html5QrCodeScannerRef.current.pause(true);
          }
        } catch (err) {
          // Scanner pause info - silently ignore
        }
        
        await handleScan(decodedText);
        
        // Resume scanner after a delay
        setTimeout(() => {
          try {
            if (html5QrCodeScannerRef.current) {
              html5QrCodeScannerRef.current.resume();
            }
          } catch (err) {
            // Scanner resume info - silently ignore
          }
        }, 2000);
      },
      (errorMessage) => {
        // Error callback - ignore common scanning errors
        // console.log('Scan error:', errorMessage);
      }
    );
  };

  const stopScanner = () => {
    if (html5QrCodeScannerRef.current) {
      html5QrCodeScannerRef.current.clear().catch(() => {
        // Error clearing scanner - silently ignore
      });
      html5QrCodeScannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (qrToken) => {
    if (!qrToken) return;

    if (!eventId) {
      setScanResult({
        success: false,
        message: 'Event ID is required. Please refresh the page.',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = { eventId, qrToken };
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/scan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setScanResult({
          success: true,
          message: data.message || 'Attendance marked successfully!',
          user: data.user,
          timestamp: new Date().toISOString(),
        });
        // Reload scan history to update stats
        await loadScanHistory();
        // Play success sound (optional)
        playSuccessSound();
      } else {
        setScanResult({
          success: false,
          message: data.message || data.error || 'Failed to mark attendance',
          error: data.error,
        });
        // Play error sound (optional)
        playErrorSound();
      }
    } catch (err) {
      setScanResult({
        success: false,
        message: 'Failed to scan QR code. Please try again.',
      });
      playErrorSound();
    }
  };

  const handleManualScan = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      alert('Please enter a QR token');
      return;
    }
    await handleScan(manualToken.trim());
    setManualToken('');
  };

  const playSuccessSound = () => {
    // Create a simple success beep
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playErrorSound = () => {
    // Create a simple error beep
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 300;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/host/manage-events')}
            className="text-purple-300 hover:text-purple-200 mb-4 flex items-center gap-2"
          >
            ← Back to Events
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">📷 QR Code Scanner</h1>
          <p className="text-purple-300">{event?.title}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[rgba(21,23,41,0.95)] border border-blue-500 backdrop-blur-lg rounded-xl p-6">
            <div className="text-blue-300 text-sm font-semibold mb-2">Total Registered</div>
            <div className="text-4xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-green-500 backdrop-blur-lg rounded-xl p-6">
            <div className="text-green-300 text-sm font-semibold mb-2">Attended</div>
            <div className="text-4xl font-bold text-white">{stats.attended}</div>
          </div>
          <div className="bg-[rgba(21,23,41,0.95)] border border-purple-500 backdrop-blur-lg rounded-xl p-6">
            <div className="text-purple-300 text-sm font-semibold mb-2">Attendance Rate</div>
            <div className="text-4xl font-bold text-white">{stats.percentage}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Scan QR Code</h2>

            {/* Scanner Toggle */}
            <div className="mb-6">
              {!scanning ? (
                <button
                  onClick={startScanner}
                  className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg transition-colors"
                >
                  📷 Start Camera Scanner
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-lg transition-colors"
                >
                  ⏹️ Stop Scanner
                </button>
              )}
            </div>

            {/* QR Scanner Container */}
            <div
              id="qr-reader"
              ref={scannerRef}
              className={`${scanning ? 'block' : 'hidden'} mb-6 rounded-lg overflow-hidden`}
            ></div>

            {/* Manual Entry */}
            <div className="border-t border-purple-500/30 pt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Manual Token Entry</h3>
              <form onSubmit={handleManualScan} className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Enter QR token..."
                  className="flex-1 px-4 py-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Submit
                </button>
              </form>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div
                className={`mt-6 p-4 rounded-lg border ${
                  scanResult.success
                    ? 'bg-green-900/30 border-green-500'
                    : 'bg-red-900/30 border-red-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{scanResult.success ? '✅' : '❌'}</span>
                  <span
                    className={`font-semibold text-lg ${
                      scanResult.success ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {scanResult.success ? 'Success!' : 'Failed'}
                  </span>
                </div>
                <p className={scanResult.success ? 'text-green-200' : 'text-red-200'}>
                  {scanResult.message}
                </p>
                {scanResult.user && (
                  <div className="mt-3 text-white">
                    <p>
                      <strong>Name:</strong> {scanResult.user.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {scanResult.user.email}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Scans */}
          <div className="bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Recent Scans</h2>
              <button
                onClick={loadScanHistory}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {scanHistory.length === 0 ? (
                <div className="text-center py-8 text-purple-300">
                  No attendees yet. Start scanning QR codes!
                </div>
              ) : (
                scanHistory.map((attendee, index) => (
                  <div
                    key={attendee._id || index}
                    className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">{attendee.userId?.name || 'Unknown'}</h4>
                        <p className="text-purple-300 text-sm">{attendee.userId?.email || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-green-400 text-sm">✅ Attended</span>
                        <p className="text-purple-300 text-xs mt-1">
                          {formatTime(attendee.scanTime || attendee.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
