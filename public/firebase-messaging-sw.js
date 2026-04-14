importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyBSzmSeANo-20hyoYdKjDqNcMiCY6NHK7o",
  authDomain: "vivos-3bfba.firebaseapp.com",
  projectId: "vivos-3bfba",
  storageBucket: "vivos-3bfba.firebasestorage.app",
  messagingSenderId: "631514497195",
  appId: "1:631514497195:web:6c0c9b17e24379a75a77ee"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "VIVOS"
  const body = payload.notification?.body || "Ai o notificare nouă."
  const notificationType = payload.data?.notificationType || "generic"

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.data?.tag || "vivos-notification",
    data: {
      url: payload.data?.url || "/messages",
      conversationId: payload.data?.conversationId || null,
      callSessionId: payload.data?.callSessionId || null,
      notificationType,
      answerUrl: payload.data?.answerUrl || null,
    },
    actions: notificationType === "incoming_call"
      ? [{ action: "answer", title: "Răspunde" }]
      : [],
    requireInteraction: notificationType === "incoming_call",
    vibrate: notificationType === "incoming_call" ? [300, 150, 300, 150, 300] : undefined,
  })
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action || ""
  const notificationType = data.notificationType || "generic"

  let targetUrl = data.url || "/messages"

  if (notificationType === "incoming_call" && data.conversationId && data.callSessionId) {
    if (action === "answer") {
      targetUrl = data.answerUrl || `/messages/${data.conversationId}?callAction=answer&callSessionId=${data.callSessionId}`
    } else {
      targetUrl = `/messages/${data.conversationId}`
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus().then(() => {
            if ("navigate" in client) return client.navigate(targetUrl)
          })
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
