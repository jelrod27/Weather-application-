self.addEventListener('push', (event) => {
  let data = { title: 'Weather warning', body: '', url: '/warnings', tag: 'severe-weather' }
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) }
  } catch {
    // keep defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url },
      tag: data.tag,
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/warnings'
  event.waitUntil(self.clients.openWindow(url))
})
