"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, Bike, Car, ClipboardList, Package, Plus, Search, UserCheck } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"
import { useI18n } from "@/lib/i18n/provider"

type AppLang = "ro" | "da" | "en"

const deliveriesTexts: Record<AppLang, Record<string, string>> = {
  ro: {
    platform: "Platforma comunitară",
    title: "Livrări",
    profile: "Profil",
    market: "Piață",
    logout: "Logout",
    heroTitle: "Livrări comunitare",
    heroSubtitle: "Cereri locale de transport între membrii VIVOS, conectate cu piața și cu sprijinul reciproc din comunitate.",
    needDelivery: "Am nevoie de livrare",
    canDeliver: "Pot face livrări",
    statOpen: "Deschise",
    statMyRequests: "Cererile mele",
    statMyDeliveries: "Livrările mele",
    statActiveCourier: "Curier activ",
    yes: "Da",
    no: "Nu",
    tabBrowse: "Descoperă",
    tabMyRequests: "Cererile mele",
    tabMyDeliveries: "Livrările mele",
    tabCourier: "Curier",
    searchPlaceholder: "Caută după titlu, zonă sau categorie",
    filterAll: "Toate",
    filterOpen: "Deschise",
    filterAccepted: "Acceptate",
    filterPickedUp: "Ridicate",
    filterDelivered: "Predate",
    filterCompleted: "Finalizate",
    filterCancelled: "Anulate",
    filterUrgent: "Urgente",
    filterCommunityHelp: "Ajutor comunitar",
    sortNewest: "Cele mai noi",
    sortOldest: "Cele mai vechi",
    sortUrgentFirst: "Urgente primele",
    sortByStatus: "După status",
    loading: "Se încarcă livrările...",
    loadError: "Nu am putut încărca livrările.",
    noResults: "Nu există rezultate pentru filtrele curente.",
    displayed: "afișate",
    openRequests: "Cereri deschise",
    myRequests: "Cererile mele",
    myDeliveries: "Livrările mele",
    courierProfile: "Profil de curier",
    courierAvailability: "Disponibilitate și zone",
    viewDetails: "Vezi detalii",
    manage: "Administrează",
    continueDelivery: "Continuă",
    editProfile: "Editează profilul",
    activateProfile: "Activează profilul",
    noCourierProfile: "Nu ai încă profil de curier configurat.",
    displayName: "Nume afișat",
    zones: "Zone",
    capacity: "Capacitate",
    availability: "Disponibilitate",
    rating: "Rating",
    notFilled: "Necompletat",
    noRatings: "Fără evaluări",
    statusOpen: "Deschisă",
    statusAccepted: "Acceptată",
    statusPickedUp: "Ridicată",
    statusDelivered: "Predată",
    statusCompleted: "Finalizată",
    statusCancelled: "Anulată",
    priorityUrgent: "Urgent",
    priorityCommunityHelp: "Ajutor comunitar",
    priorityNormal: "Normal",
    rewardFree: "Gratuit",
    rewardDonation: "Donație",
    rewardPaid: "Plătit",
    rewardBarter: "Barter",
    catDocument: "Document",
    catSmallPackage: "Pachet mic",
    catShopping: "Cumpărături",
    catMarketItem: "Obiect din piață",
    catCommunityHelp: "Ajutor comunitar",
    catOther: "Altceva",
    transportBike: "Bicicletă",
    transportCar: "Mașină",
    transportWalking: "Pe jos",
    transportOther: "Alt transport",
    courierActive: "Activ",
    courierInactive: "Inactiv",
    pickup: "Ridicare",
    dropoff: "Predare",
    reward: "Recompensă",
    created: "Creată",
    interval: "Interval",
    noDescription: "Fără descriere suplimentară",
  },
  da: {
    platform: "Fællesskabsplatform",
    title: "Levering",
    profile: "Profil",
    market: "Marked",
    logout: "Log ud",
    heroTitle: "Fællesskabsleveringer",
    heroSubtitle: "Lokale transportanmodninger mellem VIVOS-medlemmer, forbundet med markedet og gensidig støtte i fællesskabet.",
    needDelivery: "Jeg har brug for levering",
    canDeliver: "Jeg kan levere",
    statOpen: "Åbne",
    statMyRequests: "Mine anmodninger",
    statMyDeliveries: "Mine leveringer",
    statActiveCourier: "Aktiv kurier",
    yes: "Ja",
    no: "Nej",
    tabBrowse: "Udforsk",
    tabMyRequests: "Mine anmodninger",
    tabMyDeliveries: "Mine leveringer",
    tabCourier: "Kurier",
    searchPlaceholder: "Søg efter titel, område eller kategori",
    filterAll: "Alle",
    filterOpen: "Åbne",
    filterAccepted: "Accepterede",
    filterPickedUp: "Afhentet",
    filterDelivered: "Leveret",
    filterCompleted: "Afsluttet",
    filterCancelled: "Annulleret",
    filterUrgent: "Hastende",
    filterCommunityHelp: "Fællesskabshjælp",
    sortNewest: "Nyeste",
    sortOldest: "Ældste",
    sortUrgentFirst: "Hastende først",
    sortByStatus: "Efter status",
    loading: "Indlæser leveringer...",
    loadError: "Kunne ikke indlæse leveringer.",
    noResults: "Ingen resultater for de aktuelle filtre.",
    displayed: "vist",
    openRequests: "Åbne anmodninger",
    myRequests: "Mine anmodninger",
    myDeliveries: "Mine leveringer",
    courierProfile: "Kurierprofil",
    courierAvailability: "Tilgængelighed og områder",
    viewDetails: "Se detaljer",
    manage: "Administrer",
    continueDelivery: "Fortsæt",
    editProfile: "Rediger profil",
    activateProfile: "Aktiver profil",
    noCourierProfile: "Du har endnu ingen kurierprofil konfigureret.",
    displayName: "Vist navn",
    zones: "Områder",
    capacity: "Kapacitet",
    availability: "Tilgængelighed",
    rating: "Bedømmelse",
    notFilled: "Ikke udfyldt",
    noRatings: "Ingen bedømmelser",
    statusOpen: "Åben",
    statusAccepted: "Accepteret",
    statusPickedUp: "Afhentet",
    statusDelivered: "Leveret",
    statusCompleted: "Afsluttet",
    statusCancelled: "Annulleret",
    priorityUrgent: "Hastende",
    priorityCommunityHelp: "Fællesskabshjælp",
    priorityNormal: "Normal",
    rewardFree: "Gratis",
    rewardDonation: "Donation",
    rewardPaid: "Betalt",
    rewardBarter: "Byttehandel",
    catDocument: "Dokument",
    catSmallPackage: "Lille pakke",
    catShopping: "Indkøb",
    catMarketItem: "Markeds­vare",
    catCommunityHelp: "Fællesskabshjælp",
    catOther: "Andet",
    transportBike: "Cykel",
    transportCar: "Bil",
    transportWalking: "Til fods",
    transportOther: "Andet transport",
    courierActive: "Aktiv",
    courierInactive: "Inaktiv",
    pickup: "Afhentning",
    dropoff: "Aflevering",
    reward: "Belønning",
    created: "Oprettet",
    interval: "Interval",
    noDescription: "Ingen yderligere beskrivelse",
  },
  en: {
    platform: "Community platform",
    title: "Deliveries",
    profile: "Profile",
    market: "Market",
    logout: "Logout",
    heroTitle: "Community deliveries",
    heroSubtitle: "Local transport requests between VIVOS members, connected with the marketplace and mutual community support.",
    needDelivery: "I need a delivery",
    canDeliver: "I can deliver",
    statOpen: "Open",
    statMyRequests: "My requests",
    statMyDeliveries: "My deliveries",
    statActiveCourier: "Active courier",
    yes: "Yes",
    no: "No",
    tabBrowse: "Browse",
    tabMyRequests: "My requests",
    tabMyDeliveries: "My deliveries",
    tabCourier: "Courier",
    searchPlaceholder: "Search by title, area or category",
    filterAll: "All",
    filterOpen: "Open",
    filterAccepted: "Accepted",
    filterPickedUp: "Picked up",
    filterDelivered: "Delivered",
    filterCompleted: "Completed",
    filterCancelled: "Cancelled",
    filterUrgent: "Urgent",
    filterCommunityHelp: "Community help",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortUrgentFirst: "Urgent first",
    sortByStatus: "By status",
    loading: "Loading deliveries...",
    loadError: "Could not load deliveries.",
    noResults: "No results for the current filters.",
    displayed: "displayed",
    openRequests: "Open requests",
    myRequests: "My requests",
    myDeliveries: "My deliveries",
    courierProfile: "Courier profile",
    courierAvailability: "Availability and areas",
    viewDetails: "View details",
    manage: "Manage",
    continueDelivery: "Continue",
    editProfile: "Edit profile",
    activateProfile: "Activate profile",
    noCourierProfile: "You don't have a courier profile configured yet.",
    displayName: "Display name",
    zones: "Areas",
    capacity: "Capacity",
    availability: "Availability",
    rating: "Rating",
    notFilled: "Not filled",
    noRatings: "No ratings",
    statusOpen: "Open",
    statusAccepted: "Accepted",
    statusPickedUp: "Picked up",
    statusDelivered: "Delivered",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    priorityUrgent: "Urgent",
    priorityCommunityHelp: "Community help",
    priorityNormal: "Normal",
    rewardFree: "Free",
    rewardDonation: "Donation",
    rewardPaid: "Paid",
    rewardBarter: "Barter",
    catDocument: "Document",
    catSmallPackage: "Small package",
    catShopping: "Shopping",
    catMarketItem: "Market item",
    catCommunityHelp: "Community help",
    catOther: "Other",
    transportBike: "Bicycle",
    transportCar: "Car",
    transportWalking: "On foot",
    transportOther: "Other transport",
    courierActive: "Active",
    courierInactive: "Inactive",
    pickup: "Pickup",
    dropoff: "Dropoff",
    reward: "Reward",
    created: "Created",
    interval: "Interval",
    noDescription: "No additional description",
  },
}

