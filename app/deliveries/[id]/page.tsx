"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type DeliveryStatus = "open" | "accepted" | "picked_up" | "delivered" | "completed" | "cancelled"
type DeliveryPriority = "normal" | "urgent" | "community_help"
type DeliveryRewardType = "free" | "donation" | "paid" | "barter"
type DeliveryCategory = "document" | "small_package" | "shopping" | "market_item" | "community_help" | "other"

type DeliveryRequest = {
  id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  category: DeliveryCategory
  pickup_area: string
  dropoff_area: string
  pickup_notes: string | null
  dropoff_notes: string | null
  reward_type: DeliveryRewardType
  reward_amount: number | null
  priority: DeliveryPriority
  status: DeliveryStatus
  created_at: string
  accepted_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  time_window_start: string | null
  time_window_end: string | null
}

type DeliveryEvent = {
  id: string
  actor_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

function statusLabel(status: DeliveryStatus) {
  switch (status) {
    case "accepted":
      return "Acceptată"
    case "picked_up":
      return "Ridicată"
    case "delivered":
      return "Predată"
    case "completed":
      return "Finalizată"
    case "cancelled":
      return "Anulată"
    default:
      return "Deschisă"
  }
}

function priorityLabel(priority: DeliveryPriority) {
  if (priority === "urgent") return "Urgent"
  if (priority === "community_help") return "Ajutor comunitar"
  return "Normal"
}

function rewardLabel(type: DeliveryRewardType, amount: number | null) {
  if (type === "free") return "Gratuit"
  if (type === "donation") return amount ? `Donație · ${amount}` : "Donație"
  if (type === "paid") return amount ? `Plătit · ${amount}` : "Plătit"
  return amount ? `Barter · ${amount}` : "Barter"
}

function categoryLabel(category: DeliveryCategory) {
  switch (category) {
    case "document":
      return "Document"
    case "small_package":
      return "Pachet mic"
    case "shopping":
      return "Cumpărături"
    case "market_item":
      return "Obiect din piață"
    case "community_help":
      return "Ajutor comunitar"
    default:
      return "Altceva"
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "Necompletat"
  return new Date(value).toLocaleString("ro-RO")
}

function eventLabel(eventType: string) {
  switch (eventType) {
    case "accepted":
      return "Livrarea a fost acceptată"
    case "picked_up":
      return "Pachetul a fost ridicat"
    case "delivered":
      return "Pachetul a fost predat"
    case "completed":
      return "Livrarea a fost confirmată"
    case "cancelled":
      return "Cererea a fost anulată"
    case "created":
      return "Cererea a fost creată"
    default:
      return eventType
  }
}

export default function DeliveryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [request, setRequest] = useState<DeliveryRequest | null>(null)
  const [events, setEvents] = useState<DeliveryEvent[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const requestId = Array.isArray(params?.id) ? params.id[0] : params?.id

  useEffect(() => {
    async function loadData() {
      if (!requestId) return
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setCurrentUserId(session.user.id)

      const [requestResult, eventsResult] = await Promise.all([
        supabase
          .from("delivery_requests")
          .select("id, created_by, assigned_to, title, description, category, pickup_area, dropoff_area, pickup_notes, dropoff_notes, reward_type, reward_amount, priority, status, created_at, accepted_at, picked_up_at, delivered_at, completed_at, cancelled_at, time_window_start, time_window_end")
          .eq("id", requestId)
          .single(),
        supabase
          .from("delivery_events")
          .select("id, actor_id, event_type, payload, created_at")
          .eq("delivery_request_id", requestId)
          .order("created_at", { ascending: true }),
      ])

      if (requestResult.error) {
        setMessage(requestResult.error.message)
        setRequest(null)
        setEvents([])
        setLoading(false)
        return
      }

      if (eventsResult.error) {
        setMessage(eventsResult.error.message)
      }

      setRequest((requestResult.data as DeliveryRequest) ?? null)
      setEvents((eventsResult.data as DeliveryEvent[]) ?? [])
      setLoading(false)
    }

    loadData()

    const requestsChannel = supabase
      .channel(`delivery-detail-request-${requestId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_requests", filter: `id=eq.${requestId}` }, loadData)
      .subscribe()

    const eventsChannel = supabase
      .channel(`delivery-detail-events-${requestId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_events", filter: `delivery_request_id=eq.${requestId}` }, loadData)
      .subscribe()

    return () => {
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [requestId, router])

  const isCreator = useMemo(() => !!request && currentUserId === request.created_by, [currentUserId, request])
  const isAssignedCourier = useMemo(() => !!request && currentUserId === request.assigned_to, [currentUserId, request])
  const canAccept = !!request && request.status === "open" && currentUserId !== request.created_by
  const canPickUp = !!request && request.status === "accepted" && isAssignedCourier
  const canMarkDelivered = !!request && request.status === "picked_up" && isAssignedCourier
  const canComplete = !!request && request.status === "delivered" && isCreator
  const canCancel = !!request && isCreator && (request.status === "open" || request.status === "accepted")

  async function runRpc(name: string) {
    if (!requestId) return
    setBusy(true)
    setMessage("")

    const { error } = await supabase.rpc(name, { p_request_id: requestId })

    if (error) {
      setMessage(error.message)
    }

    setBusy(false)
  }

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/deliveries") }>
            Înapoi la livrări
          </Button>
        </div>

        {loading ? (
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6 text-sm text-slate-600">Se încarcă detaliile...</CardContent></Card>
        ) : message && !request ? (
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6 text-sm text-slate-600">{message}</CardContent></Card>
        ) : request ? (
          <>
            {message ? (
              <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4 text-sm text-slate-600">{message}</CardContent></Card>
            ) : null}

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-2xl">{request.title}</CardTitle>
                  <p className="mt-2 text-sm text-slate-600">{request.description?.trim() || "Fără descriere suplimentară"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-xl">{categoryLabel(request.category)}</Badge>
                  <Badge variant="outline" className="rounded-xl">{priorityLabel(request.priority)}</Badge>
                  <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">{statusLabel(request.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Ridicare: <span className="font-medium text-slate-900">{request.pickup_area}</span></p>
                  <p>Predare: <span className="font-medium text-slate-900">{request.dropoff_area}</span></p>
                  <p>Detalii ridicare: <span className="font-medium text-slate-900">{request.pickup_notes?.trim() || "Necompletat"}</span></p>
                  <p>Detalii predare: <span className="font-medium text-slate-900">{request.dropoff_notes?.trim() || "Necompletat"}</span></p>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>Recompensă: <span className="font-medium text-slate-900">{rewardLabel(request.reward_type, request.reward_amount)}</span></p>
                  <p>Creată: <span className="font-medium text-slate-900">{formatDateTime(request.created_at)}</span></p>
                  <p>Interval: <span className="font-medium text-slate-900">{formatDateTime(request.time_window_start)} — {formatDateTime(request.time_window_end)}</span></p>
                  <p>Curier asignat: <span className="font-medium text-slate-900">{request.assigned_to || "Nimeni încă"}</span></p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Acțiuni</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {canAccept ? (
                  <Button className="rounded-2xl" disabled={busy} onClick={() => runRpc("accept_delivery_request") }>
                    {busy ? "Se procesează..." : "Accept livrarea"}
                  </Button>
                ) : null}

                {canPickUp ? (
                  <Button className="rounded-2xl" disabled={busy} onClick={() => runRpc("mark_delivery_picked_up") }>
                    {busy ? "Se procesează..." : "Marchează ridicată"}
                  </Button>
                ) : null}

                {canMarkDelivered ? (
                  <Button className="rounded-2xl" disabled={busy} onClick={() => runRpc("mark_delivery_delivered") }>
                    {busy ? "Se procesează..." : "Marchează predată"}
                  </Button>
                ) : null}

                {canComplete ? (
                  <Button className="rounded-2xl" disabled={busy} onClick={() => runRpc("complete_delivery_request") }>
                    {busy ? "Se procesează..." : "Confirmă finalizarea"}
                  </Button>
                ) : null}

                {canCancel ? (
                  <Button variant="outline" className="rounded-2xl" disabled={busy} onClick={() => runRpc("cancel_delivery_request") }>
                    {busy ? "Se procesează..." : "Anulează cererea"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Istoric</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-24">
                {events.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu există evenimente încă.</div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="rounded-2xl border p-4">
                      <p className="font-medium text-slate-900">{eventLabel(event.event_type)}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatDateTime(event.created_at)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  )
}
