"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, Bike, Car, ClipboardList, Package, Plus, UserCheck } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"

type DeliveryStatus = "open" | "accepted" | "picked_up" | "delivered" | "completed" | "cancelled"
type DeliveryPriority = "normal" | "urgent" | "community_help"
type DeliveryRewardType = "free" | "donation" | "paid" | "barter"
type DeliveryCategory = "document" | "small_package" | "shopping" | "market_item" | "community_help" | "other"
type TransportMode = "walking" | "bike" | "car" | "other"
type DeliveryTab = "browse" | "my_requests" | "my_deliveries" | "courier"

type DeliveryRequest = {
  id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  category: DeliveryCategory
  pickup_area: string
  dropoff_area: string
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

type CourierProfile = {
  id: string
  user_id: string
  is_active: boolean
  display_name: string | null
  transport_mode: TransportMode
  coverage_areas: string[]
  availability_notes: string | null
  max_package_size: string | null
  rating_avg: number
  rating_count: number
}

const validTabs: DeliveryTab[] = ["browse", "my_requests", "my_deliveries", "courier"]

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

function transportLabel(mode: TransportMode) {
  switch (mode) {
    case "bike":
      return "Bicicletă"
    case "car":
      return "Mașină"
    case "walking":
      return "Pe jos"
    default:
      return "Alt transport"
  }
}

function transportIcon(mode: TransportMode) {
  if (mode === "bike") return <Bike className="h-4 w-4" />
  if (mode === "car") return <Car className="h-4 w-4" />
  return <UserCheck className="h-4 w-4" />
}

function DeliveryCard({
  request,
  actionLabel,
  actionHref,
}: {
  request: DeliveryRequest
  actionLabel: string
  actionHref: string
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-xl">
          {categoryLabel(request.category)}
        </Badge>
        <Badge variant="outline" className="rounded-xl">
          {priorityLabel(request.priority)}
        </Badge>
        <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
          {statusLabel(request.status)}
        </Badge>
      </div>

      <p className="text-lg font-semibold text-slate-900">{request.title}</p>
      <p className="mt-2 text-sm text-slate-600">
        {request.description?.trim() || "Fără descriere suplimentară"}
      </p>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p>Ridicare: <span className="font-medium text-slate-900">{request.pickup_area}</span></p>
        <p>Predare: <span className="font-medium text-slate-900">{request.dropoff_area}</span></p>
        <p>Recompensă: <span className="font-medium text-slate-900">{rewardLabel(request.reward_type, request.reward_amount)}</span></p>
        <p>Creată: <span className="font-medium text-slate-900">{formatDateTime(request.created_at)}</span></p>
      </div>

      {(request.time_window_start || request.time_window_end) && (
        <p className="mt-3 text-sm text-slate-600">
          Interval: <span className="font-medium text-slate-900">{formatDateTime(request.time_window_start)} — {formatDateTime(request.time_window_end)}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button className="rounded-2xl" onClick={() => { window.location.href = actionHref }}>
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}

export default function DeliveriesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [browseRequests, setBrowseRequests] = useState<DeliveryRequest[]>([])
  const [myRequests, setMyRequests] = useState<DeliveryRequest[]>([])
  const [myDeliveries, setMyDeliveries] = useState<DeliveryRequest[]>([])
  const [courierProfile, setCourierProfile] = useState<CourierProfile | null>(null)

  const activeTab = useMemo<DeliveryTab>(() => {
    const tab = searchParams.get("tab")
    if (tab && validTabs.includes(tab as DeliveryTab)) return tab as DeliveryTab
    return "browse"
  }, [searchParams])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    async function loadData() {
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
      setUserEmail(session.user.email ?? null)

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [
        browseResult,
        mineResult,
        assignedResult,
        courierResult,
        unreadResult,
        pulseResult,
      ] = await Promise.all([
        supabase
          .from("delivery_requests")
          .select("id, created_by, assigned_to, title, description, category, pickup_area, dropoff_area, reward_type, reward_amount, priority, status, created_at, accepted_at, picked_up_at, delivered_at, completed_at, cancelled_at, time_window_start, time_window_end")
          .eq("status", "open")
          .order("created_at", { ascending: false }),
        supabase
          .from("delivery_requests")
          .select("id, created_by, assigned_to, title, description, category, pickup_area, dropoff_area, reward_type, reward_amount, priority, status, created_at, accepted_at, picked_up_at, delivered_at, completed_at, cancelled_at, time_window_start, time_window_end")
          .eq("created_by", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("delivery_requests")
          .select("id, created_by, assigned_to, title, description, category, pickup_area, dropoff_area, reward_type, reward_amount, priority, status, created_at, accepted_at, picked_up_at, delivered_at, completed_at, cancelled_at, time_window_start, time_window_end")
          .eq("assigned_to", session.user.id)
          .order("accepted_at", { ascending: false }),
        supabase
          .from("courier_profiles")
          .select("id, user_id, is_active, display_name, transport_mode, coverage_areas, availability_notes, max_package_size, rating_avg, rating_count")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("is_read", false),
        supabase
          .from("public_activity_feed")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since),
      ])

      if (browseResult.error || mineResult.error || assignedResult.error || courierResult.error) {
        setMessage(
          browseResult.error?.message ||
            mineResult.error?.message ||
            assignedResult.error?.message ||
            courierResult.error?.message ||
            "Nu am putut încărca livrările."
        )
      }

      setBrowseRequests((browseResult.data ?? []) as DeliveryRequest[])
      setMyRequests((mineResult.data ?? []) as DeliveryRequest[])
      setMyDeliveries((assignedResult.data ?? []) as DeliveryRequest[])
      setCourierProfile((courierResult.data as CourierProfile | null) ?? null)
      setUnreadCount(unreadResult.count || 0)
      setPublicPulseCount(pulseResult.count || 0)
      setLoading(false)
    }

    loadData()

    const requestsChannel = supabase
      .channel("deliveries-page-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_requests" }, loadData)
      .subscribe()

    const courierChannel = supabase
      .channel("deliveries-page-courier")
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_profiles" }, loadData)
      .subscribe()

    return () => {
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(courierChannel)
    }
  }, [router])

  const setTab = (tab: DeliveryTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`/deliveries?${params.toString()}`)
  }

  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0

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
        <div className="flex min-h-[84px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>
              Platforma comunitară
            </p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>
              Livrări
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border transition"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.10)",
                  color: vivosTheme.colors.white,
                }}
                onClick={() => { window.location.href = "/notifications" }}
              >
                <Bell className="h-5 w-5" />
              </button>

              {showUnreadBadge && (
                <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white" style={{ background: vivosTheme.colors.purple, boxShadow: vivosTheme.shadows.soft }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}

              {showPublicBadge && (
                <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white" style={{ background: vivosTheme.colors.teal, boxShadow: vivosTheme.shadows.soft }}>
                  {publicPulseCount > 99 ? "99+" : publicPulseCount}
                </div>
              )}
            </div>

            {userEmail ? (
              <>
                <div className="hidden max-w-[180px] truncate rounded-2xl border px-3 py-2 text-sm sm:block" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)" }}>
                  {userEmail}
                </div>

                <div className="relative" ref={profileMenuRef}>
                  <button className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30" onClick={() => setProfileMenuOpen((prev) => !prev)}>
                    <Avatar className="h-10 w-10 rounded-2xl border border-white/15 shadow-sm">
                      <AvatarFallback className="rounded-2xl text-white" style={{ background: getVivosAvatarGradient(userEmail) }}>
                        {userEmail.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border p-2 shadow-lg" style={{ background: "rgba(18,46,84,0.98)", borderColor: "rgba(255,255,255,0.10)", boxShadow: vivosTheme.shadows.modal }}>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/profile" }}>
                        Profil
                      </button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/market" }}>
                        Piață
                      </button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10" onClick={async () => { setProfileMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/" }}>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#173F74] via-[#204E8C] to-[#63A6E6] p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Package className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold sm:text-3xl">Livrări comunitare</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
                Cereri locale de transport între membrii VIVOS, conectate cu piața și cu sprijinul reciproc din comunitate.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="rounded-2xl bg-white text-[#173F74] hover:bg-white" onClick={() => router.push("/deliveries/create") }>
              <Plus className="mr-2 h-4 w-4" />
              Am nevoie de livrare
            </Button>
            <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/15" onClick={() => setTab("courier")}>
              <UserCheck className="mr-2 h-4 w-4" />
              Pot face livrări
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">Deschise</p><p className="mt-2 text-3xl font-semibold text-slate-900">{browseRequests.length}</p></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">Cererile mele</p><p className="mt-2 text-3xl font-semibold text-slate-900">{myRequests.length}</p></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">Livrările mele</p><p className="mt-2 text-3xl font-semibold text-slate-900">{myDeliveries.length}</p></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">Curier activ</p><p className="mt-2 text-3xl font-semibold text-slate-900">{courierProfile?.is_active ? "Da" : "Nu"}</p></CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === "browse" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("browse")}>Browse</Button>
          <Button variant={activeTab === "my_requests" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("my_requests")}>My Requests</Button>
          <Button variant={activeTab === "my_deliveries" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("my_deliveries")}>My Deliveries</Button>
          <Button variant={activeTab === "courier" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("courier")}>Courier</Button>
        </div>

        {loading ? (
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6 text-sm text-slate-600">Se încarcă livrările...</CardContent></Card>
        ) : message ? (
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6 text-sm text-slate-600">{message}</CardContent></Card>
        ) : null}

        {!loading && !message && activeTab === "browse" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Cereri deschise</CardTitle>
              <div className="text-sm text-slate-500">{browseRequests.length} disponibile</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {browseRequests.length === 0 ? (
                <div className="rounded-2xl border p-6 text-sm text-slate-600">Nu există cereri deschise în acest moment.</div>
              ) : (
                browseRequests.map((request) => (
                  <DeliveryCard key={request.id} request={request} actionLabel="Vezi detalii" actionHref={`/deliveries/${request.id}`} />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !message && activeTab === "my_requests" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Cererile mele</CardTitle>
              <div className="text-sm text-slate-500">{myRequests.length} totale</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {myRequests.length === 0 ? (
                <div className="rounded-2xl border p-6 text-sm text-slate-600">Nu ai creat încă cereri de livrare.</div>
              ) : (
                myRequests.map((request) => (
                  <DeliveryCard key={request.id} request={request} actionLabel="Administrează" actionHref={`/deliveries/${request.id}`} />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !message && activeTab === "my_deliveries" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Livrările mele</CardTitle>
              <div className="text-sm text-slate-500">{myDeliveries.length} acceptate</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {myDeliveries.length === 0 ? (
                <div className="rounded-2xl border p-6 text-sm text-slate-600">Nu ai acceptat încă nicio livrare.</div>
              ) : (
                myDeliveries.map((request) => (
                  <DeliveryCard key={request.id} request={request} actionLabel="Continuă" actionHref={`/deliveries/${request.id}`} />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !message && activeTab === "courier" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Profil de curier</CardTitle>
              <div className="text-sm text-slate-500">Disponibilitate și zone</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {courierProfile ? (
                <div className="rounded-2xl border p-5">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    {transportIcon(courierProfile.transport_mode)}
                    <span className="font-medium">{transportLabel(courierProfile.transport_mode)}</span>
                    <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                      {courierProfile.is_active ? "Activ" : "Inactiv"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">Nume afișat: <span className="font-medium text-slate-900">{courierProfile.display_name?.trim() || userEmail || "Necompletat"}</span></p>
                  <p className="mt-2 text-sm text-slate-600">Zone: <span className="font-medium text-slate-900">{courierProfile.coverage_areas?.length ? courierProfile.coverage_areas.join(", ") : "Necompletat"}</span></p>
                  <p className="mt-2 text-sm text-slate-600">Capacitate: <span className="font-medium text-slate-900">{courierProfile.max_package_size?.trim() || "Necompletat"}</span></p>
                  <p className="mt-2 text-sm text-slate-600">Disponibilitate: <span className="font-medium text-slate-900">{courierProfile.availability_notes?.trim() || "Necompletat"}</span></p>
                  <p className="mt-2 text-sm text-slate-600">Rating: <span className="font-medium text-slate-900">{courierProfile.rating_count > 0 ? `${courierProfile.rating_avg} / 5 (${courierProfile.rating_count})` : "Fără evaluări"}</span></p>
                </div>
              ) : (
                <div className="rounded-2xl border p-5 text-sm text-slate-600">Nu ai încă profil de curier configurat.</div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl" onClick={() => router.push("/deliveries/create?mode=courier") }>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {courierProfile ? "Editează profilul" : "Activează profilul"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
