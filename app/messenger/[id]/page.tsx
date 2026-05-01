"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import MessengerConversationEntry from "@/components/messenger/conversation-entry"

export default function MessengerConversationPage() {
  const searchParams = useSearchParams()
  const autoCall = searchParams.get("autoCall")
  const autoTriggeredRef = useRef<string | null>(null)

  useEffect(() => {
    if (autoCall !== "audio" && autoCall !== "video") return
    if (autoTriggeredRef.current === autoCall) return

    let cancelled = false
    let attempts = 0

    const tryAutoCall = () => {
      if (cancelled) return
      attempts += 1

      const selector = autoCall === "video" ? 'button[title="Apel video"]' : 'button[title="Apel audio"]'
      const button = document.querySelector(selector) as HTMLButtonElement | null

      if (button && !button.disabled) {
        autoTriggeredRef.current = autoCall
        button.click()
        return
      }

      if (attempts < 30) {
        window.setTimeout(tryAutoCall, 250)
      }
    }

    const timer = window.setTimeout(tryAutoCall, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [autoCall])

  return <MessengerConversationEntry />
}
