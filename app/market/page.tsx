"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
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

export default function MarketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<MarketPost[]>([])
  const [message, setMessage] = useState("")
  const [busyAuthorId, setBusyAuthorId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [merchantProfiles, setMerchantProfiles] = useState<Record<string, MerchantProfile>>({})
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

      if (!session?.user) {
        setUnreadCount(0)
        setPublicPulseCount(0)
        return
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [{ count: unread, error: unreadError }, { count: pulse, error: pulseError }] =
        await Promise.all([
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

      await supabase
        .from("conversation_hidden_for_users")
        .delete()
        .eq("conversation_id", data)
        .eq("user_id", currentUserId)

      router.push(`/messages/${data}`)
    } catch (error) {
      console.error("Start chat error:", error)
      alert("Nu am putut porni conversația.")
    } finally {
      setBusyAuthorId(null)
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

      const { data, error } = await supabase
        .from("market_posts")
        .select(
          "id, author_id, post_type, title, category, description, value_text, location, status, created_at"
        )
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
      if (!authorIds.length) {
        setMerchantProfiles({})
        setLoading(false)
        return
      }

      const { data: merchantData, error: merchantError } = await supabase
        .from("merchant_profiles")
        .select("user_id, display_name, business_name, merchant_category, delivery_available, pickup_available, is_active")
        .in("user_id", authorIds)
        .eq("is_active", true)

      if (merchantError) {
        setMessage((prev) => prev || merchantError.message)
        setMerchantProfiles({})
        setLoading(false)
        return
      }

      const merchantMap = ((merchantData ?? []) as MerchantProfile[]).reduce<Record<string, MerchantProfile>>((acc, item) => {
        acc[item.user_id] = item
        return acc
      }, {})

      setMerchantProfiles(merchantMap)
      setLoading(false)
    }

    loadPosts()
  }, [router])

  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0

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
        <div className="flex min-h-[84px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase tracking-[0.22em] sm:text-xs"
              style={{ color: "rgba(255,255,255,0.68)" }}
            >
              Platforma comunitară
            </p>
            <h1
              className="truncate text-lg font-semibold sm:text-2xl"
              style={{ color: vivosTheme.colors.white }}
            >
              Piață
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
                onClick={() => {
                  window.location.href = "/notifications"
                }}
              >
                <Bell className="h-5 w-5" />
              </button>

              {showUnreadBadge && (
                <div
                  className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
                  style={{
                    background: vivosTheme.colors.purple,
                    boxShadow: vivosTheme.shadows.soft,
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}

              {showPublicBadge && (
                <div
                  className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
                  style={{
                    background: vivosTheme.colors.teal,
                    boxShadow: vivosTheme.shadows.soft,
                  }}
                >
                  {publicPulseCount > 99 ? "99+" : publicPulseCount}
                </div>
              )}
            </div>

            {userEmail ? (
              <>
                <div
                  className="hidden max-w-[180px] truncate rounded-2xl border px-3 py-2 text-sm sm:block"
                  style={{
                    borderColor: "rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  {userEmail}
                </div>

                <div className="relative" ref={profileMenuRef}>
                  <button
                    className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                  >
                    <Avatar className="h-10 w-10 rounded-2xl border border-white/15 shadow-sm">
                      <AvatarFallback
                        className="rounded-2xl text-white"
                        style={{
                          background: getVivosAvatarGradient(userEmail),
                        }}
                      >
                        {userEmail.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>

                  {profileMenuOpen && (
                    <div
                      className="absolute right-0 top-12 z-50 w-48 rounded-2xl border p-2 shadow-lg"
                      style={{
                        background: "rgba(18,46,84,0.98)",
                        borderColor: "rgba(255,255,255,0.10)",
                        boxShadow: vivosTheme.shadows.modal,
                      }}
                    >
                      <button
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          window.location.href = "/profile"
                        }}
                      >
                        Profil
                      </button>

                      <button
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          window.location.href = "/downloads/manifest.html"
                        }}
                      >
                        Manifest VIVOS
                      </button>

                      <button
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          window.location.href = "/?tab=settings"
                        }}
                      >
                        Setări
                      </button>

                      <button
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          window.location.href = "/?tab=about"
                        }}
                      >
                        Despre
                      </button>

                      <button
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10"
                        onClick={async () => {
                          setProfileMenuOpen(false)
                          await supabase.auth.signOut()
                          window.location.href = "/"
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button
                className="rounded-2xl border-0"
                style={{
                  background: vivosTheme.gradients.activeIcon,
                  color: vivosTheme.colors.white,
                  boxShadow: vivosTheme.shadows.bubble,
                }}
                onClick={() => {
                  window.location.href = "/login"
                }}
              >
                Login
              </Button>
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
              <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
                Oferte, cereri, barter și colaborări directe între membrii comunității.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              className="rounded-2xl bg-white text-[#173F74] hover:bg-white"
              onClick={() => router.push("/market/new")}
            >
              Publică
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/15"
              onClick={() => router.push("/deliveries")}
            >
              Deschide livrări
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">Listă postări</CardTitle>
            <div className="text-sm text-slate-500">{posts.length} postări</div>
          </CardHeader>

          <CardContent className="space-y-4 pb-24">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Se încarcă postările...
              </div>
            ) : message ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border p-6">
                <h3 className="text-lg font-semibold">Încă nu există postări</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Fii primul care publică o ofertă sau o cerere în comunitate.
                </p>
                <div className="mt-4">
                  <Button className="rounded-2xl" onClick={() => router.push("/market/new")}>
                    Creează prima postare
                  </Button>
                </div>
              </div>
            ) : (
              posts.map((post) => {
                const merchantProfile = merchantProfiles[post.author_id] || null
                const merchantName = merchantProfile?.display_name?.trim() || merchantProfile?.business_name?.trim() || null
                const canOrder = !!merchantProfile && post.post_type === "offer"

                return (
                  <div key={post.id} className="rounded-2xl border p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-xl">
                        {typeLabel(post.post_type)}
                      </Badge>
                      <Badge variant="outline" className="rounded-xl">
                        {post.category || "General"}
                      </Badge>
                      <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                        {statusLabel(post.status)}
                      </Badge>
                      {merchantProfile ? (
                        <Badge className="rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-100">
                          Comerciant
                        </Badge>
                      ) : null}
                      {merchantProfile?.delivery_available ? (
                        <Badge className="rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                          Livrare disponibilă
                        </Badge>
                      ) : null}
                    </div>

                    <p className="text-lg font-semibold">{post.title}</p>

                    <p className="mt-2 text-sm text-slate-600">
                      {post.description?.trim() || "Fără descriere"}
                    </p>

                    {merchantProfile ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p>
                          Autor comercial:{" "}
                          <span className="font-medium text-slate-900">{merchantName || "Profil comerciant activ"}</span>
                        </p>
                        <p className="mt-1">
                          Categorie merchant:{" "}
                          <span className="font-medium text-slate-900">{merchantCategoryLabel(merchantProfile.merchant_category)}</span>
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                      <p>Locație: {post.location?.trim() || "Necompletat"}</p>
                      <p>Valoare: {post.value_text?.trim() || "Necompletat"}</p>
                      <p>Creat la: {new Date(post.created_at).toLocaleString("ro-RO")}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => router.push(`/member/${post.author_id}`)}
                      >
                        Vezi profil
                      </Button>

                      <Button
                        className="rounded-2xl"
                        onClick={() => handleStartChat(post.author_id)}
                        disabled={busyAuthorId === post.author_id}
                      >
                        {busyAuthorId === post.author_id ? "Se deschide..." : merchantProfile ? "Contactează comerciantul" : "Contactează autorul"}
                      </Button>

                      {canOrder ? (
                        <Button
                          className="rounded-2xl"
                          onClick={() =>
                            router.push(
                              `/market/order?market_post_id=${post.id}&merchant_user_id=${post.author_id}&title=${encodeURIComponent(post.title)}&value_text=${encodeURIComponent(post.value_text || "")}&delivery_available=${merchantProfile?.delivery_available ? "true" : "false"}`
                            )
                          }
                        >
                          Comandă
                        </Button>
                      ) : null}

                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() =>
                          router.push(`/deliveries/create?market_post_id=${post.id}&title=${encodeURIComponent(post.title)}`)
                        }
                      >
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
