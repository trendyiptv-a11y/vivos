"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"

async function safeImpact(style: ImpactStyle) {
  try {
    await Haptics.impact({ style })
  } catch (error) {
    console.error("Haptics impact error:", error)
  }
}

async function safeNotification(type: NotificationType) {
  try {
    await Haptics.notification({ type })
  } catch (error) {
    console.error("Haptics notification error:", error)
  }
}

export default function NativeHapticsBridge() {
  const isNativePlatform = Capacitor.isNativePlatform()

  useEffect(() => {
    if (!isNativePlatform) {
      return
    }

    const handlePushReceived = async (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || {}
      const type = String(detail.notificationType || "")

      if (type === "incoming_call") {
        await safeNotification(NotificationType.Warning)
        return
      }

      if (type === "new_message") {
        await safeImpact(ImpactStyle.Light)
      }
    }

    const handleCallAccepted = async () => {
      await safeNotification(NotificationType.Success)
    }

    const handleCallRejected = async () => {
      await safeNotification(NotificationType.Warning)
    }

    const handleCallEnded = async () => {
      await safeImpact(ImpactStyle.Medium)
    }

    window.addEventListener("vivos:push-received", handlePushReceived as EventListener)
    window.addEventListener("vivos:call-accepted", handleCallAccepted as EventListener)
    window.addEventListener("vivos:call-rejected", handleCallRejected as EventListener)
    window.addEventListener("vivos:call-ended", handleCallEnded as EventListener)

    return () => {
      window.removeEventListener("vivos:push-received", handlePushReceived as EventListener)
      window.removeEventListener("vivos:call-accepted", handleCallAccepted as EventListener)
      window.removeEventListener("vivos:call-rejected", handleCallRejected as EventListener)
      window.removeEventListener("vivos:call-ended", handleCallEnded as EventListener)
    }
  }, [isNativePlatform])

  return null
}
