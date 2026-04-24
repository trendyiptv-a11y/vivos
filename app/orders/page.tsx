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
  market_post_id: string
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

type OrderFilter = "all" | "buying" | "selling"

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

export default function OrdersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [orders, setOrders] = useState<MerchantOrder[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})
  const [filter, setFilter] = useState<OrderFilter>("all")

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

      const userIds = Array.from(
        new Set(
          loadedOrders.flatMap((item) => [item.buyer_user_id, item.merchant_user_id]).filter(Boolean)
        )
      )

      if (!userIds.length) {
        setProfilesMap({})
        setLoading(false)
        return
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, alias, email")
        .in("id", userIds)

      if (profilesError) {
        setMessage((prev) => prev || profilesError.message)
        setLoading(false)
        return
      }

      const nextProfilesMap = ((profilesData ?? []) as ProfileLite[]).reduce<Record<string, ProfileLite>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {})

      setProfilesMap(nextProfilesMap)
      setLoading(false)
    }

    loadOrders()
  }, [router])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!currentUserId) return false
      if (filter === "buying") return order.buyer_user_id === currentUserId
      if (filter === "selling") return order.merchant_user_id === currentUserId
      return true
    })
  }, [currentUserId, filter, orders])

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)",
        }}
      >
        <div className="mx-auto flex min-h-[84px] max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>
              Comerț comunitar
            </p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>
              Comenzile mele
            </h1>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/market")}>
            Înapoi în piață
          </Button>
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
              <Button type="button" variant={filter === "all" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("all")}>
                Toate
              </Button>
              <Button type="button" variant={filter === "buying" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("buying")}>
                Cumpăr
              </Button>
              <Button type="button" variant={filter === "selling" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("selling")}>
                Vând
              </Button>
            </div>

            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă comenzile...</div>
            ) : message ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu există comenzi pentru filtrul selectat.</div>
            ) : (
              filteredOrders.map((order) => {
                const isBuyer = currentUserId === order.buyer_user_id
                const otherPartyId = isBuyer ? order.merchant_user_id : order.buyer_user_id
                const otherParty = profilesMap[otherPartyId] || null

                return (
                  <div key={order.id} className="rounded-2xl border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">{orderStatusLabel(order.status)}</Badge>
                      <Badge variant="outline" className="rounded-xl">Plată: {paymentStatusLabel(order.payment_status)}</Badge>
                      {order.delivery_needed ? (
                        <Badge className="rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Cu livrare</Badge>
                      ) : (
                        <Badge className="rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-100">Fără livrare</Badge>
                      )}
                      {isBuyer ? (
                        <Badge variant="outline" className="rounded-xl">Cumpărător</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-xl">Merchant</Badge>
                      )}
                    </div>

                    <p className="text-lg font-semibold">{order.title}</p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p>Cantitate: <span className="font-medium text-slate-900">{order.quantity}</span></p>
                      <p>Preț unitar: <span className="font-medium text-slate-900">{Number(order.unit_price_talanti).toFixed(2)} talanți</span></p>
                      <p>Total: <span className="font-medium text-slate-900">{Number(order.total_talanti).toFixed(2)} talanți</span></p>
                      <p>Creată: <span className="font-medium text-slate-900">{new Date(order.created_at).toLocaleString("ro-RO")}</span></p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p>
                        {isBuyer ? "Merchant" : "Cumpărător"}: <span className="font-medium text-slate-900">{displayProfile(otherParty, "Membru")}</span>
                      </p>
                      <p className="mt-1">
                        Detalii: <span className="font-medium text-slate-900">{order.notes?.trim() || "Fără detalii suplimentare"}</span>
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/member/${otherPartyId}`)}>
                        Vezi profilul
                      </Button>
                      {order.delivery_request_id ? (
                        <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/deliveries/${order.delivery_request_id}`)}>
                          Vezi livrarea
                        </Button>
                      ) : null}
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