function localeFromLanguage(language: string) {
  if (language === "da") return "da-DK"
  if (language === "en") return "en-US"
  return "ro-RO"
}

type DeliveryStatus = "open" | "accepted" | "picked_up" | "delivered" | "completed" | "cancelled"
type DeliveryPriority = "normal" | "urgent" | "community_help"
type DeliveryRewardType = "free" | "donation" | "paid" | "barter"
type DeliveryCategory = "document" | "small_package" | "shopping" | "market_item" | "community_help" | "other"
type TransportMode = "walking" | "bike" | "car" | "other"
type DeliveryTab = "browse" | "my_requests" | "my_deliveries" | "courier"
type DeliveryFilter = "all" | "open" | "accepted" | "picked_up" | "delivered" | "completed" | "cancelled" | "urgent" | "community_help"
type DeliverySort = "newest" | "oldest" | "urgent_first" | "status"

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

function readTabFromLocation(): DeliveryTab {
  if (typeof window === "undefined") return "browse"
  const params = new URLSearchParams(window.location.search)
  const tab = params.get("tab")
  if (tab && validTabs.includes(tab as DeliveryTab)) return tab as DeliveryTab
  return "browse"
}

function matchesFilter(request: DeliveryRequest, filter: DeliveryFilter) {
  if (filter === "all") return true
  if (filter === "urgent") return request.priority === "urgent"
  if (filter === "community_help") return request.priority === "community_help" || request.category === "community_help"
  return request.status === filter
}

