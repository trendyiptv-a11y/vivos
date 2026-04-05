"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export default function PushSubscribeButton() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window

    setSupported(ok)
    if (ok) {
      setPermission(Notification.permission)
    }
  }, [])

  async function handleEnablePush() {
    try {
      setBusy(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        window.location.href = "/login"
        return
      }

      if (!supported) {
        alert("Browserul nu suportă Web Push.")
        return
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        alert("Lipsește NEXT_PUBLIC_VAPID_PUBLIC_KEY.")
        return
      }

      const swRegistration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      const nextPermission = await Notification.requestPermission()
      setPermission(nextPermission)

      if (nextPermission !== "granted") {
        alert("Permisiunea pentru notificări nu a fost acordată.")
        return
      }

      let subscription = await swRegistration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      const subscriptionJson = subscription.toJSON()

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscriptionJson.keys,
          userAgent: navigator.userAgent,
          deviceLabel: "browser",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Nu am putut salva push subscription.")
      }

      setReady(true)
      alert("Notificările push au fost activate.")
    } catch (error: any) {
      alert(error?.message || "A apărut o eroare la activarea notificărilor.")
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border p-4 text-sm text-slate-600">
        Browserul sau dispozitivul nu suportă Web Push.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border p-4 text-sm text-slate-600">
        Status notificări: <span className="font-medium text-slate-900">{permission}</span>
      </div>

      <Button className="rounded-2xl" onClick={handleEnablePush} disabled={busy}>
        {busy ? "Se activează..." : ready || permission === "granted" ? "Reactivează push" : "Activează notificări push"}
      </Button>
    </div>
  )
}
