"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

const STATUS_EVENT = "vivos:web-push-status"
const SUBSCRIBE_REQUEST_EVENT = "vivos:web-push-subscribe-request"
const UNSUBSCRIBE_REQUEST_EVENT = "vivos:web-push-unsubscribe-request"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function emitStatus(detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent(STATUS_EVENT, { detail }))
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return null
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  }
}

export default function WebPushSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window

    async function syncSubscription() {
      if (!isSupported) {
        emitStatus({ supported: false, permission: "unsupported", subscribed: false })
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      emitStatus({
        supported: true,
        permission: Notification.permission,
        subscribed: !!subscription,
      })

      if (!subscription || Notification.permission !== "granted") return

      try {
        const headers = await getAuthHeaders()
        if (!headers) return

        const response = await fetch("/api/notifications/register-web-push-subscription", {
          method: "POST",
          headers,
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        })

        if (!response.ok) {
          const result = await response.json().catch(() => null)
          console.error("Web push subscription sync failed:", result || response.status)
        }
      } catch (error) {
        console.error("Web push subscription sync error:", error)
      }
    }

    async function handleSubscribeRequest() {
      if (!isSupported) {
        emitStatus({ supported: false, permission: "unsupported", subscribed: false })
        return
      }

      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY")
          emitStatus({ supported: true, permission: Notification.permission, subscribed: false, error: "missing_vapid_key" })
          return
        }

        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
          emitStatus({ supported: true, permission, subscribed: false })
          return
        }

        const registration = await navigator.serviceWorker.ready
        const existingSubscription = await registration.pushManager.getSubscription()
        const subscription =
          existingSubscription ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }))

        const headers = await getAuthHeaders()
        if (!headers) {
          emitStatus({ supported: true, permission, subscribed: true, error: "missing_session" })
          return
        }

        const response = await fetch("/api/notifications/register-web-push-subscription", {
          method: "POST",
          headers,
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        })

        if (!response.ok) {
          const result = await response.json().catch(() => null)
          console.error("Web push subscribe failed:", result || response.status)
          emitStatus({ supported: true, permission, subscribed: true, error: "register_failed" })
          return
        }

        emitStatus({ supported: true, permission, subscribed: true })
      } catch (error) {
        console.error("Web push subscribe error:", error)
        emitStatus({ supported: true, permission: Notification.permission, subscribed: false, error: "subscribe_failed" })
      }
    }

    async function handleUnsubscribeRequest() {
      if (!isSupported) {
        emitStatus({ supported: false, permission: "unsupported", subscribed: false })
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          const headers = await getAuthHeaders()
          if (headers) {
            await fetch("/api/notifications/unregister-web-push-subscription", {
              method: "POST",
              headers,
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            })
          }
          await subscription.unsubscribe()
        }

        emitStatus({ supported: true, permission: Notification.permission, subscribed: false })
      } catch (error) {
        console.error("Web push unsubscribe error:", error)
        emitStatus({ supported: true, permission: Notification.permission, subscribed: false, error: "unsubscribe_failed" })
      }
    }

    syncSubscription().catch((error) => {
      console.error("Web push initial sync error:", error)
    })

    window.addEventListener(SUBSCRIBE_REQUEST_EVENT, handleSubscribeRequest)
    window.addEventListener(UNSUBSCRIBE_REQUEST_EVENT, handleUnsubscribeRequest)

    return () => {
      window.removeEventListener(SUBSCRIBE_REQUEST_EVENT, handleSubscribeRequest)
      window.removeEventListener(UNSUBSCRIBE_REQUEST_EVENT, handleUnsubscribeRequest)
    }
  }, [])

  return null
}
