"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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

type DeliveryReview = {
  id: string
  reviewer_id: string
  reviewed_user_id: string
  rating: number
  comment: string | null
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

function ratingLabel(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating)
}

export default function DeliveryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [request, setRequest] = useState<DeliveryRequest | null>(null)
  const [events, setEvents] = useState<DeliveryEvent[]>([])
  const [reviews, setReviews] = useState<DeliveryReview[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")

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

      const [requestResult, eventsResult, reviewsResult] = await Promise.all([
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
        supabase
          .from("delivery_reviews")
          .select("id, reviewer_id, reviewed_user_id, rating, comment, created_at")
          .eq("delivery_request_id", requestId)
          .order("created_at", { ascending: true }),
      ])

      if (requestResult.error) {
        setMessage(requestResult.error.message)
        setRequest(null)
        setEvents([])
        setReviews([])
        setLoading(false)
        return
      }

      if (eventsResult.error) {
        setMessage(eventsResult.error.message)
      }

      if (reviewsResult.error) {
        setMessage(reviewsResult.error.message)
      }

      setRequest((requestResult.data as DeliveryRequest) ?? null)
      setEvents((eventsResult.data as DeliveryEvent[]) ?? [])
      setReviews((reviewsResult.data as DeliveryReview[]) ?? [])
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

    const reviewsChannel = supabase
      .channel(`delivery-detail-reviews-${requestId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_reviews", filter: `delivery_request_id=eq.${requestId}` }, loadData)
      .subscribe()

    return () => {
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(eventsChannel)
      supabase.removeChannel(reviewsChannel)
    }
  }, [requestId, router])

  const isCreator = useMemo(() => !!request && currentUserId === request.created_by, [currentUserId, request])
  const isAssignedCourier = useMemo(() => !!request && currentUserId === request.assigned_to, [currentUserId, request])
  const canAccept = !!request && request.status === "open" && currentUserId !== request.created_by
  const canPickUp = !!request && request.status === "accepted" && isAssignedCourier
  const canMarkDelivered = !!request && request.status === "picked_up" && isAssignedCourier
  const canComplete = !!request && request.status === "delivered" && isCreator
  const canCancel = !!request && isCreator && (request.status === "open" || request.status === "accepted")

  const chatTargetUserId = useMemo(() => {
    if (!request || !currentUserId) return null
    if (currentUserId === request.created_by) return request.assigned_to
    return request.created_by
  }, [currentUserId, request])

  const canMessage = !!chatTargetUserId && !!currentUserId && chatTargetUserId !== currentUserId

  const reviewTargetUserId = useMemo(() => {
    if (!request || !currentUserId || request.status !== "completed") return null
    if (currentUserId === request.created_by) return request.assigned_to
    if (currentUserId === request.assigned_to) return request.created_by
    return null
  }, [currentUserId, request])

  const existingMyReview = useMemo(() => {
    if (!currentUserId || !reviewTargetUserId) return null
    return (
      reviews.find(
        (item) => item.reviewer_id === currentUserId && item.reviewed_user_id === reviewTargetUserId
      ) || null
    )
  }, [currentUserId, reviewTargetUserId, reviews])

  const canReview = !!reviewTargetUserId && !existingMyReview

  async function sendNotification(targetUserId: string | null, eventType: string, title: string, body?: string | null) {
    if (!targetUserId || targetUserId === currentUserId || !requestId) return

    await supabase.from("notifications").insert({
      user_id: targetUserId,
      event_type: eventType,
      title,
      body: body || null,
      ref_id: requestId,
      is_read: false,
    })
  }

  async function openDirectConversation(otherMemberId: string) {
    if (!currentUserId) return false

    const { data, error } = await supabase.rpc("find_or_create_direct_conversation", {
      other_member_id: otherMemberId,
    })

    if (error || !data) {
      setMessage(error?.message || "Nu am putut porni conversația.")
      return false
    }

    await supabase
      .from("conversation_hidden_for_users")
      .delete()
      .eq("conversation_id", data)
      .eq("user_id", currentUserId)

    router.push(`/messages/${data}?delivery=${requestId || ""}`)
    return true
  }

  async function runRpc(name: string) {
    if (!requestId) return
    setBusy(true)
    setMessage("")

    const { error } = await supabase.rpc(name, { p_request_id: requestId })

    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }

    if (name === "accept_delivery_request") {
      await sendNotification(
        request?.created_by || null,
        "delivery_request_accepted",
        "Livrarea ta a fost acceptată",
        `Un membru a acceptat cererea: ${request?.title || "Livrare"}`
      )

      if (request?.created_by && currentUserId) {
        const opened = await openDirectConversation(request.created_by)
        if (opened) return
      }
    }

    setBusy(false)
  }

  async function handleStartChat() {
    if (!chatTargetUserId || !currentUserId) return

    try {
      setChatBusy(true)
      setMessage("")
      await openDirectConversation(chatTargetUserId)
    } catch (error) {
      console.error("Delivery start chat error:", error)
      setMessage("Nu am putut porni conversația.")
      setChatBusy(false)
    }
  }

  async function handleSubmitReview() {
    if (!requestId || !currentUserId || !reviewTargetUserId) return

    setReviewBusy(true)
    setMessage("")

    const { error } = await supabase.from("delivery_reviews").insert({
      delivery_request_id: requestId,
      reviewer_id: currentUserId,
      reviewed_user_id: reviewTargetUserId,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    })

    if (error) {
      setMessage(error.message)
      setReviewBusy(false)
      return
    }

    setReviewComment("")
    setReviewRating(5)
    setReviewBusy(false)
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
                {canMessage ? (
                  <Button variant="outline" className="rounded-2xl" disabled={chatBusy} onClick={handleStartChat}>
                    {chatBusy ? "Se deschide..." : "Trimite mesaj"}
                  </Button>
                ) : null}

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
                <CardTitle className="text-xl">Evaluări</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canReview ? (
                  <div className="rounded-2xl border p-4">
                    <p className="text-sm font-medium text-slate-900">Lasă o evaluare pentru această livrare</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-[140px_1fr]">
                      <div className="space-y-2">
                        <label className="text-sm text-slate-600">Rating</label>
                        <select
                          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                        >
                          <option value={5}>5</option>
                          <option value={4}>4</option>
                          <option value={3}>3</option>
                          <option value={2}>2</option>
                          <option value={1}>1</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-slate-600">Comentariu</label>
                        <Input value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Opțional" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button className="rounded-2xl" disabled={reviewBusy} onClick={handleSubmitReview}>
                        {reviewBusy ? "Se salvează..." : "Trimite evaluarea"}
                      </Button>
                    </div>
                  </div>
                ) : existingMyReview ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    Ai trimis deja evaluarea ta pentru această livrare.
                  </div>
                ) : (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    Evaluările devin disponibile după finalizarea livrării.
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu există evaluări încă.</div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-xl">{ratingLabel(review.rating)}</Badge>
                        <span className="text-sm text-slate-600">{formatDateTime(review.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{review.comment?.trim() || "Fără comentariu."}</p>
                    </div>
                  ))
                )}
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
