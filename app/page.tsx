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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r bg-white/90 backdrop-blur lg:block">
          <div className="flex h-20 items-center gap-3 border-b px-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rețea vie</p>
              <h1 className="text-xl font-semibold">VIVOS</h1>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 rounded-2xl border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Spațiu comunitar</p>
              <p className="mt-1 text-sm font-medium">Ordine vie, schimb și sprijin mutual</p>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
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
          <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Platforma comunitară
                </p>
                <h2 className="truncate text-lg font-semibold sm:text-2xl">
                  {active === "dashboard" ? "VIVOS" : activeLabel}
                </h2>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2 md:flex">
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
                    <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </div>
                  )}

                  {showPublicBadge && (
                    <div className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-semibold text-white">
                      {publicPulseCount > 99 ? "99+" : publicPulseCount}
                    </div>
                  )}
                </div>

                {userEmail ? (
                  <>
                    <div className="hidden max-w-[180px] truncate rounded-2xl border bg-white px-3 py-2 text-sm text-slate-600 sm:block">
                      {userEmail}
                    </div>

                    <div className="relative" ref={profileMenuRef}>
                      <button
                        className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        onClick={() => setProfileMenuOpen((prev) => !prev)}
                      >
                        <Avatar className="h-10 w-10 rounded-2xl">
                          <AvatarFallback className="rounded-2xl bg-slate-900 text-white">
                            {userEmail.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>

                      {profileMenuOpen && (
                        <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border bg-white p-2 shadow-lg">
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

          <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 backdrop-blur lg:hidden">
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
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="leading-none">{item.label}</span>

                    {showItemBadge && (
                      <div className="absolute right-3 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
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
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl">Bine ai venit în VIVOS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-slate-600">
            Spațiul comunitar pentru schimb, sprijin mutual și colaborare directă între membri.
          </p>

          <div className="grid gap-3">
            <Button
              className="h-12 rounded-2xl"
              onClick={() => {
                window.location.href = "/market/new"
              }}
            >
              Publică ofertă
            </Button>

            <Button
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={() => {
                window.location.href = "/profile"
              }}
            >
              Actualizează profil
            </Button>

            <Button
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={() => {
                window.location.href = "/market"
              }}
            >
              Vezi piața reală
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-slate-500">Oferte</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{offersCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-slate-500">Nevoi</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{requestsCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl">Acțiuni rapide</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-12 justify-start rounded-2xl"
            onClick={() => {
              window.location.href = "/messages"
            }}
          >
            Mesajele mele
          </Button>

          <Button
            variant="outline"
            className="h-12 justify-start rounded-2xl"
            onClick={() => {
              window.location.href = "/notifications"
            }}
          >
            Notificări
          </Button>

          <Button
            variant="outline"
            className="h-12 justify-start rounded-2xl"
            onClick={() => {
              window.location.href = "/fund/new"
            }}
          >
            Cere sprijin
          </Button>

          <Button
            variant="outline"
            className="h-12 justify-start rounded-2xl"
            onClick={() => {
              window.location.href = "/wallet"
            }}
          >
            Portofel
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg sm:text-xl">Piața comunitară</CardTitle>
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              window.location.href = "/market"
            }}
          >
            Toată piața
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Oferte active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{offersCount}</p>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Cereri active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{requestsCount}</p>
            </div>
          </div>
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
      <div className="vivos-hero p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Users className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-semibold sm:text-3xl">Membri</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              Descoperă membrii comunității, vezi ce oferă, ce caută și pornește rapid o conversație.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="vivos-card border-0">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg sm:text-xl">Registrul membrilor</CardTitle>

              <div className="text-sm vivos-muted">
                {isLoggedIn ? `${filteredMembers.length} membri` : "acces restricționat"}
              </div>
            </div>
          </CardHeader>

          <div className="px-6 pb-2">
            <div className="grid gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Caută după nume, alias, email, skill..."
                  className="h-11 rounded-2xl border-slate-200 pl-10 focus-visible:ring-2 focus-visible:ring-[#56B6DE]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={memberFilter === "all" ? "default" : "outline"}
                  onClick={() => setMemberFilter("all")}
                >
                  Toți
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "offers" ? "members" : "outline"}
                  onClick={() => setMemberFilter("offers")}
                >
                  Cu oferte
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "needs" ? "messages" : "outline"}
                  onClick={() => setMemberFilter("needs")}
                >
                  Cu nevoi
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "skills" ? "market" : "outline"}
                  onClick={() => setMemberFilter("skills")}
                >
                  Cu skill-uri
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="space-y-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-3xl border border-slate-200 p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 rounded bg-slate-200" />
                        <div className="h-3 w-52 rounded bg-slate-200" />
                        <div className="h-3 w-full rounded bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isLoggedIn ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6">
                <h3 className="text-lg font-semibold">Vezi membrii comunității</h3>
                <p className="mt-2 text-sm vivos-muted">
                  Autentifică-te pentru a vedea membrii activi, profilurile lor și posibilitățile de colaborare.
                </p>

                <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
                  <Button
                    onClick={() => {
                      window.location.href = "/login"
                    }}
                  >
                    Login
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/signup"
                    }}
                  >
                    Creează cont
                  </Button>
                </div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
                <p className="text-base font-medium">Nu am găsit membri</p>
                <p className="mt-2 text-sm vivos-muted">
                  Încearcă alt termen de căutare sau schimbă filtrul selectat.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredMembers.map((member) => {
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
                      className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          window.location.href = `/member/${member.id}`
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12 rounded-2xl border">
                            <AvatarFallback className="rounded-2xl bg-[#56B6DE]/15 text-[#173F74]">
                              {initials || "MB"}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{displayName}</p>
                              <Badge variant="members">{member.role || "member"}</Badge>
                            </div>

                            <p className="truncate text-sm vivos-muted">{member.email}</p>

                            {member.alias?.trim() ? (
                              <p className="mt-1 text-xs vivos-muted">@{member.alias.trim()}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="font-medium text-[#173F74]">Oferă</p>
                            <p className="mt-1 text-slate-600">
                              {member.offers_summary?.trim() || "Necompletat"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="font-medium text-[#173F74]">Caută</p>
                            <p className="mt-1 text-slate-600">
                              {member.needs_summary?.trim() || "Necompletat"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(skillsList.length ? skillsList.slice(0, 4) : ["fără competențe"]).map(
                            (skill, idx) => (
                              <Badge key={idx} variant="members">
                                {skill}
                              </Badge>
                            )
                          )}

                          {skillsList.length > 4 && (
                            <Badge variant="outline">+{skillsList.length - 4}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            window.location.href = `/member/${member.id}`
                          }}
                        >
                          Vezi profil
                        </Button>

                        <Button
                          variant="members"
                          className="flex-1"
                          onClick={() => onStartChat(member.id)}
                        >
                          Trimite mesaj
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="vivos-card border-0">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Panou membri</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-3xl border bg-slate-50 p-5 text-center">
              <p className="text-sm vivos-muted">Număr membri</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {isLoggedIn ? filteredMembers.length : publicMembersCount}
              </p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-4">
              <p className="text-sm font-medium text-[#173F74]">Filtru activ</p>
              <p className="mt-1 text-sm vivos-muted">
                {memberFilter === "all"
                  ? "Toți membrii"
                  : memberFilter === "offers"
                  ? "Doar membri cu oferte"
                  : memberFilter === "needs"
                  ? "Doar membri cu nevoi"
                  : "Doar membri cu skill-uri"}
              </p>
            </div>

            <div className="rounded-3xl border bg-slate-50 p-4">
              <p className="text-sm font-medium text-[#173F74]">Sugestie</p>
              <p className="mt-1 text-sm vivos-muted">
                Intră pe profilul unui membru pentru a vedea mai clar competențele și a porni o conversație directă.
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold sm:text-2xl">Piața comunitară</h3>
          <p className="text-sm text-slate-500 sm:text-base">
            Oferte, cereri, barter și colaborări directe.
          </p>
        </div>

        <div className="grid gap-3 sm:flex sm:flex-row">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              window.location.href = "/market/new"
            }}
          >
            Publică cerere
          </Button>
          <Button
            className="rounded-2xl"
            onClick={() => {
              window.location.href = "/market/new"
            }}
          >
            Publică ofertă
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Toate postările recente</CardTitle>
          <div className="text-sm text-slate-500">{marketPosts.length} postări</div>
        </CardHeader>

        <CardContent className="space-y-3">
          {marketPosts.length === 0 ? (
            <div className="rounded-2xl border p-4 text-sm text-slate-600">
              Nu există încă postări în piață.
            </div>
          ) : (
            marketPosts.map((item) => (
              <div key={item.id} className="rounded-2xl border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-xl">
                    {item.post_type === "offer" ? "Ofertă" : "Cerere"}
                  </Badge>
                  <Badge variant="outline" className="rounded-xl">
                    {item.category || "General"}
                  </Badge>
                  <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                    {item.status === "in_progress"
                      ? "În lucru"
                      : item.status === "closed"
                      ? "Închis"
                      : "Activ"}
                  </Badge>
                </div>

                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {(item.location || "Necompletat")} · {(item.value_text || "Necompletat")}
                </p>

                {item.description && (
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                )}

                <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => onStartChat(item.author_id)}
                  >
                    Contactează autorul
                  </Button>

                  <Button
                    className="rounded-2xl"
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold sm:text-2xl">Fond mutual de sprijin</h3>
          <p className="text-sm text-slate-500 sm:text-base">
            Cereri reale de sprijin, vizibile comunității.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            className="rounded-2xl"
            onClick={() => {
              window.location.href = isLoggedIn ? "/fund/new" : "/login"
            }}
          >
            Cere sprijin
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Cereri recente</CardTitle>
          <div className="text-sm text-slate-500">{fundRequests.length} cereri</div>
        </CardHeader>

        <CardContent className="space-y-3">
          {fundRequests.length === 0 ? (
            <div className="rounded-2xl border p-4 text-sm text-slate-600">
              Nu există încă cereri în fondul mutual de sprijin.
            </div>
          ) : (
            fundRequests.map((item) => {
              const authorName =
                item.author?.name?.trim() ||
                item.author?.alias?.trim() ||
                item.author?.email?.trim() ||
                "Membru comunității"

              return (
                <div key={item.id} className="rounded-2xl border p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-xl">
                      {item.urgency === "ridicata"
                        ? "Urgență ridicată"
                        : item.urgency === "medie"
                        ? "Urgență medie"
                        : "Urgență scăzută"}
                    </Badge>

                    <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                      {item.status === "in_review"
                        ? "În analiză"
                        : item.status === "approved"
                        ? "Aprobat"
                        : item.status === "supported"
                        ? "Sprijinit"
                        : item.status === "closed"
                        ? "Închis"
                        : "Nou"}
                    </Badge>
                  </div>

                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">Cerere de la: {authorName}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  <p className="mt-3 text-sm text-slate-500">
                    {item.amount_talanti
                      ? `${Number(item.amount_talanti).toFixed(2)} talanți`
                      : "Fără sumă specificată"}{" "}
                    · {new Date(item.created_at).toLocaleDateString("ro-RO")}
                  </p>

                  <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => onStartChat(item.author_id)}
                    >
                      Scrie autorului
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-2xl"
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
  }, [active, members, membersLoading, userEmail, marketPosts, fundRequests, publicMembersCount])

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
