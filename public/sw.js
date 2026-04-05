self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  if (!event.data) {
    return
  }

  let payload = {}

  try {
    payload = event.data.json()
  } catch (error) {
    payload = {
      title: "VIVOS",
      body: event.data.text(),
    }
  }

  const title = payload.title || "VIVOS"
  const body = payload.body || "Ai o notificare nouă."
  const url = payload.url || "/messages"
  const tag = payload.tag || "vivos-notification"

  const options = {
    body,
    tag,
    data: {
      url,
      conversationId: payload.conversationId || null,
      notificationType: payload.notificationType || "generic",
    },
    icon: "/icon-192.png",
    badge: "/badge-72.png",
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/messages"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({
            type: "notification-click",
            url: targetUrl,
          })

          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
