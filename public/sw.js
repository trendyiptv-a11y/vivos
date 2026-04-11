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
  const url = payload.url || "/messages"
  const answerUrl = payload.answerUrl || url
  const declineUrl = payload.declineUrl || url
  const tag = payload.tag || "vivos-notification"
  const notificationType = payload.notificationType || "generic"

  const isIncomingCall = notificationType === "incoming_call"

  const options = {
    body,
    tag,
    requireInteraction: !!payload.requireInteraction,
    vibrate: payload.vibrate || undefined,
    actions: isIncomingCall
      ? [
          { action: "answer", title: "Răspunde" },
          { action: "decline", title: "Respinge" },
        ]
      : [],
    data: {
      url,
      answerUrl,
      declineUrl,
      conversationId: payload.conversationId || null,
      callSessionId: payload.callSessionId || null,
      notificationType,
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

  let targetUrl = data.url || "/messages"

  if (notificationType === "incoming_call") {
    if (action === "answer") {
      targetUrl = data.answerUrl || data.url || "/messages"
    } else if (action === "decline") {
      targetUrl = data.declineUrl || data.url || "/messages"
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({
            type: "notification-click",
            action,
            url: targetUrl,
            conversationId: data.conversationId || null,
            callSessionId: data.callSessionId || null,
            notificationType,
          })

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
