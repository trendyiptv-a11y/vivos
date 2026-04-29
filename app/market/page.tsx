"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"
import { useI18n } from "@/lib/i18n/provider"

type AppLang = "ro" | "da" | "en"

const marketTexts: Record<AppLang, Record<string, string>> = {
  ro: {
    platform: "Platforma comunitară",
    title: "Piață",
    profile: "Profil",
    myOrders: "Comenzile mele",
    manifest: "Manifest VIVOS",
    settings: "Setări",
    about: "Despre",
    logout: "Logout",
    login: "Login",
    heroTitle: "Piața comunitară",
    heroSubtitle: "Oferte, cereri, barter și colaborări directe între membrii comunității.",
    publish: "Publică",
    openDeliveries: "Deschide livrări",
    myOrdersBtn: "Comenzile mele",
    postsList: "Listă postări",
    postsCount: "postări",
    searchPlaceholder: "Caută postări sau produse din piață",
    loading: "Se încarcă postările...",
    noResults: "Nu există rezultate",
    noResultsDesc: "Nu am găsit postări sau produse pentru căutarea curentă.",
    offer: "Ofertă",
    request: "Cerere",
    statusActive: "Activ",
    statusInProgress: "În lucru",
    statusClosed: "Închis",
    merchant: "Comerciant",
    deliveryAvailable: "Livrare disponibilă",
    products: "produse",
    noDescription: "Fără descriere",
    commercialAuthor: "Autor comercial",
    activeMerchantProfile: "Profil comerciant activ",
    merchantCategory: "Categorie merchant",
    linkedProducts: "Produse afișate în anunț",
    location: "Locație",
    notFilled: "Necompletat",
    value: "Valoare",
    createdAt: "Creat la",
    viewProfile: "Vezi profil",
    contactMerchant: "Contactează comerciantul",
    contactAuthor: "Contactează autorul",
    opening: "Se deschide...",
    order: "Comandă",
    linkProducts: "Leagă produse",
    updating: "Se actualizează...",
    reactivate: "Reactivează",
    close: "Închide",
    removing: "Se scoate...",
    removePost: "Scoate postarea",
    requestDelivery: "Solicită livrare",
    talanti: "talanți",
    stock: "Stoc",
    unlimited: "nelimitat",
    category: "Categorie",
    general: "General",
    categoryLocalShop: "Magazin local",
    categoryArtisan: "Artizan",
    categoryFood: "Food",
    categoryAutoParts: "Piese auto",
    categoryServices: "Servicii",
    categoryOther: "Altceva",
    confirmDelete: "Sigur vrei să scoți postarea \"{title}\" din Piață?",
    confirmClose: "Sigur vrei să închizi postarea \"{title}\"?",
    confirmReactivate: "Sigur vrei să reactivezi postarea \"{title}\"?",
    chatError: "Nu am putut porni conversația.",
    postRemoved: "Postarea a fost scoasă din Piață.",
    postClosed: "Postarea a fost închisă și scoasă din piață.",
    postReactivated: "Postarea a fost reactivată.",
    postClosedFallback: "Postarea avea deja referințe active și a fost scoasă din lista publică prin închidere.",
  },
  da: {
    platform: "Fællesskabsplatform",
    title: "Marked",
    profile: "Profil",
    myOrders: "Mine ordrer",
    manifest: "VIVOS-manifest",
    settings: "Indstillinger",
    about: "Om",
    logout: "Log ud",
    login: "Log ind",
    heroTitle: "Fællesskabsmarked",
    heroSubtitle: "Tilbud, anmodninger, byttehandel og direkte samarbejde mellem fællesskabets medlemmer.",
    publish: "Publicer",
    openDeliveries: "Åbn leveringer",
    myOrdersBtn: "Mine ordrer",
    postsList: "Liste over opslag",
    postsCount: "opslag",
    searchPlaceholder: "Søg opslag eller produkter på markedet",
    loading: "Indlæser opslag...",
    noResults: "Ingen resultater",
    noResultsDesc: "Vi fandt ingen opslag eller produkter for den aktuelle søgning.",
    offer: "Tilbud",
    request: "Anmodning",
    statusActive: "Aktiv",
    statusInProgress: "I gang",
    statusClosed: "Lukket",
    merchant: "Handlende",
    deliveryAvailable: "Levering tilgængelig",
    products: "produkter",
    noDescription: "Ingen beskrivelse",
    commercialAuthor: "Kommerciel forfatter",
    activeMerchantProfile: "Aktivt handelsprofil",
    merchantCategory: "Handelskategori",
    linkedProducts: "Produkter vist i opslaget",
    location: "Placering",
    notFilled: "Ikke udfyldt",
    value: "Værdi",
    createdAt: "Oprettet",
    viewProfile: "Se profil",
    contactMerchant: "Kontakt handlende",
    contactAuthor: "Kontakt forfatter",
    opening: "Åbner...",
    order: "Bestil",
    linkProducts: "Tilknyt produkter",
    updating: "Opdaterer...",
    reactivate: "Genaktiver",
    close: "Luk",
    removing: "Fjerner...",
    removePost: "Fjern opslag",
    requestDelivery: "Anmod om levering",
    talanti: "talanti",
    stock: "Lager",
    unlimited: "ubegrænset",
    category: "Kategori",
    general: "Generelt",
    categoryLocalShop: "Lokal butik",
    categoryArtisan: "Håndværker",
    categoryFood: "Mad",
    categoryAutoParts: "Bildele",
    categoryServices: "Tjenester",
    categoryOther: "Andet",
    confirmDelete: "Er du sikker på, at du vil fjerne opslaget \"{title}\" fra markedet?",
    confirmClose: "Er du sikker på, at du vil lukke opslaget \"{title}\"?",
    confirmReactivate: "Er du sikker på, at du vil genaktivere opslaget \"{title}\"?",
    chatError: "Kunne ikke starte samtalen.",
    postRemoved: "Opslaget er fjernet fra markedet.",
    postClosed: "Opslaget er lukket og fjernet fra markedet.",
    postReactivated: "Opslaget er genaktiveret.",
    postClosedFallback: "Opslaget havde allerede aktive referencer og er fjernet fra den offentlige liste ved lukning.",
  },
  en: {
    platform: "Community platform",
    title: "Market",
    profile: "Profile",
    myOrders: "My orders",
    manifest: "VIVOS Manifest",
    settings: "Settings",
    about: "About",
    logout: "Logout",
    login: "Login",
    heroTitle: "Community marketplace",
    heroSubtitle: "Offers, requests, barter and direct collaboration between community members.",
    publish: "Publish",
    openDeliveries: "Open deliveries",
    myOrdersBtn: "My orders",
    postsList: "Posts list",
    postsCount: "posts",
    searchPlaceholder: "Search posts or products in the market",
    loading: "Loading posts...",
    noResults: "No results",
    noResultsDesc: "No posts or products found for the current search.",
    offer: "Offer",
    request: "Request",
    statusActive: "Active",
    statusInProgress: "In progress",
    statusClosed: "Closed",
    merchant: "Merchant",
    deliveryAvailable: "Delivery available",
    products: "products",
    noDescription: "No description",
    commercialAuthor: "Commercial author",
    activeMerchantProfile: "Active merchant profile",
    merchantCategory: "Merchant category",
    linkedProducts: "Products shown in post",
    location: "Location",
    notFilled: "Not filled",
    value: "Value",
    createdAt: "Created at",
    viewProfile: "View profile",
    contactMerchant: "Contact merchant",
    contactAuthor: "Contact author",
    opening: "Opening...",
    order: "Order",
    linkProducts: "Link products",
    updating: "Updating...",
    reactivate: "Reactivate",
    close: "Close",
    removing: "Removing...",
    removePost: "Remove post",
    requestDelivery: "Request delivery",
    talanti: "talanti",
    stock: "Stock",
    unlimited: "unlimited",
    category: "Category",
    general: "General",
    categoryLocalShop: "Local shop",
    categoryArtisan: "Artisan",
    categoryFood: "Food",
    categoryAutoParts: "Auto parts",
    categoryServices: "Services",
    categoryOther: "Other",
    confirmDelete: "Are you sure you want to remove the post \"{title}\" from the market?",
    confirmClose: "Are you sure you want to close the post \"{title}\"?",
    confirmReactivate: "Are you sure you want to reactivate the post \"{title}\"?",
    chatError: "Could not start the conversation.",
    postRemoved: "The post has been removed from the market.",
    postClosed: "The post has been closed and removed from the market.",
    postReactivated: "The post has been reactivated.",
    postClosedFallback: "The post already had active references and was removed from the public list by closing.",
  },
}

