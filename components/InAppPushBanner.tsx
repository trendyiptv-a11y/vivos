"use client"

import { useEffect, useMemo, useState } from "react"

type InAppPushDetail = {
  notificationType?: string | null
  conversationId?: string | null
  callSessionId?: string | null
  callerName?: string | null
  title?: string | null
  body?: string | null
  url?: string | null
  answerUrl?: string | null
  declineUrl?: string | null
}

function normalizeUrl(detail: InAppPushDetail): string | null {
  if (typeof detail.url === "string" && detail.url) {
    return detail.url.startsWith("/") ? detail.url : `/${detail.url}`
  }

  if (typeof detail.conversationId === "string" && detail.conversationId) {
    return `/messages/${detail.conversationId}`
  }

  return null
}

export default function InAppPushBanner() {
  const [detail, setDetail] = useState<InAppPushDetail | null>(null)

  useEffect(() => {
    let hideTimer: number | null = null

    const handlePushReceived = (event: Event) => {
      const customEvent = event as CustomEvent<InAppPushDetail>
      const nextDetail = customEvent.detail || {}

      if (nextDetail.notificationType !== "new_message") {
        return
      }

      setDetail(nextDetail)

      if (hideTimer) {
        window.clearTimeout(hideTimer)
      }

      hideTimer = window.setTimeout(() => {
        setDetail(null)
      }, 5000)
    }

    window.addEventListener("vivos:push-received", handlePushReceived as EventListener)

    return () => {
      if (hideTimer) {
        window.clearTimeout(hideTimer)
      }
      window.removeEventListener("vivos:push-received", handlePushReceived as EventListener)
    }
  }, [])

  const targetUrl = useMemo(() => (detail ? normalizeUrl(detail) : null), [detail])

  if (!detail) {
    return null
  }

  const handleOpen = () => {
    if (!targetUrl) {
      setDetail(null)
      return
    }

    window.location.assign(targetUrl)
  }

  return (
    <div className="fixed left-3 right-3 top-3 z-[10000] md:left-auto md:right-4 md:top-4 md:w-[26rem]">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full rounded-3xl border border-slate-200 bg-white/95 px-4 py-4 text-left shadow-2xl backdrop-blur transition hover:bg-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {detail.title || "Mesaj nou"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
              {detail.body || "Ai primit un mesaj nou în VIVOS."}
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            Deschide
          </span>
        </div>
      </button>
    </div>
  )
}
