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

    // Real Google OAuth implementation
    const redirectUri = `${window.location.origin}/oauth-callback`;
    const scope = 'email profile';
    
    // Create a popup window for Google OAuth
    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=token&` +
      `prompt=select_account`,
      'google-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for the popup to close or receive message
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        reject(new Error('Authentication cancelled'));
      }
    }, 1000);

    // Listen for message from popup
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', handleMessage);
        resolve(event.data.token);
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', handleMessage);
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', handleMessage);
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