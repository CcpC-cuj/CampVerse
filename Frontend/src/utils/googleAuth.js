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

// Start Google OAuth and obtain an ID token via implicit flow (redirect)
export const getGoogleToken = () => {
  console.log("🔵 [GOOGLE AUTH] getGoogleToken() called");
  console.log("🔵 [GOOGLE AUTH] Timestamp:", new Date().toISOString());
  console.log("🔵 [GOOGLE AUTH] Call stack:", new Error().stack?.split('\n').slice(1, 4));
  
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.log("🔴 [GOOGLE AUTH] ERROR: Google Client ID not configured");
      reject(new Error('Google Client ID not configured'));
      return;
    }

    console.log("🔵 [GOOGLE AUTH] Starting OAuth flow with client ID:", clientId);
    const redirectUri = `${window.location.origin}/oauth-callback`;
    // Request OpenID Connect ID token to match backend verification path
    const scope = 'openid email profile';

    // Generate a cryptographically secure nonce for the request (required for OIDC implicit)
    if (!(window.crypto && window.crypto.getRandomValues)) {
      reject(new Error('Cryptographically secure random number generation is required for nonce'));
      return;
    }
    const nonceBytes = new Uint8Array(16);
    window.crypto.getRandomValues(nonceBytes);
    const nonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('google_oauth_nonce', nonce);

    const oauthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=id_token&` +
      `prompt=select_account&` +
      `nonce=${encodeURIComponent(nonce)}`;

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
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
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