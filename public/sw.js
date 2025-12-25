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

// public/sw.js
self.addEventListener('notificationclick', (event) => {
  const taskText = event.notification.body; 
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
        // 🚀 Tell Next.js to "Complete" this task
        clientList[0].postMessage({ 
          type: 'COMPLETE_TASK', 
          text: taskText 
        });
      } else {
        clients.openWindow('/');
      }
    })
  );
});