function localeFromLanguage(language: string) {
  if (language === "da") return "da-DK"
  if (language === "en") return "en-US"
  return "ro-RO"
}

type MarketPost = {
  id: string
  author_id: string
  post_type: "offer" | "request"
  title: string
  category: string | null
  description: string | null
  value_text: string | null
  location: string | null
  status: "active" | "in_progress" | "closed"
  created_at: string
}

type MerchantProfile = {
  user_id: string
  display_name: string | null
  business_name: string | null
  merchant_category: "local_shop" | "artisan" | "food" | "auto_parts" | "services" | "other"
  delivery_available: boolean
  pickup_available: boolean
  is_active: boolean
}

type LinkedCatalogItem = {
  id: string
  title: string
  description: string | null
  category: string | null
  image_url: string | null
  price_talanti: number
  stock_quantity: number | null
  unit_label: string | null
  is_active: boolean
}

function isReferenceConstraintError(message: string | undefined) {
  const t = (message || "").toLowerCase()
  return t.includes("foreign key") || t.includes("violates foreign key") || t.includes("is still referenced") || t.includes("constraint")
}

export default function MarketPage() {
  const router = useRouter()
  const { language } = useI18n()
  const lang = (language === "da" || language === "en" ? language : "ro") as AppLang
  const text = marketTexts[lang]
  const locale = localeFromLanguage(lang)

  const statusLabel = (status: MarketPost["status"]) => {
    if (status === "in_progress") return text.statusInProgress
    if (status === "closed") return text.statusClosed
    return text.statusActive
  }

  const typeLabel = (type: MarketPost["post_type"]) =>
    type === "offer" ? text.offer : text.request

  const merchantCategoryLabel = (category: MerchantProfile["merchant_category"]) => {
    if (category === "local_shop") return text.categoryLocalShop
    if (category === "artisan") return text.categoryArtisan
    if (category === "food") return text.categoryFood
    if (category === "auto_parts") return text.categoryAutoParts
    if (category === "services") return text.categoryServices
    return text.categoryOther
  }

  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<MarketPost[]>([])
  const [message, setMessage] = useState("")
  const [busyAuthorId, setBusyAuthorId] = useState<string | null>(null)
  const [busyDeletePostId, setBusyDeletePostId] = useState<string | null>(null)
  const [busyStatusPostId, setBusyStatusPostId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [merchantProfiles, setMerchantProfiles] = useState<Record<string, MerchantProfile>>({})
  const [linkedItemsByPost, setLinkedItemsByPost] = useState<Record<string, LinkedCatalogItem[]>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => { document.removeEventListener("mousedown", handleClickOutside) }
  }, [])

  useEffect(() => {
    async function loadTopBarState() {
      const { data: { session } } = await supabase.auth.getSession()
      setUserEmail(session?.user?.email ?? null)
      setCurrentUserId(session?.user?.id ?? null)

      if (!session?.user) {
        setUnreadCount(0)
        setPublicPulseCount(0)
        return
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [{ count: unread, error: unreadError }, { count: pulse, error: pulseError }] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", session.user.id).eq("is_read", false),
        supabase.from("public_activity_feed").select("*", { count: "exact", head: true }).gte("created_at", since),
      ])
      if (!unreadError) setUnreadCount(unread || 0)
      if (!pulseError) setPublicPulseCount(pulse || 0)
    }

    loadTopBarState()

    const notificationsChannel = supabase.channel("market-topbar-notifications").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { loadTopBarState() }).subscribe()
    const pulseChannel = supabase.channel("market-topbar-pulse").on("postgres_changes", { event: "INSERT", schema: "public", table: "public_activity_feed" }, () => { loadTopBarState() }).subscribe()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { loadTopBarState() })

    return () => {
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(pulseChannel)
      subscription.unsubscribe()
    }
  }, [])

  async function handleStartChat(otherMemberId: string) {
    try {
      setBusyAuthorId(otherMemberId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push("/login"); return }

      const currentUserId = session.user.id
      if (currentUserId === otherMemberId) { router.push("/messages"); return }

      const { data, error } = await supabase.rpc("find_or_create_direct_conversation", { other_member_id: otherMemberId })
      if (error || !data) { alert(text.chatError); return }

      await supabase.from("conversation_hidden_for_users").delete().eq("conversation_id", data).eq("user_id", currentUserId)
      router.push(`/messages/${data}`)
    } catch (error) {
      console.error("Start chat error:", error)
      alert(text.chatError)
    } finally {
      setBusyAuthorId(null)
    }
  }

  async function handleDeletePost(post: MarketPost) {
    const confirmed = window.confirm(text.confirmDelete.replace("{title}", post.title))
    if (!confirmed) return

    try {
      setBusyDeletePostId(post.id)
      setMessage("")

      const { error: linkDeleteError } = await supabase.from("market_post_item_links").delete().eq("market_post_id", post.id)
      if (linkDeleteError) { setMessage(linkDeleteError.message); return }

      const { error: deleteError } = await supabase.from("market_posts").delete().eq("id", post.id).eq("author_id", post.author_id)
      if (!deleteError) {
        setPosts((prev) => prev.filter((item) => item.id !== post.id))
        setLinkedItemsByPost((prev) => { const next = { ...prev }; delete next[post.id]; return next })
        setMessage(text.postRemoved)
        return
      }

      if (isReferenceConstraintError(deleteError.message)) {
        const { error: closeError } = await supabase.from("market_posts").update({ status: "closed" }).eq("id", post.id).eq("author_id", post.author_id)
        if (closeError) { setMessage(closeError.message); return }

        setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, status: "closed" } : item)))
        setLinkedItemsByPost((prev) => { const next = { ...prev }; delete next[post.id]; return next })
        setMessage(text.postClosedFallback)
        return
      }

      setMessage(deleteError.message)
    } catch (error: any) {
      console.error("Delete market post error:", error)
      setMessage(error?.message || text.postRemoved)
    } finally {
      setBusyDeletePostId(null)
    }
  }

  async function handleTogglePostStatus(post: MarketPost, nextStatus: MarketPost["status"]) {
    const confirmMsg = nextStatus === "closed"
      ? text.confirmClose.replace("{title}", post.title)
      : text.confirmReactivate.replace("{title}", post.title)
    const confirmed = window.confirm(confirmMsg)
    if (!confirmed) return

    try {
      setBusyStatusPostId(post.id)
      setMessage("")

      const { error } = await supabase.from("market_posts").update({ status: nextStatus }).eq("id", post.id).eq("author_id", post.author_id)
      if (error) { setMessage(error.message); setBusyStatusPostId(null); return }

      setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, status: nextStatus } : item)))
      setMessage(nextStatus === "closed" ? text.postClosed : text.postReactivated)
    } catch (error: any) {
      console.error("Toggle market post status error:", error)
      setMessage(error?.message || "")
    } finally {
      setBusyStatusPostId(null)
    }
  }

  useEffect(() => {
    async function loadPosts() {
      setLoading(true)
      setMessage("")

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push("/login"); return }

      setCurrentUserId(session.user.id)

      const { data, error } = await supabase.from("market_posts").select("id, author_id, post_type, title, category, description, value_text, location, status, created_at").neq("status", "closed").order("created_at", { ascending: false })
      if (error) { setMessage(error.message); setPosts([]); setLoading(false); return }

      const loadedPosts = (data ?? []) as MarketPost[]
      setPosts(loadedPosts)

      const authorIds = Array.from(new Set(loadedPosts.map((post) => post.author_id).filter(Boolean)))
      const postIds = loadedPosts.map((post) => post.id)

      if (authorIds.length) {
        const { data: merchantData, error: merchantError } = await supabase.from("merchant_profiles").select("user_id, display_name, business_name, merchant_category, delivery_available, pickup_available, is_active").in("user_id", authorIds).eq("is_active", true)
        if (merchantError) {
          setMessage((prev) => prev || merchantError.message)
        } else {
          const merchantMap = ((merchantData ?? []) as MerchantProfile[]).reduce<Record<string, MerchantProfile>>((acc, item) => { acc[item.user_id] = item; return acc }, {})
          setMerchantProfiles(merchantMap)
        }
      } else {
        setMerchantProfiles({})
      }

      if (postIds.length) {
        const { data: linksData, error: linksError } = await supabase.from("market_post_item_links").select("market_post_id, merchant_catalog_items(id, title, description, category, image_url, price_talanti, stock_quantity, unit_label, is_active)").in("market_post_id", postIds)
        if (linksError) {
          setMessage((prev) => prev || linksError.message)
          setLinkedItemsByPost({})
        } else {
          const grouped = ((linksData ?? []) as any[]).reduce<Record<string, LinkedCatalogItem[]>>((acc, row) => {
            const item = row.merchant_catalog_items as LinkedCatalogItem | null
            if (!item) return acc
            if (!acc[row.market_post_id]) acc[row.market_post_id] = []
            acc[row.market_post_id].push(item)
            return acc
          }, {})
          setLinkedItemsByPost(grouped)
        }
      } else {
        setLinkedItemsByPost({})
      }

      setLoading(false)
    }

    loadPosts()
  }, [router])

  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return posts

    return posts.filter((post) => {
      const linkedItems = linkedItemsByPost[post.id] || []
      const merchantProfile = merchantProfiles[post.author_id]
      const linkedText = linkedItems.map((item) => [item.title, item.description || "", item.category || "", item.unit_label || "", item.image_url || ""].join(" ")).join(" ")
      const merchantText = merchantProfile ? [merchantProfile.display_name || "", merchantProfile.business_name || "", merchantCategoryLabel(merchantProfile.merchant_category)].join(" ") : ""

      return [post.title, post.description || "", post.category || "", post.value_text || "", post.location || "", linkedText, merchantText].join(" ").toLowerCase().includes(query)
    })
  }, [linkedItemsByPost, merchantProfiles, posts, searchTerm])

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
              <button type="button" className="flex h-12 w-12 items-center justify-center rounded-2xl border transition" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.10)", color: vivosTheme.colors.white }} onClick={() => { window.location.href = "/notifications" }}><Bell className="h-5 w-5" /></button>
              {showUnreadBadge && <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white" style={{ background: vivosTheme.colors.purple, boxShadow: vivosTheme.shadows.soft }}>{unreadCount > 99 ? "99+" : unreadCount}</div>}
              {showPublicBadge && <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white" style={{ background: vivosTheme.colors.teal, boxShadow: vivosTheme.shadows.soft }}>{publicPulseCount > 99 ? "99+" : publicPulseCount}</div>}
            </div>

            {userEmail ? (
              <>
                <div className="hidden max-w-[180px] truncate rounded-2xl border px-3 py-2 text-sm sm:block" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)" }}>{userEmail}</div>
                <div className="relative" ref={profileMenuRef}>
                  <button className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30" onClick={() => setProfileMenuOpen((prev) => !prev)}><Avatar className="h-10 w-10 rounded-2xl border border-white/15 shadow-sm"><AvatarFallback className="rounded-2xl text-white" style={{ background: getVivosAvatarGradient(userEmail) }}>{userEmail.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar></button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border p-2 shadow-lg" style={{ background: "rgba(18,46,84,0.98)", borderColor: "rgba(255,255,255,0.10)", boxShadow: vivosTheme.shadows.modal }}>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/profile" }}>{text.profile}</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/orders" }}>{text.myOrders}</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/downloads/manifest.html" }}>{text.manifest}</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/?tab=settings" }}>{text.settings}</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/?tab=about" }}>{text.about}</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10" onClick={async () => { setProfileMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/" }}>{text.logout}</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button className="rounded-2xl border-0" style={{ background: vivosTheme.gradients.activeIcon, color: vivosTheme.colors.white, boxShadow: vivosTheme.shadows.bubble }} onClick={() => { window.location.href = "/login" }}>{text.login}</Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#173F74] via-[#204E8C] to-[#F39A3D] p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><span className="text-xl font-semibold">P</span></div><div className="min-w-0"><h2 className="text-2xl font-semibold sm:text-3xl">{text.heroTitle}</h2><p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">{text.heroSubtitle}</p></div></div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="rounded-2xl bg-white text-[#173F74] hover:bg-white" onClick={() => router.push("/market/new")}>{text.publish}</Button>
            <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/deliveries")}>{text.openDeliveries}</Button>
            <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/orders")}>{text.myOrdersBtn}</Button>
          </div>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">{text.postsList}</CardTitle>
              <div className="text-sm text-slate-500">{filteredPosts.length} / {posts.length} {text.postsCount}</div>
            </div>
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="rounded-2xl" placeholder={text.searchPlaceholder} />
          </CardHeader>
          <CardContent className="space-y-4 pb-24">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{text.loading}</div>
            ) : message ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-2xl border p-6"><h3 className="text-lg font-semibold">{text.noResults}</h3><p className="mt-2 text-sm text-slate-600">{text.noResultsDesc}</p></div>
            ) : (
              filteredPosts.map((post) => {
                const merchantProfile = merchantProfiles[post.author_id] || null
                const merchantName = merchantProfile?.display_name?.trim() || merchantProfile?.business_name?.trim() || null
                const linkedItems = linkedItemsByPost[post.id] || []
                const canOrder = !!merchantProfile && post.post_type === "offer" && post.status === "active"
                const isOwner = currentUserId === post.author_id
                const ownerActionBusy = busyStatusPostId === post.id

                return (
                  <div key={post.id} className="rounded-2xl border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-xl">{typeLabel(post.post_type)}</Badge>
                      <Badge variant="outline" className="rounded-xl">{post.category || text.general}</Badge>
                      <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">{statusLabel(post.status)}</Badge>
                      {merchantProfile ? <Badge className="rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-100">{text.merchant}</Badge> : null}
                      {merchantProfile?.delivery_available ? <Badge className="rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-100">{text.deliveryAvailable}</Badge> : null}
                      {linkedItems.length ? <Badge className="rounded-xl bg-indigo-100 text-indigo-900 hover:bg-indigo-100">{linkedItems.length} {text.products}</Badge> : null}
                    </div>
                    <p className="text-lg font-semibold">{post.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{post.description?.trim() || text.noDescription}</p>

                    {merchantProfile ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p>{text.commercialAuthor}: <span className="font-medium text-slate-900">{merchantName || text.activeMerchantProfile}</span></p>
                        <p className="mt-1">{text.merchantCategory}: <span className="font-medium text-slate-900">{merchantCategoryLabel(merchantProfile.merchant_category)}</span></p>
                      </div>
                    ) : null}

                    {linkedItems.length ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-medium text-slate-900">{text.linkedProducts}</p>
                        <div className="mt-3 space-y-2">
                          {linkedItems.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              {item.image_url ? <img src={item.image_url} alt={item.title} className="mb-3 h-32 w-full rounded-2xl border bg-white object-contain p-2" /> : null}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-slate-900">{item.title}</p>
                                <Badge variant="outline" className="rounded-xl">{Number(item.price_talanti).toFixed(2)} {text.talanti} / {item.unit_label || "buc"}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{item.description?.trim() || text.noDescription}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>{text.category}: {item.category || text.general}</span>
                                <span>•</span>
                                <span>{text.stock}: {item.stock_quantity ?? text.unlimited}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                      <p>{text.location}: {post.location?.trim() || text.notFilled}</p>
                      <p>{text.value}: {post.value_text?.trim() || text.notFilled}</p>
                      <p>{text.createdAt}: {new Date(post.created_at).toLocaleString(locale)}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/member/${post.author_id}`)}>{text.viewProfile}</Button>
                      <Button className="rounded-2xl" onClick={() => handleStartChat(post.author_id)} disabled={busyAuthorId === post.author_id}>{busyAuthorId === post.author_id ? text.opening : merchantProfile ? text.contactMerchant : text.contactAuthor}</Button>
                      {canOrder ? <Button className="rounded-2xl" onClick={() => router.push(`/market/order?market_post_id=${post.id}&merchant_user_id=${post.author_id}&title=${encodeURIComponent(post.title)}&value_text=${encodeURIComponent(post.value_text || "")}&delivery_available=${merchantProfile?.delivery_available ? "true" : "false"}`)}>{text.order}</Button> : null}
                      {isOwner && merchantProfile && post.post_type === "offer" ? <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/market/link-products?market_post_id=${post.id}`)}>{text.linkProducts}</Button> : null}
                      {isOwner ? <Button variant="outline" className="rounded-2xl" disabled={ownerActionBusy} onClick={() => handleTogglePostStatus(post, post.status === "closed" ? "active" : "closed")}>{ownerActionBusy ? text.updating : post.status === "closed" ? text.reactivate : text.close}</Button> : null}
                      {isOwner ? <Button variant="outline" className="rounded-2xl border-red-200 text-red-700 hover:bg-red-50" disabled={busyDeletePostId === post.id} onClick={() => handleDeletePost(post)}>{busyDeletePostId === post.id ? text.removing : text.removePost}</Button> : null}
                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/deliveries/create?market_post_id=${post.id}&title=${encodeURIComponent(post.title)}`)}>{text.requestDelivery}</Button>
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
