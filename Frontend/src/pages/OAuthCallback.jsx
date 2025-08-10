import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleSignIn } from '../api';
import { useAuth } from '../contexts/AuthContext';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [error, setError] = useState('');
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    // Parse id_token (preferred) or access_token (fallback) from URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');
    const oauthToken = idToken || accessToken;

    if (!oauthToken) {
      setError('No Google OAuth token found in URL.');
      return;
    }

    // Clear in-progress flags
    sessionStorage.removeItem('google_oauth_in_progress');
    sessionStorage.removeItem('google_oauth_nonce');

    // Exchange token for JWT/user with backend (supports id_token or access_token)
    googleSignIn({ token: oauthToken })
      .then((response) => {
        if (response.token) {
          login(response.token, response.user);
          navigate('/dashboard');
        } else if (response.error) {
          console.error('Google sign-in error:', response.error);
          setError(response.error);
          if (response.error.includes('academic emails')) {
            setShowLogout(true);
          }
        } else {
          setError('Google sign-in failed. Please try again.');
        }
      })
      .catch((err) => {
        console.error('Google sign-in catch error:', err);
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