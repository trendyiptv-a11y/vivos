"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { PushNotifications } from "@capacitor/push-notifications"
import { supabase } from "@/lib/supabase/client"

const PENDING_PUSH_URL_KEY = "vivos:pending-push-url"

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

function normalizeUrl(targetUrl: string | null) {
  if (!targetUrl) return null
  return targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`
}

function savePendingPushUrl(targetUrl: string | null) {
  try {
    const normalizedUrl = normalizeUrl(targetUrl)
    if (!normalizedUrl) return
    window.localStorage.setItem(PENDING_PUSH_URL_KEY, normalizedUrl)
  } catch (error) {
    console.error("Save pending push URL error:", error)
  }
}

function readPendingPushUrl() {
  try {
    return window.localStorage.getItem(PENDING_PUSH_URL_KEY)
  } catch {
    return null
  }
}

function clearPendingPushUrl() {
  try {
    window.localStorage.removeItem(PENDING_PUSH_URL_KEY)
  } catch (error) {
    console.error("Clear pending push URL error:", error)
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
    let appStateListener: any

    const navigateToUrl = (targetUrl: string | null, options?: { force?: boolean }) => {
      try {
        const normalizedUrl = normalizeUrl(targetUrl)
        if (!normalizedUrl) return false

        if (!options?.force && window.location.pathname + window.location.search === normalizedUrl) {
          clearPendingPushUrl()
          return true
        }

        savePendingPushUrl(normalizedUrl)
        window.location.assign(normalizedUrl)
        return true
      } catch (error) {
        console.error("Push navigation error:", error)
        return false
      }
    }

    const flushPendingPushUrl = (options?: { force?: boolean }) => {
      const pendingUrl = readPendingPushUrl()
      if (!pendingUrl) return false

      const currentUrl = window.location.pathname + window.location.search
      if (!options?.force && currentUrl === pendingUrl) {
        clearPendingPushUrl()
        return true
      }

      try {
        window.location.assign(pendingUrl)
        return true
      } catch (error) {
        console.error("Flush pending push URL error:", error)
        return false
      }
    }

    const navigateFromPushAction = (action: any) => {
      const targetUrl = getNotificationNavigationUrl(action)
      if (!targetUrl) return
      savePendingPushUrl(targetUrl)
      window.setTimeout(() => {
        navigateToUrl(targetUrl, { force: true })
      }, 150)
    }

    const handleForegroundNotification = (notification: any) => {
      emitForegroundPushEvent(notification)

      const data = getNotificationData(notification)
      const notificationType = String(data.notificationType || "")

      if (notificationType === "incoming_call") {
        const targetUrl = getNotificationNavigationUrl(notification)
        if (!targetUrl) return
        savePendingPushUrl(targetUrl)
        window.setTimeout(() => {
          navigateToUrl(targetUrl)
        }, 150)
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(() => {
          flushPendingPushUrl()
        }, 100)
      }
    }

    const handleFocus = () => {
      window.setTimeout(() => {
        flushPendingPushUrl()
      }, 100)
    }

    const initPush = async () => {
      try {
        try {
          await PushNotifications.createChannel({
            id: "incoming_calls",
            name: "Apeluri",
            description: "Notificări pentru apeluri incoming",
            importance: 5,
            visibility: 1,
            sound: "default",
            vibration: true,
          })
        } catch (channelError) {
          console.warn("Create incoming_calls channel warning:", channelError)
        }

        try {
          await PushNotifications.createChannel({
            id: "default",
            name: "General",
            description: "Notificări generale VIVOS",
            importance: 5,
            visibility: 1,
          })
        } catch (channelError) {
          console.warn("Create default channel warning:", channelError)
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

        appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            window.setTimeout(() => {
              flushPendingPushUrl()
            }, 150)
          }
        })

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("focus", handleFocus)

        window.setTimeout(() => {
          flushPendingPushUrl()
        }, 250)

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
      appStateListener?.remove?.()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [isNativePlatform])

  return null
}
