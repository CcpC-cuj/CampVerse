self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle http and https requests (ignore chrome-extension://, etc.)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // Skip caching for API calls to ensure fresh data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(err => {
        console.warn('[SW] API Fetch failed:', err.message, url.pathname);
        // Return a custom error response instead of letting the promise reject
        return new Response(JSON.stringify({ 
          error: 'Network error', 
          message: err.message,
          path: url.pathname 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.open('campverse-v1').then(cache => {
      return cache.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          // Only cache successful GET requests with valid URLs
          if (event.request.method === 'GET' && networkResponse.ok) {
            try {
              cache.put(event.request, networkResponse.clone());
            } catch (e) {
              // Silently ignore cache errors for unsupported requests
            }
          }
          return networkResponse;
        });
      });
    }).catch(() => {
      // Return fetch directly if cache fails
      return fetch(event.request);
    })
  );
});
