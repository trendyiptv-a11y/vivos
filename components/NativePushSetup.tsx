"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { PushNotifications } from "@capacitor/push-notifications"
import { supabase } from "@/lib/supabase/client"

function getNotificationData(source: any) {
  return source?.notification?.data || source?.notification || source?.data || {}
}

function getNotificationNavigationUrl(action: any): string | null {
  const data = getNotificationData(action)
  const actionId = String(action?.actionId || "").toLowerCase()

  if (actionId === "answer" && typeof data.answerUrl === "string" && data.answerUrl) {
    return data.answerUrl
  }

  if (actionId === "decline" && typeof data.declineUrl === "string" && data.declineUrl) {
    return data.declineUrl
  }

  if (typeof data.url === "string" && data.url) {
    return data.url
  }

  if (typeof data.conversationId === "string" && data.conversationId) {
    return `/messages/${data.conversationId}`
  }

  return null
}

function emitForegroundPushEvent(notification: any) {
  try {
    const data = getNotificationData(notification)
    window.dispatchEvent(
      new CustomEvent("vivos:push-received", {
        detail: {
          notificationType: data.notificationType || null,
          conversationId: data.conversationId || null,
          callSessionId: data.callSessionId || null,
          callerName: data.callerName || null,
          title: notification?.title || data.title || null,
          body: notification?.body || data.body || null,
          url: data.url || null,
          answerUrl: data.answerUrl || null,
          declineUrl: data.declineUrl || null,
          raw: notification,
        },
      })
    )
  } catch (error) {
    console.error("Foreground push bridge error:", error)
  }
}

export default function NativePushSetup() {
  const isNativePlatform = Capacitor.isNativePlatform()

  useEffect(() => {
    if (!isNativePlatform) {
      return
    }

    let registrationListener: any
    let registrationErrorListener: any
    let receivedListener: any
    let actionListener: any

    const navigateToUrl = (targetUrl: string | null) => {
      try {
        if (!targetUrl) return
        const normalizedUrl = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`
        if (window.location.pathname + window.location.search === normalizedUrl) return
        window.location.assign(normalizedUrl)
      } catch (error) {
        console.error("Push navigation error:", error)
      }
    }

    const navigateFromPushAction = (action: any) => {
      navigateToUrl(getNotificationNavigationUrl(action))
    }

    const handleForegroundNotification = (notification: any) => {
      emitForegroundPushEvent(notification)

      const data = getNotificationData(notification)
      const notificationType = String(data.notificationType || "")

      if (notificationType === "incoming_call") {
        navigateToUrl(getNotificationNavigationUrl(notification))
      }
    }

    const saveDeviceToken = async (fcmToken: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          console.warn("FCM token received, but session is not valid.")
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
          console.error("FCM token save failed:", result || response.status)
        }
      } catch (error) {
        console.error("FCM token save error:", error)
      }
    }

    const initPush = async () => {
      try {
        try {
          await PushNotifications.createChannel({
            id: "default",
            name: "General",
            description: "Notificări generale VIVOS",
            importance: 5,
            visibility: 1,
          })
        } catch (channelError) {
          console.warn("Create notification channel warning:", channelError)
        }

        const permStatus = await PushNotifications.checkPermissions()

        if (permStatus.receive !== "granted") {
          const requested = await PushNotifications.requestPermissions()

          if (requested.receive !== "granted") {
            console.warn("Notification permission was not granted.")
            return
          }
        }

        registrationListener = await PushNotifications.addListener("registration", async (token) => {
          console.log("FCM token registered")
          await saveDeviceToken(token.value)
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
            handleForegroundNotification(notification)
          }
        )

        actionListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            console.log("Push action performed:", action)
            navigateFromPushAction(action)
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
  }, [isNativePlatform])

  return null
}
