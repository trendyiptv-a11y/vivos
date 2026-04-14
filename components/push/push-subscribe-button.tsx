"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { getFCMToken } from "@/lib/firebase/fcm"

export default function PushSubscribeButton() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [statusText, setStatusText] = useState("")

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "Notification" in window

    setSupported(ok)

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  async function handleEnablePush() {
    try {
      setBusy(true)
      setStatusText("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        window.location.href = "/login"
        return
      }

      if (!supported) {
        alert("Acest browser sau dispozitiv nu suportă notificări web.")
        return
      }

      const nextPermission = await Notification.requestPermission()
      setPermission(nextPermission)

      if (nextPermission !== "granted") {
        alert("Permisiunea pentru notificări nu a fost acordată.")
        return
      }

      const swRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      )
      alert("SW registered")

      await navigator.serviceWorker.ready
      alert("SW ready")

      let fcmToken: string | null = null

      try {
        alert("Calling getFCMToken...")
        fcmToken = await getFCMToken(swRegistration)
        console.log("FCM token raw:", fcmToken)
        alert(`FCM token: ${fcmToken ? "OK" : "NULL"}`)
      } catch (err: any) {
        console.error("getFCMToken failed:", err)
        alert(
          `getFCMToken failed:\n` +
            `message=${err?.message || "n/a"}\n` +
            `code=${err?.code || "n/a"}`
        )
        throw err
      }

      if (!fcmToken) {
        throw new Error("Nu s-a putut obține tokenul FCM.")
      }

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpoint: `fcm:${fcmToken}`,
          keys: {},
          userAgent: navigator.userAgent,
          deviceLabel: "fcm-web",
          fcmToken,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Nu am putut salva tokenul FCM.")
      }

      setReady(true)
      setStatusText("Notificări activate cu succes.")
      alert("FCM salvat cu succes.")
    } catch (error: any) {
      console.error(error)
      alert(error?.message || "A apărut o eroare la activarea notificărilor.")
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border p-4 text-sm text-slate-600">
        Browserul sau dispozitivul nu suportă notificări web.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border p-4 text-sm text-slate-600">
        Status notificări:{" "}
        <span className="font-medium text-slate-900">{permission}</span>
      </div>

      {statusText ? (
        <div className="rounded-2xl border p-4 text-sm text-slate-600">
          {statusText}
        </div>
      ) : null}

      <Button className="rounded-2xl" onClick={handleEnablePush} disabled={busy}>
        {busy
          ? "Se activează..."
          : ready || permission === "granted"
          ? "Reactivează push"
          : "Activează notificări push"}
      </Button>
    </div>
  )
}
