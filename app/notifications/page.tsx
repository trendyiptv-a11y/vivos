"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"

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

function eventBadge(eventType: string) {
  if (eventType === "user_registered") return "Membru nou"
  if (eventType === "market_post_created") return "Piață"
  if (eventType === "new_message") return "Mesaj"
  return "Eveniment"
}

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

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

          setItems((prev) => {
            const next = [row, ...prev]
            return next.slice(0, 50)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  async function markAllRead() {
    if (!userId) return

    const unreadIds = items
      .filter((x) => !x.is_read && x.user_id === userId)
      .map((x) => x.id)

    if (!unreadIds.length) return

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)

    if (!error) {
      setItems((prev) =>
        prev.map((x) => (x.user_id === userId ? { ...x, is_read: true } : x))
      )
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Monitorizare</p>
            <h1 className="text-3xl font-semibold">Notificări</h1>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/")}>
              Înapoi
            </Button>
            <Button className="rounded-2xl" onClick={markAllRead}>
              Marchează tot ca citit
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
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
              items.map((item) => (
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

                    {!item.is_read && item.user_id === userId && (
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
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
