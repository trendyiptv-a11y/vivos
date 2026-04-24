"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type NotificationRow = {
  id: string
  user_id: string | null
  event_type: string
  title: string
  body: string | null
  ref_id: string | null
  created_at: string
  is_read: boolean
}

type WebPushStatus = {
  supported: boolean
  permission: string
  subscribed: boolean
  error?: string
}

function eventBadge(eventType: string) {
  if (eventType === "user_registered") return "Membru nou"
  if (eventType === "market_post_created") return "Piață"
  if (eventType === "new_message") return "Mesaj"
  if (eventType === "fund_request_created") return "Fond mutual"
  if (eventType === "delivery_request_accepted") return "Livrări"
  if (eventType === "delivery_picked_up") return "Livrări"
  if (eventType === "delivery_delivered") return "Livrări"
  if (eventType === "delivery_completed") return "Livrări"
  if (eventType === "delivery_cancelled") return "Livrări"
  if (eventType === "delivery_review_received") return "Evaluare"
  return "Eveniment"
}

function getStaticNotificationHref(item: NotificationRow) {
  if (item.event_type === "market_post_created") {
    return "/market"
  }
  if (item.event_type === "user_registered" && item.ref_id) {
    return `/member/${item.ref_id}`
  }
  if (item.event_type === "fund_request_created") {
    return "/fund"
  }
  if (
    [
      "delivery_request_accepted",
      "delivery_picked_up",
      "delivery_delivered",
      "delivery_completed",
      "delivery_cancelled",
      "delivery_review_received",
    ].includes(item.event_type) && item.ref_id
  ) {
    return `/deliveries/${item.ref_id}`
  }
  return null
}

function webPushLabel(status: WebPushStatus | null) {
  if (!status) return "Se verifică..."
  if (!status.supported) return "Browserul nu suportă web notifications"
  if (status.permission === "denied") return "Permisiune blocată în browser"
  if (status.subscribed) return "Notificări web active"
  if (status.permission === "granted") return "Permisiune acordată, dar fără subscription activă"
  return "Notificări web inactive"
}

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [webPushStatus, setWebPushStatus] = useState<WebPushStatus | null>(null)

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setUserId(session.user.id)

      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, event_type, title, body, ref_id, created_at, is_read")
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        setItems([])
        setMessage(error.message)
        setLoading(false)
        return
      }

      setItems((data ?? []) as NotificationRow[])
      setLoading(false)
    }

    function handleWebPushStatus(event: Event) {
      const customEvent = event as CustomEvent<WebPushStatus>
      setWebPushStatus(customEvent.detail)
    }

    loadNotifications()

    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async (payload) => {
          const row = payload.new as NotificationRow
          const {
            data: { session },
          } = await supabase.auth.getSession()
          const currentUserId = session?.user?.id
          if (!currentUserId) return
          if (row.user_id !== null && row.user_id !== currentUserId) return
          setItems((prev) => [row, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    window.addEventListener("vivos:web-push-status", handleWebPushStatus as EventListener)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener("vivos:web-push-status", handleWebPushStatus as EventListener)
    }
  }, [router])

  async function markAllRead() {
    if (!userId) return

    const allUnreadIds = items
      .filter((x) => !x.is_read && (x.user_id === userId || x.user_id === null))
      .map((x) => x.id)

    if (!allUnreadIds.length) return

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", allUnreadIds)

    if (!error) {
      setItems((prev) =>
        prev.map((x) =>
          allUnreadIds.includes(x.id) ? { ...x, is_read: true } : x
        )
      )
      window.dispatchEvent(new CustomEvent("vivos:notifications-updated"))
    }
  }

  async function resolveNotificationHref(item: NotificationRow) {
    if (item.event_type === "new_message" && item.ref_id) {
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("id", item.ref_id)
        .maybeSingle()

      if (!error && data?.conversation_id) {
        return `/messages/${data.conversation_id}`
      }

      return null
    }

    return getStaticNotificationHref(item)
  }

  async function handleOpen(item: NotificationRow) {
    const href = await resolveNotificationHref(item)

    if (!href) {
      alert("Nu am putut determina destinația notificării.")
      return
    }

    if (!item.is_read && (item.user_id === userId || item.user_id === null)) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", item.id)

      if (!error) {
        setItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, is_read: true } : x))
        )
        window.dispatchEvent(new CustomEvent("vivos:notifications-updated"))
      }
    }

    router.push(href)
  }

  function enableWebNotifications() {
    window.dispatchEvent(new CustomEvent("vivos:web-push-subscribe-request"))
  }

  function disableWebNotifications() {
    window.dispatchEvent(new CustomEvent("vivos:web-push-unsubscribe-request"))
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: vivosTheme.gradients.appBackground }}
    >
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)",
        }}
      >
        <div className="mx-auto flex min-h-[84px] max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase tracking-[0.22em] sm:text-xs"
              style={{ color: "rgba(255,255,255,0.68)" }}
            >
              Monitorizare
            </p>
            <h1
              className="truncate text-lg font-semibold sm:text-2xl"
              style={{ color: vivosTheme.colors.white }}
            >
              Notificări
            </h1>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15"
              onClick={() => router.push("/")}
            >
              Înapoi
            </Button>
            <Button
              className="rounded-2xl border-0"
              style={{
                background: vivosTheme.gradients.activeIcon,
                color: vivosTheme.colors.white,
                boxShadow: vivosTheme.shadows.bubble,
              }}
              onClick={markAllRead}
            >
              Marchează tot ca citit
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <Card className="mb-6 rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Notificări web</CardTitle>
            <Badge variant="outline" className="rounded-xl">browser</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4 text-sm text-slate-700">
              {webPushLabel(webPushStatus)}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl" onClick={enableWebNotifications}>
                Activează notificările web
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={disableWebNotifications}>
                Dezactivează
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-24 rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">Ultimele evenimente</CardTitle>
            <div className="text-sm text-slate-500">{items.length} notificări</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Se încarcă notificările...
              </div>
            ) : message ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Nu există încă notificări.
              </div>
            ) : (
              items.map((item) => {
                const hasAction =
                  (item.event_type === "new_message" && !!item.ref_id) ||
                  !!getStaticNotificationHref(item)

                return (
                  <div key={item.id} className="rounded-2xl border p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-xl">
                        {eventBadge(item.event_type)}
                      </Badge>

                      {item.user_id === null && (
                        <Badge variant="secondary" className="rounded-xl">
                          global
                        </Badge>
                      )}

                      {!item.is_read && (item.user_id === userId || item.user_id === null) && (
                        <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                          nou
                        </Badge>
                      )}
                    </div>

                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.body || "Fără detalii"}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString("ro-RO")}
                    </p>

                    {hasAction ? (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => handleOpen(item)}
                        >
                          Deschide
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
