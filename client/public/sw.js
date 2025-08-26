// COYN Messenger Service Worker for PWA functionality
const CACHE_NAME = 'coyn-messenger-v1';
const STATIC_CACHE_NAME = 'coyn-static-v1';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/messenger',
  '/marketplace',
  '/src/assets/COYN-symbol-square_1750808237977.png',
  '/src/assets/Coynful-logo-fin-copy_1751239116310.png',
  '/src/assets/MetaMask_Fox.svg_1751312780982.png',
  '/src/assets/Trust-Wallet_1751312780982.jpg'
];

// Network-first strategy for API calls
const API_CACHE_NAME = 'coyn-api-v1';
const API_URLS = [
  '/api/user',
  '/api/conversations',
  '/api/messages'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external URLs (except for certain APIs)
  if (url.origin !== self.location.origin && !isAllowedExternalUrl(url)) {
    return;
  }

  // Handle different types of requests
  if (isAPIRequest(url)) {
    // Network-first for API calls
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
  } else if (isStaticAsset(url)) {
    // Cache-first for static assets
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
  } else {
    // Network-first for navigation requests
    event.respondWith(networkFirstStrategy(request, CACHE_NAME));
  }
});

// Network-first strategy
async function networkFirstStrategy(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache
    console.log('📡 Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Cache-first strategy
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Ignore network errors for background updates
    });
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Helper functions
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(url) {
  return url.pathname.includes('/assets/') || 
         url.pathname.endsWith('.png') || 
         url.pathname.endsWith('.jpg') || 
         url.pathname.endsWith('.jpeg') || 
         url.pathname.endsWith('.svg') || 
         url.pathname.endsWith('.ico') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js');
}

function isAllowedExternalUrl(url) {
  // Allow specific external APIs
  const allowedDomains = [
    'api.coingecko.com',
    'api.giphy.com'
  ];
  
  return allowedDomains.some(domain => url.hostname.includes(domain));
}

// Background sync for messages when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📢 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New message in COYN Messenger',
    icon: '/src/assets/COYN-symbol-square_1750808237977.png',
    badge: '/src/assets/COYN-symbol-square_1750808237977.png',
    vibrate: [200, 100, 200],
    tag: 'coyn-message',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Message',
        icon: '/src/assets/COYN-symbol-square_1750808237977.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/src/assets/COYN-symbol-square_1750808237977.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('COYN Messenger', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/messenger')
    );
  }
});

async function syncMessages() {
  try {
    // Implement background message sync logic here
    console.log('🔄 Syncing messages in background');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}