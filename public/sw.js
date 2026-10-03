/**
 * SSM Sky-Line Progressive Web App Service Worker
 * Version: 1.0.0
 * Architecture: Offline Fallback Shell + Stale-While-Revalidate for Static Assets + Network-Only for Sensitive APIs
 */

const SW_VERSION = 'ssm-pwa-v1.0.0';
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

// Message Event: Controlled Skip Waiting on User Confirmation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
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

  // 2. Sensitive APIs: Network-Only (NEVER CACHE)
  if (isSensitiveApi(url)) {
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

  // 4. Static Assets: Stale-While-Revalidate
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

  // 5. Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Push Event: Web Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'SSM Sky-Line';
    const options = {
      body: data.body || 'Bạn có thông báo mới từ hệ thống SSM.',
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

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[PWA SW] Push event error:', err);
  }
});

// Notification Click Event: Deep Link Navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

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
