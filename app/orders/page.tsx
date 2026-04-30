"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type MerchantOrder = {
  id: string
  market_post_id: string | null
  merchant_user_id: string
  buyer_user_id: string
  title: string
  quantity: number
  unit_price_talanti: number
  total_talanti: number
  notes: string | null
  delivery_needed: boolean
  status: "new" | "accepted" | "preparing" | "ready" | "in_delivery" | "delivered" | "completed" | "cancelled"
  payment_status: "unpaid" | "held" | "paid" | "refunded" | "cancelled"
  delivery_request_id: string | null
  created_at: string
  updated_at: string
}

type ProfileLite = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
}

type MerchantProfileLite = {
  user_id: string
  display_name: string | null
  business_name: string | null
  phone: string | null
}

type OrderFilter = "all" | "buying" | "selling"

const TALANT_TO_DKK = 100

function formatTalanti(value: number) {
  return Number(value || 0).toFixed(2)
}

function formatDkk(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function talantiToDkk(value: number) {
  return Number(value || 0) * TALANT_TO_DKK
}

function orderStatusLabel(status: MerchantOrder["status"]) {
  if (status === "accepted") return "Acceptată"
  if (status === "preparing") return "În pregătire"
  if (status === "ready") return "Pregătită"
  if (status === "in_delivery") return "În livrare"
  if (status === "delivered") return "Livrată"
  if (status === "completed") return "Finalizată"
  if (status === "cancelled") return "Anulată"
  return "Nouă"
}

function paymentStatusLabel(status: MerchantOrder["payment_status"]) {
  if (status === "held") return "Blocat"
  if (status === "paid") return "Plătit"
  if (status === "refunded") return "Rambursat"
  if (status === "cancelled") return "Anulat"
  return "Neplătit"
}

function displayProfile(profile: ProfileLite | null, fallback: string) {
  return profile?.alias?.trim() || profile?.name?.trim() || profile?.email?.split("@")[0] || fallback
}

function displayMerchant(profile: MerchantProfileLite | null, userProfile: ProfileLite | null, fallback: string) {
  return profile?.display_name?.trim() || profile?.business_name?.trim() || displayProfile(userProfile, fallback)
}

function nextMerchantStatuses(order: MerchantOrder): MerchantOrder["status"][] {
  if (order.status === "new") return ["accepted", "cancelled"]
  if (order.status === "accepted") return ["preparing", "cancelled"]
  if (order.status === "preparing") return ["ready", "cancelled"]
  if (order.status === "ready") return order.delivery_needed ? ["in_delivery", "cancelled"] : ["delivered", "cancelled"]
  if (order.status === "in_delivery") return ["delivered"]
  if (order.status === "delivered") return ["completed"]
  return []
}

function nextBuyerStatuses(order: MerchantOrder): MerchantOrder["status"][] {
  if (order.status === "new") return ["cancelled"]
  if (order.status === "delivered") return ["completed"]
  return []
}

export default function OrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [orders, setOrders] = useState<MerchantOrder[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})
  const [merchantProfilesMap, setMerchantProfilesMap] = useState<Record<string, MerchantProfileLite>>({})
  const [filter, setFilter] = useState<OrderFilter>("all")
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrders() {
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

      const { data, error } = await supabase
        .from("merchant_orders")
        .select("id, market_post_id, merchant_user_id, buyer_user_id, title, quantity, unit_price_talanti, total_talanti, notes, delivery_needed, status, payment_status, delivery_request_id, created_at, updated_at")
        .order("created_at", { ascending: false })

      if (error) {
        setMessage(error.message)
        setOrders([])
        setLoading(false)
        return
      }

      const loadedOrders = (data ?? []) as MerchantOrder[]
      setOrders(loadedOrders)

      const userIds = Array.from(new Set(loadedOrders.flatMap((item) => [item.buyer_user_id, item.merchant_user_id]).filter(Boolean)))
      const merchantUserIds = Array.from(new Set(loadedOrders.map((item) => item.merchant_user_id).filter(Boolean)))

      if (!userIds.length) {
        setProfilesMap({})
        setMerchantProfilesMap({})
        setLoading(false)
        return
      }

      const [profilesResult, merchantProfilesResult] = await Promise.all([
        supabase.from("profiles").select("id, name, alias, email").in("id", userIds),
        merchantUserIds.length
          ? supabase.from("merchant_profiles").select("user_id, display_name, business_name, phone").in("user_id", merchantUserIds).eq("is_active", true)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (profilesResult.error) {
        setMessage((prev) => prev || profilesResult.error.message)
        setLoading(false)
        return
      }

      if (merchantProfilesResult.error) {
        setMessage((prev) => prev || merchantProfilesResult.error.message)
        setLoading(false)
        return
      }

      const nextProfilesMap = ((profilesResult.data ?? []) as ProfileLite[]).reduce<Record<string, ProfileLite>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {})

      const nextMerchantProfilesMap = ((merchantProfilesResult.data ?? []) as MerchantProfileLite[]).reduce<Record<string, MerchantProfileLite>>((acc, item) => {
        acc[item.user_id] = item
        return acc
      }, {})

      setProfilesMap(nextProfilesMap)
      setMerchantProfilesMap(nextMerchantProfilesMap)
      setLoading(false)
    }

    loadOrders()
  }, [router])

  async function handleStatusChange(order: MerchantOrder, nextStatus: MerchantOrder["status"]) {
    setBusyOrderId(order.id)
    setMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setMessage("Sesiunea nu este validă. Reautentifică-te.")
        setBusyOrderId(null)
        return
      }

      const response = await fetch("/api/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, nextStatus }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(result?.error || "Statusul nu a putut fi actualizat.")
        setBusyOrderId(null)
        return
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: (result?.status as MerchantOrder["status"]) || nextStatus,
                payment_status: (result?.paymentStatus as MerchantOrder["payment_status"]) || item.payment_status,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      )

      const recipientUserId = currentUserId === order.buyer_user_id ? order.merchant_user_id : order.buyer_user_id
      const statusText = orderStatusLabel(nextStatus)

      await supabase.from("notifications").insert({
        user_id: recipientUserId,
        event_type: "merchant_order_status_changed",
        title: "Status comandă actualizat",
        body: `${order.title} · ${statusText}`,
        ref_id: order.id,
        is_read: false,
      })

      setBusyOrderId(null)
    } catch (error: any) {
      console.error("Order status update error:", error)
      setMessage(error?.message || "Statusul nu a putut fi actualizat.")
      setBusyOrderId(null)
    }
  }

  async function handleCopyMobilePay(phone: string) {
    try {
      await navigator.clipboard.writeText(phone)
      setMessage(`Numărul MobilePay a fost copiat: ${phone}`)
    } catch {
      setMessage(`Nu am putut copia automat. Folosește manual numărul: ${phone}`)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!currentUserId) return false
      if (filter === "buying") return order.buyer_user_id === currentUserId
      if (filter === "selling") return order.merchant_user_id === currentUserId
      return order.buyer_user_id === currentUserId || order.merchant_user_id === currentUserId
    })
  }, [currentUserId, filter, orders])

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header className="sticky top-0 z-10 border-b backdrop-blur-xl" style={{ background: vivosTheme.styles.bottomNav.background, borderColor: vivosTheme.styles.bottomNav.borderColor, boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)" }}>
        <div className="mx-auto flex min-h-[84px] max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>Comerț comunitar</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>Comenzile mele</h1>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/market")}>Înapoi în piață</Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">Registru comenzi</CardTitle>
            <div className="text-sm text-slate-500">{filteredOrders.length} comenzi</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={filter === "all" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("all")}>Toate</Button>
              <Button type="button" variant={filter === "buying" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("buying")}>Cumpăr</Button>
              <Button type="button" variant={filter === "selling" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("selling")}>Vând</Button>
            </div>

            {message ? <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div> : null}

            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă comenzile...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu există comenzi pentru filtrul selectat.</div>
            ) : (
              filteredOrders.map((order) => {
                const isBuyer = currentUserId === order.buyer_user_id
                const otherPartyId = isBuyer ? order.merchant_user_id : order.buyer_user_id
                const otherParty = profilesMap[otherPartyId] || null
                const otherMerchantProfile = isBuyer ? merchantProfilesMap[order.merchant_user_id] || null : merchantProfilesMap[order.merchant_user_id] || null
                const actionStatuses = isBuyer ? nextBuyerStatuses(order) : nextMerchantStatuses(order)
                const otherPartyLabel = isBuyer
                  ? displayMerchant(otherMerchantProfile, otherParty, "Merchant")
                  : displayProfile(otherParty, "Membru")
                const mobilePayPhone = otherMerchantProfile?.phone?.trim() || null
                const unitDkk = talantiToDkk(order.unit_price_talanti)
                const totalDkk = talantiToDkk(order.total_talanti)

                return (
                  <div key={order.id} className="rounded-2xl border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">{orderStatusLabel(order.status)}</Badge>
                      <Badge variant="outline" className="rounded-xl">Plată internă: {paymentStatusLabel(order.payment_status)}</Badge>
                      {order.delivery_needed ? <Badge className="rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Cu livrare</Badge> : <Badge className="rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-100">Fără livrare</Badge>}
                      {isBuyer ? <Badge variant="outline" className="rounded-xl">Cumpărător</Badge> : <Badge variant="outline" className="rounded-xl">Merchant</Badge>}
                    </div>

                    <p className="text-lg font-semibold">{order.title}</p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p>Cantitate: <span className="font-medium text-slate-900">{order.quantity}</span></p>
                      <p>
                        Preț unitar: <span className="font-medium text-slate-900">{formatTalanti(order.unit_price_talanti)} talanți</span>
                        <span className="mt-1 block text-xs text-slate-500">≈ {formatDkk(unitDkk)}</span>
                      </p>
                      <p>
                        Total: <span className="font-medium text-slate-900">{formatTalanti(order.total_talanti)} talanți</span>
                        <span className="mt-1 block text-xs text-slate-500">≈ {formatDkk(totalDkk)}</span>
                      </p>
                      <p>Creată: <span className="font-medium text-slate-900">{new Date(order.created_at).toLocaleString("ro-RO")}</span></p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p>{isBuyer ? "Merchant" : "Cumpărător"}: <span className="font-medium text-slate-900">{otherPartyLabel}</span></p>
                      <p className="mt-1">Detalii: <span className="font-medium text-slate-900">{order.notes?.trim() || "Fără detalii suplimentare"}</span></p>
                    </div>

                    {isBuyer && mobilePayPhone ? (
                      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
                        <p className="font-medium text-slate-900">Plată externă recomandată în Danemarca</p>
                        <p className="mt-1">Echivalentul orientativ pentru această comandă este <strong>{formatDkk(totalDkk)}</strong>, la ancora VIVOS de <strong>1 talant = 100 DKK</strong>.</p>
                        <p className="mt-1">MobilePay comerciant: <strong>{mobilePayPhone}</strong></p>
                        <p className="mt-2 text-xs text-slate-500">VIVOS păstrează fluxul intern în talanți. MobilePay rămâne puntea practică pentru decontarea fiat externă.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" className="rounded-2xl" onClick={() => handleCopyMobilePay(mobilePayPhone)}>
                            Copiază nr. MobilePay
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {actionStatuses.length ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-medium text-slate-900">Acțiuni disponibile</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {actionStatuses.map((nextStatus) => (
                            <Button key={nextStatus} type="button" variant="outline" className="rounded-2xl" disabled={busyOrderId === order.id} onClick={() => handleStatusChange(order, nextStatus)}>
                              {busyOrderId === order.id ? "Se actualizează..." : orderStatusLabel(nextStatus)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/member/${otherPartyId}`)}>Vezi profilul</Button>
                      {order.delivery_request_id ? <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/deliveries/${order.delivery_request_id}`)}>Vezi livrarea</Button> : null}
                    </div>
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
