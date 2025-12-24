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

// public/sw.js
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        client.focus();
        // Send a message to the page to trigger the voice
        return client.postMessage({ 
          type: 'SPEAK_TASK', 
          text: event.notification.body 
        });
      }
      return clients.openWindow('/');
    })
  );
});