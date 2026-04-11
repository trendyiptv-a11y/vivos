const SW_VERSION = "vivos-sw-v3-call-actions"

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  if (!event.data) return

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
  const notificationType = payload.notificationType || "generic"

  const options = {
    body,
    tag: payload.tag || `vivos-notification-${SW_VERSION}`,
    requireInteraction: !!payload.requireInteraction,
    vibrate: payload.vibrate || undefined,
    actions:
      notificationType === "incoming_call"
        ? [
            { action: "answer", title: "Răspunde" },
            { action: "decline", title: "Respinge" },
          ]
        : [],
    data: {
      url: payload.url || "/messages",
      conversationId: payload.conversationId || null,
      callSessionId: payload.callSessionId || null,
      notificationType,
      swVersion: SW_VERSION,
    },
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action || ""
  const notificationType = data.notificationType || "generic"
  const conversationId = data.conversationId || ""
  const callSessionId = data.callSessionId || ""

  let targetUrl = data.url || "/messages"

  if (notificationType === "incoming_call" && conversationId && callSessionId) {
    if (action === "answer") {
      targetUrl = `/messages/${conversationId}?answer=1&callSessionId=${callSessionId}`
    } else if (action === "decline") {
      targetUrl = `/messages/${conversationId}?decline=1&callSessionId=${callSessionId}`
    } else {
      targetUrl = `/messages/${conversationId}`
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus().then(() => {
            if ("navigate" in client) {
              return client.navigate(targetUrl)
            }
          })
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
