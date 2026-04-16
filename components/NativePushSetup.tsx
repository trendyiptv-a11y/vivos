"use client"

import { supabase } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { PushNotifications } from "@capacitor/push-notifications"

export default function NativePushSetup() {
  const [token, setToken] = useState("")
  const [status, setStatus] = useState("Inițializare push...")

  useEffect(() => {
    let registrationListener: any
    let registrationErrorListener: any
    let receivedListener: any
    let actionListener: any

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

  try {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (!accessToken) {
      setStatus("Token FCM primit, dar userul nu este logat.")
      return
    }

    const response = await fetch(
      "https://vivos-api.vercel.app/api/notifications/register-native-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          token: token.value,
          platform: "android",
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      setStatus(`Token primit, dar salvarea a eșuat: ${result?.error || "necunoscut"}`)
      return
    }

    setStatus("Token FCM salvat în backend.")
    console.log("FCM token salvat:", token.value)
  } catch (error: any) {
    setStatus(`Token primit, dar backend error: ${error?.message || String(error)}`)
  }
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
