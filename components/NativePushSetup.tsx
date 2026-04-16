"use client"

import { useEffect } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { supabase } from "@/lib/supabase/client"

export default function NativePushSetup() {
  useEffect(() => {
    let registrationListener: any
    let registrationErrorListener: any
    let receivedListener: any
    let actionListener: any

    const initPush = async () => {
      try {
        const permStatus = await PushNotifications.checkPermissions()

        if (permStatus.receive !== "granted") {
          const requested = await PushNotifications.requestPermissions()
          if (requested.receive !== "granted") {
            console.log("Push permission not granted")
            return
          }
        }

        registrationListener = await PushNotifications.addListener("registration", async (token) => {
          console.log("FCM token:", token.value)

          try {
            const { data } = await supabase.auth.getSession()
            const accessToken = data.session?.access_token

            if (!accessToken) {
              console.log("FCM token primit, dar userul nu este logat.")
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
              console.error("Salvarea tokenului a eșuat:", result?.error || "necunoscut")
              return
            }

            console.log("FCM token salvat în backend.")
          } catch (error: any) {
            console.error("Backend error la salvarea tokenului:", error)
          }
        })

        registrationErrorListener = await PushNotifications.addListener(
          "registrationError",
          (error) => {
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
      } catch (error) {
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

  return null
}
