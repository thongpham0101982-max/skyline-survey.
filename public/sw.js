/**
 * SSM Sky-Line Progressive Web App Service Worker
 * Version: 1.0.0
 * Architecture: Offline Fallback Shell + Stale-While-Revalidate for Static Assets + Network-Only for Sensitive APIs
 */

const SW_VERSION = 'ssm-pwa-v1.0.2';
const STATIC_CACHE_NAME = `ssm-static-${SW_VERSION}`;
const RUNTIME_CACHE_NAME = `ssm-runtime-${SW_VERSION}`;

// Pre-cached static assets for offline shell
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/ssm-192.png',
  '/icons/ssm-512.png',
  '/icons/ssm-maskable-192.png',
  '/icons/ssm-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-cache warning:', err);
      });
    })
  );
  // Do NOT force skipWaiting immediately to prevent disrupting user form inputs
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              (name.startsWith('ssm-static-') || name.startsWith('ssm-runtime-')) &&
              name !== STATIC_CACHE_NAME &&
              name !== RUNTIME_CACHE_NAME
            );
          })
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event: Controlled Skip Waiting & App Badging
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  } else if (event.data.type === 'SET_APP_BADGE') {
    if ('setAppBadge' in self.navigator) {
      self.navigator.setAppBadge(event.data.count || 1).catch(() => {});
    }
  } else if (event.data.type === 'CLEAR_APP_BADGE') {
    if ('clearAppBadge' in self.navigator) {
      self.navigator.clearAppBadge().catch(() => {});
    }
  }
});

// Helper: Check if request is a sensitive business/student API
function isSensitiveApi(url) {
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.startsWith('/api/') ||
    pathname.includes('hocsinh') ||
    pathname.includes('student') ||
    pathname.includes('advisory') ||
    pathname.includes('ktdbcl') ||
    pathname.includes('du-gio') ||
    pathname.includes('auth') ||
    pathname.includes('assistant')
  );
}

// Helper: Check if request is for static cacheable assets
function isStaticAsset(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff')
  );
}

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Only handle GET requests and http/https schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. Sensitive APIs, Next.js internal RSC requests, Turbopack dev/HMR & Server Actions: Network-Only (NEVER CACHE / NEVER INTERCEPT)
  if (
    isSensitiveApi(url) ||
    url.searchParams.has('_rsc') ||
    request.headers.has('RSC') ||
    request.headers.has('next-action') ||
    request.headers.has('next-router-state-tree') ||
    url.pathname.includes('/_next/data/') ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('webpack') ||
    url.pathname.includes('.hot-update.')
  ) {
    return; // Pass through directly to browser network
  }

  // 3. HTML Navigation requests: Network-First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, return
          return response;
        })
        .catch(async () => {
          // Network failed: Serve pre-cached offline page
          const cache = await caches.open(STATIC_CACHE_NAME);
          const cachedOffline = await cache.match('/offline');
          return cachedOffline || new Response('Mất kết nối mạng. Vui lòng thử lại sau.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 4. JavaScript Chunks & Scripts: NETWORK-FIRST (NEVER Stale-While-Revalidate)
  // Stale-While-Revalidate on JS chunks causes module factory desynchronization ("module factory is not available") & ChunkLoadError!
  if (url.pathname.startsWith('/_next/static/chunks/') || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 5. Media, Fonts, Images & CSS: Stale-While-Revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 6. Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Push Event: Web Push Notifications & App Icon Badging
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    let rawTitle = data.title || 'Thông báo mới';
    
    // Ensure Title is formatted as "SSSQ Thông báo: [tiêu đề]" as required
    let title = rawTitle;
    if (!title.startsWith('SSSQ Thông báo:') && !title.startsWith('SSQM Thông báo:') && !title.startsWith('SSM Thông báo:')) {
      title = `SSSQ Thông báo: ${rawTitle}`;
    }

    const options = {
      body: data.body || 'Bạn có thông báo mới từ hệ thống SSM Sky-Line.',
      icon: data.icon || '/icons/ssm-192.png',
      badge: data.badge || '/icons/ssm-96.png',
      data: {
        url: data.deepLink || data.url || '/',
        id: data.id || null,
      },
      vibrate: [100, 50, 100],
      tag: data.tag || 'ssm-notification',
      renotify: true,
      actions: data.actions || [],
    };

    const promises = [
      self.registration.showNotification(title, options)
    ];

    // Display notification counter on App Icon on home screen (W3C Badging API)
    if ('setAppBadge' in self.navigator) {
      const badgeCount = (typeof data.badgeCount === 'number') ? data.badgeCount : 1;
      promises.push(self.navigator.setAppBadge(badgeCount).catch(() => {}));
    }

    event.waitUntil(Promise.all(promises));
  } catch (err) {
    console.error('[PWA SW] Push event error:', err);
  }
});

// Notification Click Event: Deep Link Navigation & App Badge Clear
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Clear badge upon user interaction
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus and navigate it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
