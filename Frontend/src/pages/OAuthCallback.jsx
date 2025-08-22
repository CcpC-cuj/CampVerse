import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleSignIn } from '../api';
import { useAuth } from '../contexts/AuthContext';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [error, setError] = useState('');
  const [showLogout, setShowLogout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Parse id_token (preferred) or access_token (fallback) from URL hash
    const hash = window.location.hash.substring(1);
    
    // If hash is empty, don't process
    if (!hash || hash.trim() === '') {
      return;
    }
    
    // Prevent multiple simultaneous processing
    if (isProcessing) {
      return;
    }

    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');
    const oauthToken = idToken || accessToken;

    if (!oauthToken) {
      setError('No Google OAuth token found in URL.');
      return;
    }

    // Check if this token was already processed
    const processedToken = sessionStorage.getItem('last_processed_oauth_token');
    if (processedToken === oauthToken) {
      return;
    }

    setIsProcessing(true);
    sessionStorage.setItem('last_processed_oauth_token', oauthToken);

    // Clear in-progress flags
    sessionStorage.removeItem('google_oauth_in_progress');
    sessionStorage.removeItem('google_oauth_nonce');
    // Exchange token for JWT/user with backend (supports id_token or access_token)
    googleSignIn({ token: oauthToken })
      .then((response) => {
        setIsProcessing(false); // Reset processing flag
        
        if (response.token) {
          login(response.token, response.user);
          // Clear the hash to prevent re-processing
          window.location.hash = '';
          navigate('/dashboard');
        } else if (response.error) {
          setError(response.error);
          if (response.error.includes('academic emails')) {
            setShowLogout(true);
          }
        } else {
          setError('Google sign-in failed. Please try again.');
        }
      })
      .catch((err) => {
        setIsProcessing(false); // Reset processing flag
        setError('Google sign-in failed: ' + err.message);
      });
  }, [login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          {error}
          {showLogout && (
            <div className="mt-4">
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 mr-2"
                onClick={() => { logout(); }}
              >
                Logout
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                onClick={() => { navigate('/'); }}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white">Signing you in with Google...</div>
    </div>
  );
};

export default OAuthCallback; 