"use client"

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  BookOpen,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import PushSubscribeButton from "@/components/push/push-subscribe-button"

const navItems = [
  { id: "dashboard", label: "Acasă", icon: LayoutDashboard },
  { id: "members", label: "Membri", icon: Users },
  { id: "messages", label: "Mesaje", icon: MessageSquare },
  { id: "market", label: "Piață comunitară", icon: ShoppingBag },
  { id: "about", label: "Despre", icon: BookOpen },
  { id: "wallet", label: "Portofel", icon: Wallet },
  { id: "fund", label: "Fond mutual", icon: HeartHandshake },
  { id: "archive", label: "Arhivă", icon: FileText },
  { id: "governance", label: "Guvernanță", icon: Shield },
  { id: "settings", label: "Setări", icon: Settings },
] as const

const mobileNavItems = [
  { id: "dashboard", label: "Acasă", icon: LayoutDashboard },
  { id: "members", label: "Membri", icon: Users },
  { id: "messages", label: "Mesaje", icon: MessageSquare },
  { id: "market", label: "Piață", icon: ShoppingBag },
  { id: "fund", label: "Fond", icon: HeartHandshake },
] as const

const walletEntries = [
  { label: "Schimb confirmat", amount: "+120", meta: "Reparații electrice" },
  { label: "Contribuție fond mutual", amount: "-30", meta: "Contribuție lunară" },
  { label: "Recompensă implicare", amount: "+25", meta: "Moderare comunitară" },
  { label: "Sprijin primit", amount: "+90", meta: "Transport medical" },
]

const archiveItems = [
  { title: "Decizie #14 — criterii fond mutual", type: "Hotărâre", date: "28 mar 2026" },
  { title: "Raport lunar martie 2026", type: "Raport", date: "27 mar 2026" },
  { title: "Actualizare regulament barter", type: "Regulă", date: "25 mar 2026" },
  { title: "Timestamp registru contribuții", type: "Dovadă", date: "24 mar 2026" },
]

type ProfileMember = {
  id: string
  email: string
  name: string | null
  alias: string | null
  role: string | null
  skills: string | null
  offers_summary: string | null
  needs_summary: string | null
  created_at?: string | null
}
type MemberFilter = "all" | "offers" | "needs" | "skills"
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

type FundRequestAuthor = {
  name: string | null
  alias: string | null
  email: string | null
}

type MutualFundRequest = {
  id: string
  author_id: string
  title: string
  description: string
  amount_talanti: number | null
  urgency: "scazuta" | "medie" | "ridicata"
  status: "new" | "in_review" | "approved" | "supported" | "closed"
  created_at: string
  author: FundRequestAuthor | null
}

type ShellProps = {
  active: string
  setActive: (value: string) => void
  children: React.ReactNode
  userEmail: string | null
  unreadCount: number
  publicPulseCount: number
}



function TabSync({ setActive }: { setActive: (value: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get("tab")

    const validTabs = new Set([
      "dashboard",
      "members",
      "messages",
      "market",
      "about",
      "wallet",
      "fund",
      "archive",
      "governance",
      "settings",
    ])

    if (!tab) {
      setActive("dashboard")
      return
    }

    if (validTabs.has(tab)) {
      setActive(tab)
    } else {
      setActive("dashboard")
    }
  }, [searchParams, setActive])

  return null
}

