// public/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// This listens for messages from your page.tsx
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = event.data;

    // We set a timeout in the background lane
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: '/icon.png', // path to your icon
        vibrate: [200, 100, 200],
        requireInteraction: true
      });
    }, delay);
  }
});

