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
  price_talanti: number
  stock_quantity: number | null
  unit_label: string | null
  is_active: boolean
}

function statusLabel(status: MarketPost["status"]) {
  if (status === "in_progress") return "În lucru"
  if (status === "closed") return "Închis"
  return "Activ"
}

function typeLabel(type: MarketPost["post_type"]) {
  return type === "offer" ? "Ofertă" : "Cerere"
}

function merchantCategoryLabel(category: MerchantProfile["merchant_category"]) {
  if (category === "local_shop") return "Magazin local"
  if (category === "artisan") return "Artizan"
  if (category === "food") return "Food"
  if (category === "auto_parts") return "Piese auto"
  if (category === "services") return "Servicii"
  return "Altceva"
}

function isReferenceConstraintError(message: string | undefined) {
  const text = (message || "").toLowerCase()
  return text.includes("foreign key") || text.includes("violates foreign key") || text.includes("is still referenced") || text.includes("constraint")
}

export default function MarketPage() {
  const router = useRouter()
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    async function loadTopBarState() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

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

    const notificationsChannel = supabase
      .channel("market-topbar-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        loadTopBarState()
      })
      .subscribe()

    const pulseChannel = supabase
      .channel("market-topbar-pulse")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "public_activity_feed" }, () => {
        loadTopBarState()
      })
      .subscribe()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadTopBarState()
    })

    return () => {
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(pulseChannel)
      subscription.unsubscribe()
    }
  }, [])

  async function handleStartChat(otherMemberId: string) {
    try {
      setBusyAuthorId(otherMemberId)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const currentUserId = session.user.id

      if (currentUserId === otherMemberId) {
        router.push("/messages")
        return
      }

      const { data, error } = await supabase.rpc("find_or_create_direct_conversation", {
        other_member_id: otherMemberId,
      })

      if (error || !data) {
        alert("Nu am putut porni conversația.")
        return
      }

      await supabase.from("conversation_hidden_for_users").delete().eq("conversation_id", data).eq("user_id", currentUserId)
      router.push(`/messages/${data}`)
    } catch (error) {
      console.error("Start chat error:", error)
      alert("Nu am putut porni conversația.")
    } finally {
      setBusyAuthorId(null)
    }
  }

  async function handleDeletePost(post: MarketPost) {
    const confirmed = window.confirm(`Sigur vrei să scoți postarea „${post.title}” din Piață?`)
    if (!confirmed) return

    try {
      setBusyDeletePostId(post.id)
      setMessage("")

      const { error: linkDeleteError } = await supabase
        .from("market_post_item_links")
        .delete()
        .eq("market_post_id", post.id)

      if (linkDeleteError) {
        setMessage(linkDeleteError.message)
        return
      }

      const { error: deleteError } = await supabase
        .from("market_posts")
        .delete()
        .eq("id", post.id)
        .eq("author_id", post.author_id)

      if (!deleteError) {
        setPosts((prev) => prev.filter((item) => item.id !== post.id))
        setLinkedItemsByPost((prev) => {
          const next = { ...prev }
          delete next[post.id]
          return next
        })
        setMessage("Postarea a fost scoasă din Piață.")
        return
      }

      if (isReferenceConstraintError(deleteError.message)) {
        const { error: closeError } = await supabase
          .from("market_posts")
          .update({ status: "closed" })
          .eq("id", post.id)
          .eq("author_id", post.author_id)

        if (closeError) {
          setMessage(closeError.message)
          return
        }

        setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, status: "closed" } : item)))
        setLinkedItemsByPost((prev) => {
          const next = { ...prev }
          delete next[post.id]
          return next
        })
        setMessage("Postarea avea deja referințe active și a fost scoasă din lista publică prin închidere.")
        return
      }

      setMessage(deleteError.message)
    } catch (error: any) {
      console.error("Delete market post error:", error)
      setMessage(error?.message || "Postarea nu a putut fi ștearsă.")
    } finally {
      setBusyDeletePostId(null)
    }
  }

  async function handleTogglePostStatus(post: MarketPost, nextStatus: MarketPost["status"]) {
    const actionText = nextStatus === "closed" ? "închizi" : "reactivezi"
    const confirmed = window.confirm(`Sigur vrei să ${actionText} postarea „${post.title}”?`)
    if (!confirmed) return

    try {
      setBusyStatusPostId(post.id)
      setMessage("")

      const { error } = await supabase.from("market_posts").update({ status: nextStatus }).eq("id", post.id).eq("author_id", post.author_id)

      if (error) {
        setMessage(error.message)
        setBusyStatusPostId(null)
        return
      }

      setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, status: nextStatus } : item)))
      setMessage(nextStatus === "closed" ? "Postarea a fost închisă și scoasă din piață." : "Postarea a fost reactivată.")
    } catch (error: any) {
      console.error("Toggle market post status error:", error)
      setMessage(error?.message || "Statusul postării nu a putut fi schimbat.")
    } finally {
      setBusyStatusPostId(null)
    }
  }

  useEffect(() => {
    async function loadPosts() {
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
        .from("market_posts")
        .select("id, author_id, post_type, title, category, description, value_text, location, status, created_at")
        .neq("status", "closed")
        .order("created_at", { ascending: false })

      if (error) {
        setMessage(error.message)
        setPosts([])
        setLoading(false)
        return
      }

      const loadedPosts = (data ?? []) as MarketPost[]
      setPosts(loadedPosts)

      const authorIds = Array.from(new Set(loadedPosts.map((post) => post.author_id).filter(Boolean)))
      const postIds = loadedPosts.map((post) => post.id)

      if (authorIds.length) {
        const { data: merchantData, error: merchantError } = await supabase
          .from("merchant_profiles")
          .select("user_id, display_name, business_name, merchant_category, delivery_available, pickup_available, is_active")
          .in("user_id", authorIds)
          .eq("is_active", true)

        if (merchantError) {
          setMessage((prev) => prev || merchantError.message)
        } else {
          const merchantMap = ((merchantData ?? []) as MerchantProfile[]).reduce<Record<string, MerchantProfile>>((acc, item) => {
            acc[item.user_id] = item
            return acc
          }, {})
          setMerchantProfiles(merchantMap)
        }
      } else {
        setMerchantProfiles({})
      }

      if (postIds.length) {
        const { data: linksData, error: linksError } = await supabase
          .from("market_post_item_links")
          .select("market_post_id, merchant_catalog_items(id, title, description, category, price_talanti, stock_quantity, unit_label, is_active)")
          .in("market_post_id", postIds)

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
      const linkedText = linkedItems
        .map((item) => [item.title, item.description || "", item.category || "", item.unit_label || ""].join(" "))
        .join(" ")
      const merchantText = merchantProfile
        ? [merchantProfile.display_name || "", merchantProfile.business_name || "", merchantCategoryLabel(merchantProfile.merchant_category)].join(" ")
        : ""

      return [
        post.title,
        post.description || "",
        post.category || "",
        post.value_text || "",
        post.location || "",
        linkedText,
        merchantText,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [linkedItemsByPost, merchantProfiles, posts, searchTerm])

  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header className="sticky top-0 z-10 border-b backdrop-blur-xl" style={{ background: vivosTheme.styles.bottomNav.background, borderColor: vivosTheme.styles.bottomNav.borderColor, boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)" }}>
        <div className="flex min-h-[84px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>Platforma comunitară</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>Piață</h1>
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
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/profile" }}>Profil</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/orders" }}>Comenzile mele</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/downloads/manifest.html" }}>Manifest VIVOS</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/?tab=settings" }}>Setări</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10" onClick={() => { setProfileMenuOpen(false); window.location.href = "/?tab=about" }}>Despre</button>
                      <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10" onClick={async () => { setProfileMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/" }}>Logout</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button className="rounded-2xl border-0" style={{ background: vivosTheme.gradients.activeIcon, color: vivosTheme.colors.white, boxShadow: vivosTheme.shadows.bubble }} onClick={() => { window.location.href = "/login" }}>Login</Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#173F74] via-[#204E8C] to-[#F39A3D] p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <span className="text-xl font-semibold">P</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold sm:text-3xl">Piața comunitară</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">Oferte, cereri, barter și colaborări directe între membrii comunității.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="rounded-2xl bg-white text-[#173F74] hover:bg-white" onClick={() => router.push("/market/new")}>Publică</Button>
            <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/deliveries")}>Deschide livrări</Button>
            <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/orders")}>Comenzile mele</Button>
          </div>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Listă postări</CardTitle>
              <div className="text-sm text-slate-500">{filteredPosts.length} / {posts.length} postări</div>
            </div>
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="rounded-2xl" placeholder="Caută postări sau produse din piață" />
          </CardHeader>

          <CardContent className="space-y-4 pb-24">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă postările...</div>
            ) : message ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-2xl border p-6">
                <h3 className="text-lg font-semibold">Nu există rezultate</h3>
                <p className="mt-2 text-sm text-slate-600">Nu am găsit postări sau produse pentru căutarea curentă.</p>
              </div>
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
                      <Badge variant="outline" className="rounded-xl">{post.category || "General"}</Badge>
                      <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">{statusLabel(post.status)}</Badge>
                      {merchantProfile ? <Badge className="rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-100">Comerciant</Badge> : null}
                      {merchantProfile?.delivery_available ? <Badge className="rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Livrare disponibilă</Badge> : null}
                      {linkedItems.length ? <Badge className="rounded-xl bg-indigo-100 text-indigo-900 hover:bg-indigo-100">{linkedItems.length} produse</Badge> : null}
                    </div>

                    <p className="text-lg font-semibold">{post.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{post.description?.trim() || "Fără descriere"}</p>

                    {merchantProfile ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p>Autor comercial: <span className="font-medium text-slate-900">{merchantName || "Profil comerciant activ"}</span></p>
                        <p className="mt-1">Categorie merchant: <span className="font-medium text-slate-900">{merchantCategoryLabel(merchantProfile.merchant_category)}</span></p>
                      </div>
                    ) : null}

                    {linkedItems.length ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-medium text-slate-900">Produse afișate în anunț</p>
                        <div className="mt-3 space-y-2">
                          {linkedItems.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-slate-900">{item.title}</p>
                                <Badge variant="outline" className="rounded-xl">{Number(item.price_talanti).toFixed(2)} talanți / {item.unit_label || "buc"}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{item.description?.trim() || "Fără descriere"}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>Categorie: {item.category || "General"}</span>
                                <span>•</span>
                                <span>Stoc: {item.stock_quantity ?? "nelimitat"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                      <p>Locație: {post.location?.trim() || "Necompletat"}</p>
                      <p>Valoare: {post.value_text?.trim() || "Necompletat"}</p>
                      <p>Creat la: {new Date(post.created_at).toLocaleString("ro-RO")}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/member/${post.author_id}`)}>Vezi profil</Button>

                      <Button className="rounded-2xl" onClick={() => handleStartChat(post.author_id)} disabled={busyAuthorId === post.author_id}>
                        {busyAuthorId === post.author_id ? "Se deschide..." : merchantProfile ? "Contactează comerciantul" : "Contactează autorul"}
                      </Button>

                      {canOrder ? (
                        <Button className="rounded-2xl" onClick={() => router.push(`/market/order?market_post_id=${post.id}&merchant_user_id=${post.author_id}&title=${encodeURIComponent(post.title)}&value_text=${encodeURIComponent(post.value_text || "")}&delivery_available=${merchantProfile?.delivery_available ? "true" : "false"}`)}>
                          Comandă
                        </Button>
                      ) : null}

                      {isOwner && merchantProfile && post.post_type === "offer" ? (
                        <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/market/link-products?market_post_id=${post.id}`)}>
                          Leagă produse
                        </Button>
                      ) : null}

                      {isOwner ? (
                        <Button variant="outline" className="rounded-2xl" disabled={ownerActionBusy} onClick={() => handleTogglePostStatus(post, post.status === "closed" ? "active" : "closed")}>
                          {ownerActionBusy ? "Se actualizează..." : post.status === "closed" ? "Reactivează" : "Închide"}
                        </Button>
                      ) : null}

                      {isOwner ? (
                        <Button variant="outline" className="rounded-2xl border-red-200 text-red-700 hover:bg-red-50" disabled={busyDeletePostId === post.id} onClick={() => handleDeletePost(post)}>
                          {busyDeletePostId === post.id ? "Se scoate..." : "Scoate postarea"}
                        </Button>
                      ) : null}

                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/deliveries/create?market_post_id=${post.id}&title=${encodeURIComponent(post.title)}`)}>
                        Solicită livrare
                      </Button>
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