function Shell({
  active,
  setActive,
  children,
  userEmail,
  unreadCount,
  publicPulseCount,
}: ShellProps) {
  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0
  const activeLabel = navItems.find((x) => x.id === active)?.label || "VIVOS"

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
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

  return (
    <div className="vivos-shell">
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white/95 backdrop-blur lg:block">
          <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173F74] text-white shadow-sm">
              <LifeBuoy className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] vivos-muted">Rețea vie</p>
              <h1 className="text-xl font-semibold vivos-title">VIVOS</h1>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs vivos-muted">Spațiu comunitar</p>
              <p className="mt-1 text-sm font-medium vivos-title">
                Ordine vie, schimb și sprijin mutual
              </p>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                      isActive
                        ? "bg-[#173F74] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col pb-24 lg:pb-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] vivos-muted">
                  Platforma comunitară
                </p>
                <h2 className="truncate text-lg font-semibold sm:text-2xl vivos-title">
                  {active === "dashboard" ? "VIVOS" : activeLabel}
                </h2>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
                  <Search className="h-4 w-4 text-slate-500" />
                  <Input
                    className="h-auto w-48 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    placeholder="Caută membri, decizii, schimburi..."
                  />
                </div>

                <div className="relative">
                  <Button
                    variant="outline"
                    className="rounded-2xl px-3 sm:px-4"
                    onClick={() => {
                      window.location.href = "/notifications"
                    }}
                  >
                    <Bell className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Notificări</span>
                  </Button>

                  {showUnreadBadge && (
                    <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#9A6FC0] px-2 text-xs font-semibold text-white shadow-sm">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                  )}

                  {showPublicBadge && (
                    <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#46C2D8] px-2 text-xs font-semibold text-white shadow-sm">
                      {publicPulseCount > 99 ? "99+" : publicPulseCount}
                    </div>
                  )}
                </div>

                {userEmail ? (
                  <>
                    <div className="hidden max-w-[180px] truncate rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm vivos-muted sm:block">
                      {userEmail}
                    </div>

                    <div className="relative" ref={profileMenuRef}>
                      <button
                        className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#56B6DE]"
                        onClick={() => setProfileMenuOpen((prev) => !prev)}
                      >
                        <Avatar className="h-10 w-10 rounded-2xl border border-slate-200">
                          <AvatarFallback className="rounded-2xl bg-[#173F74] text-white">
                            {userEmail.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>

                      {profileMenuOpen && (
                        <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                            onClick={() => {
                              setProfileMenuOpen(false)
                              window.location.href = "/profile"
                            }}
                          >
                            Profil
                          </button>

                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                            onClick={() => {
                              setProfileMenuOpen(false)
                              setActive("settings")
                            }}
                          >
                            Setări
                          </button>

                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                            onClick={() => {
                              setProfileMenuOpen(false)
                              setActive("about")
                            }}
                          >
                            Despre
                          </button>

                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
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
                    className="rounded-2xl"
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

          <ScrollArea className="flex-1">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="p-4 sm:p-6"
            >
              {children}
            </motion.div>
          </ScrollArea>

          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="grid grid-cols-5 gap-1 px-2 py-2">
              {mobileNavItems.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id
                const showItemBadge = item.id === "messages" && showUnreadBadge

                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition ${
                      isActive
                        ? "bg-[#173F74] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="leading-none">{item.label}</span>

                    {showItemBadge && (
                      <div className="absolute right-3 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9A6FC0] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>
        </main>
      </div>
    </div>
  )
}

function DashboardScreen({ marketPosts }: { marketPosts: MarketPost[] }) {
  const offersCount = marketPosts.filter((item) => item.post_type === "offer").length
  const requestsCount = marketPosts.filter((item) => item.post_type === "request").length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="vivos-hero p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <LayoutDashboard className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-semibold sm:text-3xl">Bine ai venit în VIVOS</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              Spațiul comunitar pentru schimb, sprijin mutual și colaborare directă între membri.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Button
            className="h-12 bg-white text-[#173F74] hover:bg-white"
            onClick={() => {
              window.location.href = "/market/new"
            }}
          >
            Publică ofertă
          </Button>

          <Button
            variant="outline"
            className="h-12 border-white/30 bg-white/10 text-white hover:bg-white/15"
            onClick={() => {
              window.location.href = "/profile"
            }}
          >
            Actualizează profil
          </Button>

          <Button
            variant="outline"
            className="h-12 border-white/30 bg-white/10 text-white hover:bg-white/15"
            onClick={() => {
              window.location.href = "/market"
            }}
          >
            Vezi piața reală
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="vivos-card border-0">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm vivos-muted">Oferte</p>
            <p className="mt-2 text-3xl font-semibold text-[#173F74]">{offersCount}</p>
          </CardContent>
        </Card>

        <Card className="vivos-card border-0">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm vivos-muted">Nevoi</p>
            <p className="mt-2 text-3xl font-semibold text-[#173F74]">{requestsCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="vivos-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl">Acțiuni rapide</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-12 justify-start"
            onClick={() => {
              window.location.href = "/messages"
            }}
          >
            Mesajele mele
          </Button>

          <Button
            variant="outline"
            className="h-12 justify-start"
            onClick={() => {
              window.location.href = "/notifications"
            }}
          >
            Notificări
          </Button>

          <Button
            variant="fund"
            className="h-12 justify-start"
            onClick={() => {
              window.location.href = "/fund/new"
            }}
          >
            Cere sprijin
          </Button>

          <Button
            variant="outline"
            className="h-12 justify-start"
            onClick={() => {
              window.location.href = "/wallet"
            }}
          >
            Portofel
          </Button>
        </CardContent>
      </Card>

    
    </div>
  )
}

function MembersScreen({
  members,
  loading,
  isLoggedIn,
  onStartChat,
  publicMembersCount,
  memberSearch,
  setMemberSearch,
  memberFilter,
  setMemberFilter,
}: {
  members: ProfileMember[]
  loading: boolean
  isLoggedIn: boolean
  onStartChat: (memberId: string) => void
  publicMembersCount: number
  memberSearch: string
  setMemberSearch: (value: string) => void
  memberFilter: MemberFilter
  setMemberFilter: (value: MemberFilter) => void
}) {
  const normalizedSearch = memberSearch.trim().toLowerCase()

  const filteredMembers = members.filter((member) => {
    const haystack = [
      member.name || "",
      member.alias || "",
      member.email || "",
      member.role || "",
      member.skills || "",
      member.offers_summary || "",
      member.needs_summary || "",
    ]
      .join(" ")
      .toLowerCase()

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)

    const hasOffers = !!member.offers_summary?.trim()
    const hasNeeds = !!member.needs_summary?.trim()
    const hasSkills = !!member.skills?.trim()

    const matchesFilter =
      memberFilter === "all" ||
      (memberFilter === "offers" && hasOffers) ||
      (memberFilter === "needs" && hasNeeds) ||
      (memberFilter === "skills" && hasSkills)

    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg sm:text-xl">Registrul membrilor</CardTitle>
            <div className="text-sm text-slate-500">
              {isLoggedIn ? `${filteredMembers.length} membri` : "acces restricționat"}
            </div>
          </CardHeader>

          <div className="px-6 pb-2">
            <div className="grid gap-3">
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Caută după nume, email, alias, skill..."
                className="rounded-2xl"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={memberFilter === "all" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("all")}
                >
                  Toți
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "offers" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("offers")}
                >
                  Cu oferte
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "needs" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("needs")}
                >
                  Cu nevoi
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "skills" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("skills")}
                >
                  Cu skill-uri
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Se încarcă membrii...
              </div>
            ) : !isLoggedIn ? (
              <div className="rounded-2xl border p-5 sm:p-6">
                <h3 className="text-lg font-semibold">Vezi membrii comunității</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Autentifică-te pentru a vedea membrii activi, profilurile lor și posibilitățile de colaborare.
                </p>
                <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
                  <Button
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.href = "/login"
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.href = "/signup"
                    }}
                  >
                    Creează cont
                  </Button>
                </div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Nu există membri care să corespundă căutării sau filtrului selectat.
              </div>
            ) : (
              filteredMembers.map((member) => {
                const displayName =
                  member.name?.trim() ||
                  member.alias?.trim() ||
                  member.email?.split("@")[0] ||
                  "Membru"

                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

                const skillsList = member.skills
                  ? member.skills.split(",").map((s) => s.trim()).filter(Boolean)
                  : []

                return (
                  <div
                    key={member.id}
                    className="cursor-pointer rounded-2xl border p-4 transition hover:bg-slate-50"
                    onClick={() => {
                      window.location.href = `/member/${member.id}`
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-3">
                        <Avatar className="h-12 w-12 rounded-2xl">
                          <AvatarFallback className="rounded-2xl bg-slate-900 text-white">
                            {initials || "MB"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="font-medium">{displayName}</p>
                          <p className="truncate text-sm text-slate-500">{member.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(skillsList.length ? skillsList : ["fără competențe completate"]).map(
                              (skill, idx) => (
                                <Badge key={idx} variant="outline" className="rounded-xl">
                                  {skill}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <p>
                          Rol:{" "}
                          <span className="font-medium text-slate-900">
                            {member.role || "member"}
                          </span>
                        </p>
                        <p>
                          Oferă:{" "}
                          <span className="font-medium text-slate-900">
                            {member.offers_summary?.trim() || "necompletat"}
                          </span>
                        </p>
                        <p>
                          Caută:{" "}
                          <span className="font-medium text-slate-900">
                            {member.needs_summary?.trim() || "necompletat"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/member/${member.id}`
                        }}
                      >
                        Vezi profil
                      </Button>

                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartChat(member.id)
                        }}
                      >
                        Trimite mesaj
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Membri înregistrați</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border p-5 text-center">
              <p className="text-sm text-slate-500">Număr membri</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                {isLoggedIn ? filteredMembers.length : publicMembersCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MarketScreen({
  marketPosts,
  onStartChat,
}: {
  marketPosts: MarketPost[]
  onStartChat: (memberId: string) => void
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#173F74] via-[#204E8C] to-[#F39A3D] p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ShoppingBag className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-semibold sm:text-3xl">Piața comunitară</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              Oferte, cereri, barter și colaborări directe între membrii comunității.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:flex sm:flex-row">
          <Button
            variant="outline"
            className="h-12 border-white/30 bg-white/10 text-white hover:bg-white/15"
            onClick={() => {
              window.location.href = "/market/new"
            }}
          >
            Publică cerere
          </Button>

          <Button
            variant="market"
            className="h-12"
            onClick={() => {
              window.location.href = "/market/new"
            }}
          >
            Publică ofertă
          </Button>
        </div>
      </div>

      <Card className="vivos-card border-0">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Toate postările recente</CardTitle>
          <div className="text-sm vivos-muted">{marketPosts.length} postări</div>
        </CardHeader>

        <CardContent className="space-y-4">
          {marketPosts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-base font-medium">Nu există încă postări în piață</p>
              <p className="mt-2 text-sm vivos-muted">
                Publică prima ofertă sau prima cerere și pornește schimbul în comunitate.
              </p>
            </div>
          ) : (
            marketPosts.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="market">
                    {item.post_type === "offer" ? "Ofertă" : "Cerere"}
                  </Badge>

                  <Badge variant="outline">
                    {item.category || "General"}
                  </Badge>

                  <Badge
                    variant={
                      item.status === "closed"
                        ? "soft"
                        : item.status === "in_progress"
                        ? "messages"
                        : "market"
                    }
                  >
                    {item.status === "in_progress"
                      ? "În lucru"
                      : item.status === "closed"
                      ? "Închis"
                      : "Activ"}
                  </Badge>
                </div>

                <p className="text-base font-semibold vivos-title">{item.title}</p>

                <p className="mt-1 text-sm vivos-muted">
                  {(item.location || "Necompletat")} · {(item.value_text || "Necompletat")}
                </p>

                {item.description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onStartChat(item.author_id)}
                  >
                    Contactează autorul
                  </Button>

                  <Button
                    variant="market"
                    className="flex-1"
                    onClick={() => {
                      window.location.href = "/market"
                    }}
                  >
                    Vezi detalii
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AboutScreen() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Despre VIVOS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            VIVOS este o platformă comunitară pentru schimb, sprijin mutual și recunoașterea valorii reale dintre membri.
            Aici păstrăm și documentele de bază ale comunității.
          </p>

          <div className="grid gap-3 sm:flex sm:flex-row">
            <Button
              className="rounded-2xl"
              onClick={() => {
                window.location.href = "/despre-talant-vivos.html"
              }}
            >
              Deschide pagina Talantului
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                window.location.href = "/wallet"
              }}
            >
              Vezi wallet-ul în talanți
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Talantul VIVOS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            În VIVOS, talantul este unitatea internă de valoare a comunității. Formula de bază este:
          </p>

          <div className="rounded-2xl border bg-slate-50 p-4 text-center text-lg font-semibold">
            1 talant = aproximativ 15 minute de contribuție standard
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Contribuție standard</p>
              <p className="mt-2 text-xl font-semibold">4 talanți / oră</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Contribuție tehnică</p>
              <p className="mt-2 text-xl font-semibold">8 talanți / oră</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Contribuție specializată</p>
              <p className="mt-2 text-xl font-semibold">12+ talanți / oră</p>
            </div>
          </div>

          <div className="rounded-2xl border p-4 text-sm text-slate-600">
            Talantul VIVOS are o pagină dedicată, unde sunt explicate clar principiile, formula de bază și rolul său în comunitate.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function WalletScreen() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Portofel intern</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {walletEntries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-sm text-slate-500">{entry.meta}</p>
                </div>
                <p className="text-lg font-semibold">{entry.amount}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FundScreen({
  fundRequests,
  isLoggedIn,
  onStartChat,
}: {
  fundRequests: MutualFundRequest[]
  isLoggedIn: boolean
  onStartChat: (memberId: string) => void
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#173F74] via-[#204E8C] to-[#F6BC3E] p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <HeartHandshake className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-semibold sm:text-3xl">Fond mutual de sprijin</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              Cereri reale de sprijin, vizibile comunității și deschise contribuției directe.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button
            variant="fund"
            className="h-12"
            onClick={() => {
              window.location.href = isLoggedIn ? "/fund/new" : "/login"
            }}
          >
            Cere sprijin
          </Button>
        </div>
      </div>

      <Card className="vivos-card border-0">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Cereri recente</CardTitle>
          <div className="text-sm vivos-muted">{fundRequests.length} cereri</div>
        </CardHeader>

        <CardContent className="space-y-4">
          {fundRequests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-base font-medium">Nu există încă cereri în fondul mutual</p>
              <p className="mt-2 text-sm vivos-muted">
                Când apare o nevoie reală, comunitatea o poate vedea și sprijini direct.
              </p>
            </div>
          ) : (
            fundRequests.map((item) => {
              const authorName =
                item.author?.name?.trim() ||
                item.author?.alias?.trim() ||
                item.author?.email?.trim() ||
                "Membru comunității"

              const urgencyLabel =
                item.urgency === "ridicata"
                  ? "Urgență ridicată"
                  : item.urgency === "medie"
                  ? "Urgență medie"
                  : "Urgență scăzută"

              const statusLabel =
                item.status === "in_review"
                  ? "În analiză"
                  : item.status === "approved"
                  ? "Aprobat"
                  : item.status === "supported"
                  ? "Sprijinit"
                  : item.status === "closed"
                  ? "Închis"
                  : "Nou"

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        item.urgency === "ridicata"
                          ? "fund"
                          : item.urgency === "medie"
                          ? "market"
                          : "outline"
                      }
                    >
                      {urgencyLabel}
                    </Badge>

                    <Badge
                      variant={
                        item.status === "supported"
                          ? "fund"
                          : item.status === "approved"
                          ? "members"
                          : item.status === "in_review"
                          ? "messages"
                          : item.status === "closed"
                          ? "soft"
                          : "outline"
                      }
                    >
                      {statusLabel}
                    </Badge>
                  </div>

                  <p className="text-base font-semibold vivos-title">{item.title}</p>
                  <p className="mt-1 text-sm vivos-muted">Cerere de la: {authorName}</p>

                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide vivos-muted">Sumă</p>
                      <p className="mt-1 text-sm font-medium text-[#173F74]">
                        {item.amount_talanti
                          ? `${Number(item.amount_talanti).toFixed(2)} talanți`
                          : "Fără sumă specificată"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide vivos-muted">Data</p>
                      <p className="mt-1 text-sm font-medium text-[#173F74]">
                        {new Date(item.created_at).toLocaleDateString("ro-RO")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => onStartChat(item.author_id)}
                    >
                      Scrie autorului
                    </Button>

                    <Button
                      variant="fund"
                      className="flex-1"
                      onClick={() => {
                        if (!isLoggedIn) {
                          window.location.href = "/login"
                          return
                        }

                        const params = new URLSearchParams({
                          supportRequestId: item.id,
                          supportReceiverId: item.author_id,
                          supportAmount: item.amount_talanti ? String(item.amount_talanti) : "",
                          supportTitle: item.title,
                          supportAuthor: authorName,
                        })

                        window.location.href = `/wallet?${params.toString()}`
                      }}
                    >
                      Oferă sprijin
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ArchiveScreen() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Arhivă și memorie comunitară</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {archiveItems.map((item, i) => (
            <div key={i} className="rounded-2xl border p-4">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-slate-500">
                {item.type} · {item.date}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function GovernanceScreen() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Guvernanță vie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Modul de guvernanță rămâne demo în această versiune.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsScreen() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Setări</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Activează notificările push pentru a fi anunțat când primești mesaje noi.
          </p>

          <PushSubscribeButton />
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  const [active, setActive] = useState("dashboard")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [members, setMembers] = useState<ProfileMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [publicMembersCount, setPublicMembersCount] = useState(0)
  const [marketPosts, setMarketPosts] = useState<MarketPost[]>([])
  const [fundRequests, setFundRequests] = useState<MutualFundRequest[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [memberSearch, setMemberSearch] = useState("")
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all")

  async function handleStartChat(otherMemberId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      window.location.href = "/login"
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
      .eq("user_id", session.user.id)

    window.location.href = `/messages/${data}`
  }

  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setUserEmail(session?.user?.email ?? null)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function loadMembers() {
      setMembersLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setMembers([])
        setMembersLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, alias, role, skills, offers_summary, needs_summary, created_at")
        .order("created_at", { ascending: false })

      if (!error && data) {
        setMembers(data as ProfileMember[])
      } else {
        setMembers([])
      }

      setMembersLoading(false)
    }

    loadMembers()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadMembers()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function loadPublicMembersCount() {
      const { data, error } = await supabase.rpc("get_public_profiles_count")

      if (!error && typeof data === "number") {
        setPublicMembersCount(data)
      } else {
        setPublicMembersCount(0)
      }
    }

    loadPublicMembersCount()

    const channel = supabase
      .channel("profiles-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          loadPublicMembersCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    async function loadMarketPosts() {
      const { data, error } = await supabase
        .from("market_posts")
        .select(
          "id, author_id, post_type, title, category, description, value_text, location, status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20)

      if (!error && data) {
        setMarketPosts(data as MarketPost[])
      } else {
        setMarketPosts([])
      }
    }

    loadMarketPosts()

    const channel = supabase
      .channel("market-posts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "market_posts",
        },
        () => {
          loadMarketPosts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    async function loadFundRequests() {
      const { data, error } = await supabase
        .from("mutual_fund_requests")
        .select(
          "id, author_id, title, description, amount_talanti, urgency, status, created_at, author:profiles!mutual_fund_requests_author_id_fkey(name, alias, email)"
        )
        .order("created_at", { ascending: false })
        .limit(20)

      if (!error && data) {
        setFundRequests(data as unknown as MutualFundRequest[])
      } else {
        setFundRequests([])
      }
    }

    loadFundRequests()

    const channel = supabase
      .channel("fund-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mutual_fund_requests",
        },
        () => {
          loadFundRequests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    async function loadUnreadCount() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setUnreadCount(0)
        return
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false)

      if (!error) {
        setUnreadCount(count || 0)
      }
    }

    loadUnreadCount()

    const channel = supabase
      .channel("notifications-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUnreadCount()
    })

    return () => {
      supabase.removeChannel(channel)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function loadPublicPulse() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { count, error } = await supabase
        .from("public_activity_feed")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since)

      if (!error) {
        setPublicPulseCount(count || 0)
      }
    }

    loadPublicPulse()

    const channel = supabase
      .channel("public-pulse")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "public_activity_feed",
        },
        () => {
          loadPublicPulse()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const screen = useMemo(() => {
    switch (active) {
      case "members":
        return (
          <MembersScreen
            members={members}
            loading={membersLoading}
            isLoggedIn={!!userEmail}
            onStartChat={handleStartChat}
            publicMembersCount={publicMembersCount}
            memberSearch={memberSearch}
            setMemberSearch={setMemberSearch}
            memberFilter={memberFilter}
            setMemberFilter={setMemberFilter}
          />
        )

      case "messages":
        window.location.href = "/messages"
        return <DashboardScreen marketPosts={marketPosts} />

      case "market":
        return <MarketScreen marketPosts={marketPosts} onStartChat={handleStartChat} />

      case "about":
        return <AboutScreen />

      case "wallet":
        window.location.href = "/wallet"
        return <DashboardScreen marketPosts={marketPosts} />

      case "fund":
        return (
          <FundScreen
            fundRequests={fundRequests}
            isLoggedIn={!!userEmail}
            onStartChat={handleStartChat}
          />
        )

      case "archive":
        return <ArchiveScreen />

      case "governance":
        return <GovernanceScreen />

      case "settings":
        return <SettingsScreen />

      default:
        return <DashboardScreen marketPosts={marketPosts} />
    }
  }, [
    active,
    members,
    membersLoading,
    userEmail,
    marketPosts,
    fundRequests,
    publicMembersCount,
    memberSearch,
    memberFilter,
  ])

  return (
    <>
      <Suspense fallback={null}>
        <TabSync setActive={setActive} />
      </Suspense>

      <Shell
        active={active}
        setActive={setActive}
        userEmail={userEmail}
        unreadCount={unreadCount}
        publicPulseCount={publicPulseCount}
      >
        {screen}
      </Shell>
    </>
  )
}
