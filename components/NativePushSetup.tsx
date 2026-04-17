"use client"

import { useEffect, useState } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { supabase } from "@/lib/supabase/client"

export default function NativePushSetup() {
  const [token, setToken] = useState("")
  const [status, setStatus] = useState("Inițializare push...")

  useEffect(() => {
    let registrationListener: any
    let registrationErrorListener: any
    let receivedListener: any
    let actionListener: any

    const saveDeviceToken = async (fcmToken: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setStatus("FCM primit, dar sesiunea nu este validă.")
          return
        }

        const response = await fetch("/api/notifications/register-device-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            token: fcmToken,
            platform: "android",
            deviceLabel: "capacitor-android",
          }),
        })

        if (!response.ok) {
          const result = await response.json().catch(() => null)
          setStatus(`FCM primit, dar salvarea a eșuat: ${result?.error || response.status}`)
          return
        }

        setStatus("Token FCM salvat în backend.")
      } catch (error: any) {
        setStatus(`FCM primit, dar salvarea a eșuat: ${error?.message || String(error)}`)
      }
    }

    const initPush = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions()
        setStatus(`Permisiune curentă: ${permStatus.receive}`)

        if (permStatus.receive !== "granted") {
          const requested = await PushNotifications.requestPermissions()
          setStatus(`Permisiune după cerere: ${requested.receive}`)

          if (requested.receive !== "granted") {
            setStatus("Permisiunea de notificări nu a fost acordată.")
            return
          }
        }

        registrationListener = await PushNotifications.addListener("registration", async (token) => {
          setToken(token.value)
          setStatus("Token FCM primit.")
          console.log("FCM token:", token.value)
          await saveDeviceToken(token.value)
        })

        registrationErrorListener = await PushNotifications.addListener(
          "registrationError",
          (error) => {
            setStatus(`Eroare la înregistrare: ${JSON.stringify(error)}`)
            console.error("Push registration error:", error)
          }
        )

        receivedListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push received:", notification)
          }
        )

        actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            console.log("Push action performed:", action)
          }
        )

        await PushNotifications.register()
        setStatus("Se încearcă înregistrarea la FCM...")
      } catch (error: any) {
        setStatus(`Eroare init push: ${error?.message || String(error)}`)
        console.error("Native push init error:", error)
      }
    }

    initPush()

    return () => {
      registrationListener?.remove?.()
      registrationErrorListener?.remove?.()
      receivedListener?.remove?.()
      actionListener?.remove?.()
    }
  }, [])

  return (
    <div className="fixed bottom-24 left-2 right-2 z-[9999] rounded-2xl border bg-white p-3 text-xs shadow-lg">
      <div><strong>Push status:</strong> {status}</div>
      <div className="mt-2 break-all">
        <strong>FCM token:</strong> {token || "încă nu există"}
      </div>
    </div>
  )
}
