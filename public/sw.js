/* ─── NestList Service Worker v1.0.0 ─── */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `nestlist-static-${CACHE_VERSION}`;
const DATA_CACHE = `nestlist-data-${CACHE_VERSION}`;
const FONT_CACHE = `nestlist-fonts-${CACHE_VERSION}`;
const IMAGE_CACHE = `nestlist-images-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';

/* ─── Assets to pre-cache on install ─── */
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/index.html',
];

/* ─── Install: Pre-cache critical assets ─── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

/* ─── Activate: Clean old caches ─── */
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, DATA_CACHE, FONT_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

/* ─── Helper: is this a navigation request? ─── */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/* ─── Helper: is this a static asset? ─── */
function isStaticAsset(url) {
  const staticPatterns = [
    '/assets/',     // Vite built assets
    '/icons/',      // PWA icons
    '/manifest.json',
  ];
  return staticPatterns.some((pattern) => url.pathname.startsWith(pattern));
}

/* ─── Helper: is this a font? ─── */
function isFont(url) {
  return url.href.includes('fonts.googleapis.com') ||
         url.href.includes('fonts.gstatic.com') ||
         url.href.includes('fontawesome');
}

/* ─── Helper: is this an image? ─── */
function isImage(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i);
}

/* ─── Helper: is this an API call? ─── */
function isApiCall(url) {
  return url.href.includes('/api/') ||
         url.href.includes('supabase') ||
         url.href.includes('cloudinary') ||
         url.href.includes('.clerk.');
}

/* ─── Fetch: Handle requests ─── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // ── Navigation requests: Network-first, fallback to cache, then offline page ──
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the HTML for offline fallback
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          // SPA fallback: serve index.html for any navigation route
          const spaEntry = await caches.match('/index.html');
          if (spaEntry) return spaEntry;
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // ── Static assets (JS/CSS): Cache-first ──
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Fonts: Cache-first (they rarely change) ──
  if (isFont(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Opaque responses (Google Fonts, etc.) may not have ok=true
          if (response.ok || response.type === 'opaque') {
            const clone = response.clone();
            caches.open(FONT_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Images: Cache-first, update in background ──
  if (isImage(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── API/Data calls: Network-first, cache as fallback ──
  if (isApiCall(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'You are offline. Please check your connection.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // ── Everything else: Network-first ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match(OFFLINE_URL);
      })
  );
});

/* ─── Message handler: Skip waiting for new SW ─── */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
