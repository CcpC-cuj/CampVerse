import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { useToast } from '../components/Toast';

const AcceptNomination = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const token = searchParams.get('token');
    const eventId = searchParams.get('eventId');
    
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState('pending'); // pending, accepted, rejected, error
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (!eventId || !token) {
                setStatus('error');
                setLoading(false);
                return;
            }
            try {
                // Fetch public event details
                const res = await api.get(`/events/public/${eventId}`);
                setEvent(res.data.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setStatus('error');
                setLoading(false);
            }
        };
        fetchEventDetails();
    }, [eventId, token]);

    const handleResponse = async (action) => {
        setSubmitting(true);
        try {
            const res = await api.post('/events/cohost-response', {
                eventId,
                token,
                action,
                remarks: remarks.trim() || undefined
            });
            
            if (res.data.success) {
                setStatus(action === 'accept' ? 'accepted' : 'rejected');
                // View will update based on status, no toast needed
            }
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || 'Failed to process invitation';
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f111a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#1a1c2e] border border-red-900/50 rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h2>
                    <p className="text-gray-400 mb-6">This invitation link is invalid, expired, or has already been used.</p>
                    <button onClick={() => navigate('/')} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'accepted') {
        return (
            <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#1a1c2e] border border-green-900/50 rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-white mb-2">You're a Co-host!</h2>
                    <p className="text-gray-400 mb-6">You have successfully accepted the invitation for <strong>{event?.title}</strong>.</p>
                    <button onClick={() => navigate('/host/events')} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        View My Events
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'rejected') {
        return (
            <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#1a1c2e] border border-gray-800 rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">🤝</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Invitation Declined</h2>
                    <p className="text-gray-400 mb-6">You have declined the invitation to co-host <strong>{event?.title}</strong>.</p>
                    <button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f111a] py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-[#1a1c2e] border border-purple-500/30 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Header/Banner */}
                    <div className="h-48 bg-gradient-to-r from-purple-900 to-indigo-900 relative">
                        {event?.bannerURL && (
                            <img src={event.bannerURL} alt="Banner" className="w-full h-full object-cover opacity-50" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h1 className="text-3xl font-bold text-white text-center px-4">Co-host Invitation</h1>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-8">
                            {event?.logoURL ? (
                                <img src={event.logoURL} alt="Logo" className="w-16 h-16 rounded-full border-2 border-purple-500/50" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-purple-700 flex items-center justify-center text-2xl">🎪</div>
                            )}
                            <div>
                                <h2 className="text-2xl font-bold text-white">{event?.title}</h2>
                                <p className="text-purple-400">{event?.organizationName || 'Organized by Host'}</p>
                            </div>
                        </div>

                        <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-6 mb-8">
                            <p className="text-gray-300 leading-relaxed mb-4">
                                You have been invited to join the management team for this event as a co-host. 
                                As a co-host, you will be able to manage participants, mark attendance, and view analytics.
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span>📅</span> {new Date(event?.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>📍</span> {event?.location?.venue || event?.location?.type || 'Multiple Locations'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Optional Message (for the host)</label>
                                <textarea 
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Any message you'd like to send..."
                                    className="w-full bg-black/30 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all h-24"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={() => handleResponse('reject')}
                                    disabled={submitting}
                                    className="px-6 py-4 bg-transparent border border-gray-700 text-gray-400 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={() => handleResponse('accept')}
                                    disabled={submitting}
                                    className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Processing...' : 'Accept Invitation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcceptNomination;
