self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.message || data.body,
      icon: '/assets/logo.png', // Fallback to standard path if it exists
      badge: '/assets/logo.png',
      data: {
        type: data.type,
        id: data.id
      },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open FinVoice' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'FinVoice Alert', options)
    );
  } catch (err) {
    console.error('Error parsing push notification data:', err);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Focus or open the browser tab on notification click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
