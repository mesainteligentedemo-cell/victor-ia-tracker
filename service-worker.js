/**
 * ==========================================
 * SERVICE WORKER — Phase 11: PWA
 * ==========================================
 * Offline support + background sync + caching
 */

const CACHE_VERSION = 'v2.0';
const CACHE_NAMES = {
  static: `${CACHE_VERSION}-static`,
  dynamic: `${CACHE_VERSION}-dynamic`,
  api: `${CACHE_VERSION}-api`
};

const STATIC_ASSETS = [
  '/',
  '/tracker_live.html',
  '/login.html',
  '/signup.html',
  '/admin-dashboard.html',
  '/manifest.json',
  '/favicon.png',
  '/tracker-auth-integration.js',
  '/websocket-client.js',
  '/dashboards-the-door-v2.js',
  '/historical-analytics.js',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Inter:wght@300;400;500;600;700;800&family=Cormorant+Display:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/three@r128/build/three.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('firebasejs')))
          .catch(err => {
            console.warn('[ServiceWorker] Some assets failed to cache:', err);
            // Don't fail if some assets can't be cached
          });
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAMES.api);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => response || createOfflineResponse());
        })
    );
    return;
  }

  // HTML pages - network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAMES.dynamic);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => response || createOfflineResponse());
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseToCache = response.clone();
            const cacheName = url.pathname.includes('/api/') ? CACHE_NAMES.api : CACHE_NAMES.dynamic;

            caches.open(cacheName)
              .then(cache => cache.put(request, responseToCache));

            return response;
          })
          .catch(() => {
            return createOfflineResponse();
          });
      })
  );
});

/**
 * Background sync - sync data when online
 */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncTrackerData());
  }
});

async function syncTrackerData() {
  try {
    const db = await openIndexedDB();
    const pendingActions = await getPendingActions(db);

    for (const action of pendingActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });

        if (response.ok) {
          await removePendingAction(db, action.id);
        }
      } catch (err) {
        console.error('[ServiceWorker] Sync failed for:', action, err);
      }
    }

    // Notify all clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { synced: pendingActions.length }
      });
    });
  } catch (err) {
    console.error('[ServiceWorker] Sync error:', err);
    throw err;
  }
}

/**
 * Push notifications
 */
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  let notificationData = {
    title: 'THE DOOR',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'door-notification',
    requireInteraction: false
  };

  try {
    const data = event.data.json();
    notificationData = { ...notificationData, ...data };
  } catch (err) {
    notificationData.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/action-open.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/action-close.png'
        }
      ]
    })
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Check if the app is already open
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // If not open, open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/tracker_live.html');
        }
      })
  );
});

/**
 * Message handler - receive messages from clients
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    caches.open(CACHE_NAMES.dynamic)
      .then(cache => cache.addAll(urls))
      .catch(err => console.error('[ServiceWorker] Cache error:', err));
  }
});

/**
 * Helper functions
 */

function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Offline</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Space Grotesk', sans-serif;
            background: #070809;
            color: #F8F7F5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .offline-container {
            text-align: center;
            max-width: 400px;
          }
          .offline-icon {
            font-size: 64px;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 24px;
            color: #FFAA17;
            margin-bottom: 8px;
          }
          p {
            color: rgba(248,247,245,0.65);
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .status {
            padding: 12px;
            background: rgba(255,170,23,0.1);
            border: 1px solid rgba(255,170,23,0.3);
            border-radius: 4px;
            font-size: 12px;
            color: #FFAA17;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📡</div>
          <h1>You're Offline</h1>
          <p>The DOOR tracker is waiting for your internet connection to come back online.</p>
          <p>Any actions you take will be synced automatically when you're back online.</p>
          <div class="status">
            ⏳ Waiting for connection...
          </div>
        </div>
      </body>
    </html>`,
    {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    }
  );
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('door-tracker', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getPendingActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-actions'], 'readonly');
    const store = transaction.objectStore('pending-actions');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removePendingAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-actions'], 'readwrite');
    const store = transaction.objectStore('pending-actions');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}