// public/sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = event.data;

    // 🚀 THE FIX: Use waitUntil to keep the worker alive on mobile
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(async () => {
          await self.registration.showNotification(title, {
            body: body,
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: 'task-reminder',
            renotify: true
          });
          resolve();
        }, delay);
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
        clientList[0].postMessage({ type: 'SPEAK_TASK', text: event.notification.body });
      } else {
        clients.openWindow('/');
      }
    })
  );
});