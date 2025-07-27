// Google OAuth utility using Google Identity Services
let googleInitialized = false;

// Initialize Google Identity Services
export const initializeGoogleAuth = () => {
  if (googleInitialized) return;
  
  // Load Google Identity Services script
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  
  script.onload = () => {
    googleInitialized = true;
    console.log('Google Identity Services loaded');
  };
};

// Get Google OAuth token using popup
export const getGoogleToken = () => {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    // If no Google Client ID is provided, use mock mode
    if (!clientId || clientId === 'your-google-client-id') {
      // Prompt for email in mock mode
      const email = window.prompt('Enter your academic email for mock Google login:', 'test.user@cuj.ac.in');
      if (!email) {
        reject(new Error('Email is required for mock Google login'));
        return;
      }
      const mockToken = `mock_google_token_${Date.now()}__${email}`;
      setTimeout(() => {
        console.log('Mock Google OAuth successful');
        resolve(mockToken);
      }, 1000);
      return;
    }

    // Real Google OAuth implementation (redirect in same tab)
    const redirectUri = `${window.location.origin}/oauth-callback`;
    const scope = 'email profile';
    const oauthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=token&` +
      `prompt=select_account`;

    // Store a flag in sessionStorage to indicate OAuth is in progress
    sessionStorage.setItem('google_oauth_in_progress', '1');
    // Redirect in the same tab
    window.location.href = oauthUrl;
    // The promise will not resolve here; it should be handled in the OAuthCallback page/component after redirect
  });
};

// Initialize Google Sign-In button
export const initializeGoogleSignIn = (buttonId, onSuccess, onError) => {
  if (!window.google) {
    console.error('Google Identity Services not loaded');
    return;
  }

  google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id',
    callback: (response) => {
      if (response.credential) {
        onSuccess(response.credential);
      } else {
        onError(new Error('Google sign-in failed'));
      }
    },
  });

  google.accounts.id.renderButton(
    document.getElementById(buttonId),
    { theme: 'outline', size: 'large', width: '100%' }
  );
}; 