function statusRank(status: DeliveryStatus) {
  switch (status) {
    case "open": return 0
    case "accepted": return 1
    case "picked_up": return 2
    case "delivered": return 3
    case "completed": return 4
    case "cancelled": return 5
    default: return 99
  }
}

function sortRequests(items: DeliveryRequest[], sort: DeliverySort) {
  const copy = [...items]
  if (sort === "oldest") return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  if (sort === "urgent_first") {
    return copy.sort((a, b) => {
      const ap = a.priority === "urgent" ? 0 : a.priority === "community_help" ? 1 : 2
      const bp = b.priority === "urgent" ? 0 : b.priority === "community_help" ? 1 : 2
      if (ap !== bp) return ap - bp
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }
  if (sort === "status") {
    return copy.sort((a, b) => {
      const diff = statusRank(a.status) - statusRank(b.status)
      if (diff !== 0) return diff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }
  return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

function filterAndSortRequests(
  items: DeliveryRequest[],
  query: string,
  filter: DeliveryFilter,
  sort: DeliverySort,
  labelFns: { status: (s: DeliveryStatus) => string; priority: (p: DeliveryPriority) => string; category: (c: DeliveryCategory) => string }
) {
  const q = query.trim().toLowerCase()
  const filtered = items.filter((request) => {
    if (!matchesFilter(request, filter)) return false
    if (!q) return true
    const haystack = [
      request.title,
      request.description || "",
      request.pickup_area,
      request.dropoff_area,
      labelFns.category(request.category),
      labelFns.priority(request.priority),
      labelFns.status(request.status),
    ].join(" ").toLowerCase()
    return haystack.includes(q)
  })
  return sortRequests(filtered, sort)
}

function DeliveryCard({
  request,
  actionLabel,
  actionHref,
  text,
  locale,
  statusLabel,
  priorityLabel,
  rewardLabel,
  categoryLabel,
}: {
  request: DeliveryRequest
  actionLabel: string
  actionHref: string
  text: Record<string, string>
  locale: string
  statusLabel: (s: DeliveryStatus) => string
  priorityLabel: (p: DeliveryPriority) => string
  rewardLabel: (t: DeliveryRewardType, a: number | null) => string
  categoryLabel: (c: DeliveryCategory) => string
}) {
  const formatDateTime = (value: string | null) => {
    if (!value) return text.notFilled
    return new Date(value).toLocaleString(locale)
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-xl">{categoryLabel(request.category)}</Badge>
        <Badge variant="outline" className="rounded-xl">{priorityLabel(request.priority)}</Badge>
        <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">{statusLabel(request.status)}</Badge>
      </div>

      <p className="text-lg font-semibold text-slate-900">{request.title}</p>
      <p className="mt-2 text-sm text-slate-600">{request.description?.trim() || text.noDescription}</p>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p>{text.pickup}: <span className="font-medium text-slate-900">{request.pickup_area}</span></p>
        <p>{text.dropoff}: <span className="font-medium text-slate-900">{request.dropoff_area}</span></p>
        <p>{text.reward}: <span className="font-medium text-slate-900">{rewardLabel(request.reward_type, request.reward_amount)}</span></p>
        <p>{text.created}: <span className="font-medium text-slate-900">{formatDateTime(request.created_at)}</span></p>
      </div>

      {(request.time_window_start || request.time_window_end) && (
        <p className="mt-3 text-sm text-slate-600">
          {text.interval}: <span className="font-medium text-slate-900">{formatDateTime(request.time_window_start)} — {formatDateTime(request.time_window_end)}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button className="rounded-2xl" onClick={() => { window.location.href = actionHref }}>{actionLabel}</Button>
      </div>
    </div>
  )
}

export default function DeliveriesPage() {
  const router = useRouter()
  const { language } = useI18n()
  const lang = (language === "da" || language === "en" ? language : "ro") as AppLang
  const text = deliveriesTexts[lang]
  const locale = localeFromLanguage(lang)

  const statusLabel = (status: DeliveryStatus) => {
    switch (status) {
      case "accepted": return text.statusAccepted
      case "picked_up": return text.statusPickedUp
      case "delivered": return text.statusDelivered
      case "completed": return text.statusCompleted
      case "cancelled": return text.statusCancelled
      default: return text.statusOpen
    }
  }

  const priorityLabel = (priority: DeliveryPriority) => {
    if (priority === "urgent") return text.priorityUrgent
    if (priority === "community_help") return text.priorityCommunityHelp
    return text.priorityNormal
  }

  const rewardLabel = (type: DeliveryRewardType, amount: number | null) => {
    if (type === "free") return text.rewardFree
    if (type === "donation") return amount ? `${text.rewardDonation} · ${amount}` : text.rewardDonation
    if (type === "paid") return amount ? `${text.rewardPaid} · ${amount}` : text.rewardPaid
    return amount ? `${text.rewardBarter} · ${amount}` : text.rewardBarter
  }

  const categoryLabel = (category: DeliveryCategory) => {
    switch (category) {
      case "document": return text.catDocument
      case "small_package": return text.catSmallPackage
      case "shopping": return text.catShopping
      case "market_item": return text.catMarketItem
      case "community_help": return text.catCommunityHelp
      default: return text.catOther
    }
  }

  const transportLabel = (mode: TransportMode) => {
    switch (mode) {
      case "bike": return text.transportBike
      case "car": return text.transportCar
      case "walking": return text.transportWalking
      default: return text.transportOther
    }
  }

  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [browseRequests, setBrowseRequests] = useState<DeliveryRequest[]>([])
  const [myRequests, setMyRequests] = useState<DeliveryRequest[]>([])
  const [myDeliveries, setMyDeliveries] = useState<DeliveryRequest[]>([])
  const [courierProfile, setCourierProfile] = useState<CourierProfile | null>(null)
  const [activeTab, setActiveTabState] = useState<DeliveryTab>("browse")
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<DeliveryFilter>("all")
  const [sort, setSort] = useState<DeliverySort>("newest")

  useEffect(() => { setActiveTabState(readTabFromLocation()) }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) setProfileMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setMessage("")

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push("/login"); return }

      setUserEmail(session.user.email ?? null)

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [browseResult, mineResult, assignedResult, courierResult, unreadResult, pulseResult] = await Promise.all([
        supabase.from("delivery_requests").select("id, created_by, assigned_to, title, description, category, pickup_area, dropoff_area, reward_type, reward_amount, priority, status, created_at, accepted_at, picked_up_at, delivered_at, completed_at, cancelled_at, time_window_start, time_window_end").eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("delivery_requests").select("id, created_by, assigned_to, title, description, category, pickup_area, dropoff_area, reward_type, reward_amount, priority, status, created_at, accepted_at, picked_up_at, delivered_at, completed_at, cancelled_at, time_window_start, time_window_end").eq("created_by", session.user.id).order("created_at", { ascending: false }),
        supabase.from("delivery_requests").select("id, created_by, assigned_to, title, description, category, pickup_area, dropoff_area, reward_type, reward_amount, priority, status, created_at, accepted_at, picked_up_at, delivered_at, completed_at, cancelled_at, time_window_start, time_window_end").eq("assigned_to", session.user.id).order("accepted_at", { ascending: false }),
        supabase.from("courier_profiles").select("id, user_id, is_active, display_name, transport_mode, coverage_areas, availability_notes, max_package_size, rating_avg, rating_count").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", session.user.id).eq("is_read", false),
        supabase.from("public_activity_feed").select("*", { count: "exact", head: true }).gte("created_at", since),
      ])

      if (browseResult.error || mineResult.error || assignedResult.error || courierResult.error) {
        setMessage(browseResult.error?.message || mineResult.error?.message || assignedResult.error?.message || courierResult.error?.message || text.loadError)
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

    const requestsChannel = supabase.channel("deliveries-page-requests").on("postgres_changes", { event: "*", schema: "public", table: "delivery_requests" }, loadData).subscribe()
    const courierChannel = supabase.channel("deliveries-page-courier").on("postgres_changes", { event: "*", schema: "public", table: "courier_profiles" }, loadData).subscribe()
    const handlePopState = () => setActiveTabState(readTabFromLocation())
    window.addEventListener("popstate", handlePopState)

    return () => {
      supabase.removeChannel(requestsChannel)
      supabase.removeChannel(courierChannel)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [router])

  const setTab = (tab: DeliveryTab) => {
    setActiveTabState(tab)
    router.push(`/deliveries?tab=${tab}`)
  }

  const labelFns = { status: statusLabel, priority: priorityLabel, category: categoryLabel }

  const filteredBrowseRequests = useMemo(() => filterAndSortRequests(browseRequests, searchQuery, filter, sort, labelFns), [browseRequests, searchQuery, filter, sort])
  const filteredMyRequests = useMemo(() => filterAndSortRequests(myRequests, searchQuery, filter, sort, labelFns), [myRequests, searchQuery, filter, sort])
  const filteredMyDeliveries = useMemo(() => filterAndSortRequests(myDeliveries, searchQuery, filter, sort, labelFns), [myDeliveries, searchQuery, filter, sort])

  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header className="sticky top-0 z-10 border-b backdrop-blur-xl" style={{ background: vivosTheme.styles.bottomNav.background, borderColor: vivosTheme.styles.bottomNav.borderColor, boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)" }}>
        <div className="flex min-h-[84px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>{text.platform}</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>{text.title}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button type="button" className="flex h-12 w-12 items-center justify-center rounded-2xl border transition" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.10)", color: vivosTheme.colors.white }} onClick={() => { window.location.href = "/notifications" }}>
                <Bell className="h-5 w-5" />
              </button>
              {showUnreadBadge && <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white" style={{ background: vivosTheme.colors.purple, boxShadow: vivosTheme.shadows.soft }}>{unreadCount > 99 ? "99+" : unreadCount}</div>}
              {showPublicBadge && <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white" style={{ background: vivosTheme.colors.teal, boxShadow: vivosTheme.shadows.soft }}>{publicPulseCount > 99 ? "99+" : publicPulseCount}</div>}
            </div>

            {userEmail ? (
              <>
                <div className="hidden max-w-[180px] truncate rounded-2xl border px-3 py-2 text-sm sm:block" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)" }}>{userEmail}</div>
                <div className="relative" ref={profileMenuRef}>
                  <button className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30" onClick={() => setProfileMenuOpen((prev) => !prev)}>
                    <Avatar className="h-10 w-10 rounded-2xl border border-white/15 shadow-sm">
                      <AvatarFallback className="rounded-2xl text-white" style={{ background: getVivosAvatarGradient(userEmail) }}>{userEmail.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border p-2 shadow-lg" style={{ background: "rgba(18,46,84,0.98)", borderColor: "rgba(255,255,255,0.10)", boxShadow: vivosTheme.shadows.modal }}>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/profile" }}>{text.profile}</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/market" }}>{text.market}</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10" onClick={async () => { setProfileMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/" }}>{text.logout}</button>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Package className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold sm:text-3xl">{text.heroTitle}</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">{text.heroSubtitle}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="rounded-2xl bg-white text-[#173F74] hover:bg-white" onClick={() => router.push("/deliveries/create")}>
              <Plus className="mr-2 h-4 w-4" />{text.needDelivery}
            </Button>
            <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/15" onClick={() => setTab("courier")}>
              <UserCheck className="mr-2 h-4 w-4" />{text.canDeliver}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">{text.statOpen}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{browseRequests.length}</p></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">{text.statMyRequests}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{myRequests.length}</p></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">{text.statMyDeliveries}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{myDeliveries.length}</p></CardContent></Card>
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-slate-500">{text.statActiveCourier}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{courierProfile?.is_active ? text.yes : text.no}</p></CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === "browse" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("browse")}>{text.tabBrowse}</Button>
          <Button variant={activeTab === "my_requests" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("my_requests")}>{text.tabMyRequests}</Button>
          <Button variant={activeTab === "my_deliveries" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("my_deliveries")}>{text.tabMyDeliveries}</Button>
          <Button variant={activeTab === "courier" ? "default" : "outline"} className="rounded-2xl" onClick={() => setTab("courier")}>{text.tabCourier}</Button>
        </div>

        {activeTab !== "courier" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[1.3fr_0.9fr_0.9fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none" placeholder={text.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <select className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900" value={filter} onChange={(e) => setFilter(e.target.value as DeliveryFilter)}>
                <option value="all">{text.filterAll}</option>
                <option value="open">{text.filterOpen}</option>
                <option value="accepted">{text.filterAccepted}</option>
                <option value="picked_up">{text.filterPickedUp}</option>
                <option value="delivered">{text.filterDelivered}</option>
                <option value="completed">{text.filterCompleted}</option>
                <option value="cancelled">{text.filterCancelled}</option>
                <option value="urgent">{text.filterUrgent}</option>
                <option value="community_help">{text.filterCommunityHelp}</option>
              </select>
              <select className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900" value={sort} onChange={(e) => setSort(e.target.value as DeliverySort)}>
                <option value="newest">{text.sortNewest}</option>
                <option value="oldest">{text.sortOldest}</option>
                <option value="urgent_first">{text.sortUrgentFirst}</option>
                <option value="status">{text.sortByStatus}</option>
              </select>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6 text-sm text-slate-600">{text.loading}</CardContent></Card>
        ) : message ? (
          <Card className="rounded-3xl border-0 shadow-sm"><CardContent className="p-6 text-sm text-slate-600">{message}</CardContent></Card>
        ) : null}

        {!loading && !message && activeTab === "browse" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">{text.openRequests}</CardTitle>
              <div className="text-sm text-slate-500">{filteredBrowseRequests.length} {text.displayed}</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {filteredBrowseRequests.length === 0 ? (
                <div className="rounded-2xl border p-6 text-sm text-slate-600">{text.noResults}</div>
              ) : (
                filteredBrowseRequests.map((request) => (
                  <DeliveryCard key={request.id} request={request} actionLabel={text.viewDetails} actionHref={`/deliveries/${request.id}`} text={text} locale={locale} statusLabel={statusLabel} priorityLabel={priorityLabel} rewardLabel={rewardLabel} categoryLabel={categoryLabel} />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !message && activeTab === "my_requests" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">{text.myRequests}</CardTitle>
              <div className="text-sm text-slate-500">{filteredMyRequests.length} {text.displayed}</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {filteredMyRequests.length === 0 ? (
                <div className="rounded-2xl border p-6 text-sm text-slate-600">{text.noResults}</div>
              ) : (
                filteredMyRequests.map((request) => (
                  <DeliveryCard key={request.id} request={request} actionLabel={text.manage} actionHref={`/deliveries/${request.id}`} text={text} locale={locale} statusLabel={statusLabel} priorityLabel={priorityLabel} rewardLabel={rewardLabel} categoryLabel={categoryLabel} />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !message && activeTab === "my_deliveries" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">{text.myDeliveries}</CardTitle>
              <div className="text-sm text-slate-500">{filteredMyDeliveries.length} {text.displayed}</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {filteredMyDeliveries.length === 0 ? (
                <div className="rounded-2xl border p-6 text-sm text-slate-600">{text.noResults}</div>
              ) : (
                filteredMyDeliveries.map((request) => (
                  <DeliveryCard key={request.id} request={request} actionLabel={text.continueDelivery} actionHref={`/deliveries/${request.id}`} text={text} locale={locale} statusLabel={statusLabel} priorityLabel={priorityLabel} rewardLabel={rewardLabel} categoryLabel={categoryLabel} />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !message && activeTab === "courier" && (
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">{text.courierProfile}</CardTitle>
              <div className="text-sm text-slate-500">{text.courierAvailability}</div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              {courierProfile ? (
                <div className="rounded-2xl border p-5">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    {courierProfile.transport_mode === "bike" ? <Bike className="h-4 w-4" /> : courierProfile.transport_mode === "car" ? <Car className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    <span className="font-medium">{transportLabel(courierProfile.transport_mode)}</span>
                    <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">{courierProfile.is_active ? text.courierActive : text.courierInactive}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{text.displayName}: <span className="font-medium text-slate-900">{courierProfile.display_name?.trim() || userEmail || text.notFilled}</span></p>
                  <p className="mt-2 text-sm text-slate-600">{text.zones}: <span className="font-medium text-slate-900">{courierProfile.coverage_areas?.length ? courierProfile.coverage_areas.join(", ") : text.notFilled}</span></p>
                  <p className="mt-2 text-sm text-slate-600">{text.capacity}: <span className="font-medium text-slate-900">{courierProfile.max_package_size?.trim() || text.notFilled}</span></p>
                  <p className="mt-2 text-sm text-slate-600">{text.availability}: <span className="font-medium text-slate-900">{courierProfile.availability_notes?.trim() || text.notFilled}</span></p>
                  <p className="mt-2 text-sm text-slate-600">{text.rating}: <span className="font-medium text-slate-900">{courierProfile.rating_count > 0 ? `${courierProfile.rating_avg} / 5 (${courierProfile.rating_count})` : text.noRatings}</span></p>
                </div>
              ) : (
                <div className="rounded-2xl border p-5 text-sm text-slate-600">{text.noCourierProfile}</div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl" onClick={() => router.push("/deliveries/create?mode=courier")}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {courierProfile ? text.editProfile : text.activateProfile}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
