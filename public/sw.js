const SW_VERSION = "vivos-sw-v7-client-routing-fix"

self.addEventListener("install", () => {
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
      answerUrl: payload.answerUrl || null,
      declineUrl: payload.declineUrl || null,
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
  const notificationType = data.notificationType || ""
  const conversationId = data.conversationId || ""
  const callSessionId = data.callSessionId || ""

  let targetPath = data.url || "/messages"

  if (notificationType === "incoming_call" && conversationId && callSessionId) {
    if (action === "answer") {
      targetPath =
        data.answerUrl ||
        `/messages/${conversationId}?callAction=answer&callSessionId=${callSessionId}`
    } else if (action === "decline") {
      targetPath =
        data.declineUrl ||
        `/messages/${conversationId}?callAction=decline&callSessionId=${callSessionId}`
    } else {
      targetPath = data.url || `/messages/${conversationId}`
    }
  }

  const absoluteUrl = new URL(targetPath, self.location.origin).toString()

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      const sameOriginClients = clientList.filter((client) => {
        try {
          return new URL(client.url).origin === self.location.origin
        } catch {
          return false
        }
      })

      const appClient =
        sameOriginClients.find((client) => client.url.startsWith(self.location.origin + "/")) ||
        sameOriginClients[0]

      if (appClient) {
        await appClient.focus()

        if ("navigate" in appClient) {
          await appClient.navigate(absoluteUrl)
        }

        return
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl)
      }
    })
  )
})
