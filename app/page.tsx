"use client"

import VivosInstallPanel from "@/components/VivosInstallPanel"
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
  MessageSquare,
  Search,
  LayoutDashboard,
  Settings,
  Shield,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import PushSubscribeButton from "@/components/push/push-subscribe-button"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"
import { homeArchiveItems, homeNavItems, homeWalletEntries } from "@/components/home/home-config"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { useI18n } from "@/lib/i18n/provider"

const navItems = homeNavItems
const walletEntries = homeWalletEntries
const archiveItems = homeArchiveItems

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
type MemberFilter = "all" | "offers" | "needs" | "skills" | "merchant" | "courier"

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

type MemberRoleRow = {
  user_id: string
  role: "member" | "merchant" | "courier"
  is_active: boolean
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
  const { t } = useI18n()
  const showUnreadBadge = !!userEmail && unreadCount > 0
  const activeItem = navItems.find((x) => x.id === active)
  const activeLabel = activeItem ? t(activeItem.labelKey) : "VIVOS"

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
        <aside
          className="hidden border-r backdrop-blur lg:block"
          style={{
            background: "rgba(255,255,255,0.88)",
            borderColor: vivosTheme.colors.borderSoft,
          }}
        >
          <div
            className="flex h-20 items-center gap-3 border-b px-6"
            style={{ borderColor: vivosTheme.colors.borderSoft }}
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
              <img src="/icons/icon-192.png" alt="VIVOS" className="h-11 w-11 object-cover" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "#7A8598" }}>
                Rețea vie
              </p>
              <h1 className="text-xl font-semibold" style={{ color: "#173F72" }}>
                VIVOS
              </h1>
            </div>
          </div>

          <div className="p-4">
            <div
              className="mb-4 rounded-3xl border p-4"
              style={{
                background: "linear-gradient(135deg, rgba(23,63,114,0.06), rgba(99,166,230,0.08))",
                borderColor: vivosTheme.colors.borderSoft,
              }}
            >
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "#7A8598" }}>
                {t("homePage.communitySpace")}
              </p>
              <p className="mt-1 text-sm font-medium" style={{ color: "#173F72" }}>
                {t("homePage.communitySpaceSubtitle")}
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
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition"
                    style={
                      isActive
                        ? {
                            background: vivosTheme.gradients.activeIcon,
                            color: vivosTheme.colors.white,
                            boxShadow: vivosTheme.shadows.bubble,
                          }
                        : {
                            color: "#556277",
                          }
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(item.labelKey)}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col pb-12 lg:pb-0">
          <header
            className="sticky top-0 z-10 border-b backdrop-blur-xl"
            style={{
              background: vivosTheme.gradients.navBackground,
              borderColor: "rgba(255,255,255,0.08)",
              boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)",
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p
                  className="hidden text-xs uppercase tracking-[0.22em] sm:block"
                  style={{ color: "rgba(255,255,255,0.68)" }}
                >
                  {t("homePage.platform")}
                </p>
                <h2
                  className="truncate text-base font-semibold sm:text-2xl"
                  style={{ color: vivosTheme.colors.white }}
                >
                  {active === "dashboard" ? "VIVOS" : activeLabel}
                </h2>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <LanguageSwitcher />

                <div
                  className="hidden items-center gap-2 rounded-2xl border px-3 py-2 md:flex"
                  style={{
                    borderColor: "rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Search className="h-4 w-4" style={{ color: "rgba(255,255,255,0.68)" }} />
                  <Input
                    className="h-auto w-48 border-0 bg-transparent p-0 text-white placeholder:text-white/45 shadow-none focus-visible:ring-0"
                    placeholder={t("homePage.searchPlaceholder")}
                  />
                </div>

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
                </div>

                {userEmail ? (
                  <>
                    <div
                      className="hidden max-w-[200px] truncate rounded-2xl border px-3 py-2 text-sm sm:block"
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
                        style={{ outline: "none" }}
                        onClick={() => setProfileMenuOpen((prev) => !prev)}
                      >
                        <Avatar className="h-12 w-12 rounded-2xl border border-white/15 shadow-sm">
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
                          className="absolute right-0 top-14 z-50 w-52 rounded-2xl border p-2 shadow-lg"
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
                            {t("homePage.profile")}
                          </button>

                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                            onClick={() => {
                              setProfileMenuOpen(false)
                              window.location.href = "/downloads/manifest.html"
                            }}
                          >
                            {t("homePage.manifest")}
                          </button>

                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                            onClick={() => {
                              setProfileMenuOpen(false)
                              setActive("settings")
                            }}
                          >
                            {t("nav.settings")}
                          </button>

                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                            onClick={() => {
                              setProfileMenuOpen(false)
                              setActive("about")
                            }}
                          >
                            {t("homePage.about")}
                          </button>

                          <button
                            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-white/10"
                            onClick={async () => {
                              setProfileMenuOpen(false)
                              await supabase.auth.signOut()
                              window.location.href = "/"
                            }}
                          >
                            {t("common.logout")}
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
                    {t("common.login")}
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
        </main>
      </div>
    </div>
  )
}

function DashboardScreen({ marketPosts }: { marketPosts: MarketPost[] }) {
  const { t } = useI18n()
  const offersCount = marketPosts.filter((item) => item.post_type === "offer").length
  const requestsCount = marketPosts.filter((item) => item.post_type === "request").length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="vivos-hero p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl overflow-hidden">
            <img src="/icons/icon-192.png" alt="VIVOS" className="h-12 w-12 object-cover" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-semibold sm:text-3xl">{t("homePage.publicWelcome")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              {t("homePage.publicWelcomeText")}
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
            {t("homePage.publishPost")}
          </Button>

          <Button
            variant="outline"
            className="h-12 border-white/30 bg-white/10 text-white hover:bg-white/15"
            onClick={() => {
              window.location.href = "/profile"
            }}
          >
            {t("homePage.updateProfile")}
          </Button>

          <Button
            variant="outline"
            className="h-12 border-white/30 bg-white/10 text-white hover:bg-white/15"
            onClick={() => {
              window.location.href = "/market"
            }}
          >
            {t("homePage.viewRealMarket")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="vivos-card border-0">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm vivos-muted">{t("homePage.offers")}</p>
            <p className="mt-2 text-3xl font-semibold text-[#173F74]">{offersCount}</p>
          </CardContent>
        </Card>

        <Card className="vivos-card border-0">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm vivos-muted">{t("homePage.needs")}</p>
            <p className="mt-2 text-3xl font-semibold text-[#173F74]">{requestsCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="vivos-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl">{t("homePage.quickActions")}</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-12 justify-start"
            onClick={() => {
              window.location.href = "/messages"
            }}
          >
            {t("homePage.myMessages")}
          </Button>

          <Button
            variant="outline"
            className="h-12 justify-start"
            onClick={() => {
              window.location.href = "/notifications"
            }}
          >
            {t("homePage.notifications")}
          </Button>

          <Button
            variant="outline"
            className="h-12 justify-start"
            onClick={() => {
              window.location.href = "/?tab=fund"
            }}
          >
            {t("homePage.fund")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MembersScreen({
  members,
  memberRolesMap,
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
  memberRolesMap: Record<string, string[]>
  loading: boolean
  isLoggedIn: boolean
  onStartChat: (memberId: string) => void
  publicMembersCount: number
  memberSearch: string
  setMemberSearch: (value: string) => void
  memberFilter: MemberFilter
  setMemberFilter: (value: MemberFilter) => void
}) {
  const { t } = useI18n()
  const normalizedSearch = memberSearch.trim().toLowerCase()

  const filteredMembers = members.filter((member) => {
    const roles = memberRolesMap[member.id] || [member.role || "member"]

    const haystack = [
      member.name || "",
      member.alias || "",
      member.email || "",
      member.role || "",
      roles.join(" "),
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
    const isMerchant = roles.includes("merchant")
    const isCourier = roles.includes("courier")

    const matchesFilter =
      memberFilter === "all" ||
      (memberFilter === "offers" && hasOffers) ||
      (memberFilter === "needs" && hasNeeds) ||
      (memberFilter === "skills" && hasSkills) ||
      (memberFilter === "merchant" && isMerchant) ||
      (memberFilter === "courier" && isCourier)

    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg sm:text-xl">{t("membersPage.registry")}</CardTitle>
            <div className="text-sm text-slate-500">
              {isLoggedIn ? `${filteredMembers.length} ${t("membersPage.count")}` : t("homePage.restrictedAccess")}
            </div>
          </CardHeader>

          <div className="px-6 pb-2">
            <div className="grid gap-3">
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={t("membersPage.searchPlaceholder")}
                className="rounded-2xl"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={memberFilter === "all" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("all")}
                >
                  {t("common.all")}
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "merchant" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("merchant")}
                >
                  {t("membersPage.merchants")}
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "courier" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("courier")}
                >
                  {t("membersPage.couriers")}
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "offers" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("offers")}
                >
                  {t("membersPage.withOffers")}
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "needs" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("needs")}
                >
                  {t("membersPage.withNeeds")}
                </Button>

                <Button
                  type="button"
                  variant={memberFilter === "skills" ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => setMemberFilter("skills")}
                >
                  {t("membersPage.withSkills")}
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                {t("membersPage.loadingMembers")}
              </div>
            ) : !isLoggedIn ? (
              <div className="rounded-2xl border p-5 sm:p-6">
                <h3 className="text-lg font-semibold">{t("homePage.seeCommunityMembers")}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {t("homePage.seeCommunityMembersText")}
                </p>
                <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
                  <Button
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.href = "/login"
                    }}
                  >
                    {t("common.login")}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.href = "/signup"
                    }}
                  >
                    {t("common.createAccount")}
                  </Button>
                </div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                {t("homePage.noMembersForFilter")}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const displayName =
                  member.name?.trim() ||
                  member.alias?.trim() ||
                  member.email?.split("@")[0] ||
                  t("roles.member")

                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

                const skillsList = member.skills
                  ? member.skills.split(",").map((s) => s.trim()).filter(Boolean)
                  : []

                const roles = memberRolesMap[member.id] || [member.role || "member"]

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
                            {roles.includes("merchant") ? (
                              <Badge className="rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-100">
                                {t("membersPage.merchants")}
                              </Badge>
                            ) : null}

                            {roles.includes("courier") ? (
                              <Badge className="rounded-xl bg-sky-100 text-sky-900 hover:bg-sky-100">
                                {t("membersPage.couriers")}
                              </Badge>
                            ) : null}

                            {(skillsList.length ? skillsList : [t("common.notCompleted")]).map(
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
                          {t("roles.mainRole")}:{" "}
                          <span className="font-medium text-slate-900">
                            {member.role || "member"}
                          </span>
                        </p>
                        <p>
                          {t("membersPage.offers")}:{" "}
                          <span className="font-medium text-slate-900">
                            {member.offers_summary?.trim() || t("common.notCompleted")}
                          </span>
                        </p>
                        <p>
                          {t("membersPage.needs")}:{" "}
                          <span className="font-medium text-slate-900">
                            {member.needs_summary?.trim() || t("common.notCompleted")}
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
                        {t("membersPage.openProfile")}
                      </Button>

                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartChat(member.id)
                        }}
                      >
                        {t("membersPage.sendMessage")}
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
            <CardTitle className="text-lg sm:text-xl">{t("homePage.registeredMembers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border p-5 text-center">
              <p className="text-sm text-slate-500">{t("homePage.memberCount")}</p>
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
  const { t } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#173F74] via-[#204E8C] to-[#F39A3D] p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ShoppingBag className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-semibold sm:text-3xl">{t("homePage.marketTitle")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              {t("homePage.marketSubtitle")}
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
            {t("homePage.publicRequest")}
          </Button>

          <Button
            variant="market"
            className="h-12"
            onClick={() => {
              window.location.href = "/market/new"
            }}
          >
            {t("homePage.publicOffer")}
          </Button>
        </div>
      </div>

      <Card className="vivos-card border-0">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">{t("homePage.allRecentPosts")}</CardTitle>
          <div className="text-sm vivos-muted">{marketPosts.length} postări</div>
        </CardHeader>

        <CardContent className="space-y-4">
          {marketPosts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-base font-medium">{t("homePage.noMarketPosts")}</p>
              <p className="mt-2 text-sm vivos-muted">
                {t("homePage.noMarketPostsText")}
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
                      ? t("marketPage.statusInProgress")
                      : item.status === "closed"
                      ? t("marketPage.statusClosed")
                      : t("marketPage.statusActive")}
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
                    {t("homePage.contactAuthor")}
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
  const { t } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">{t("homePage.about")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("aboutPage.manifestText1")}
          </p>

          <div className="grid gap-3 sm:flex sm:flex-row">
            <Button
              className="rounded-2xl"
              onClick={() => {
                window.location.href = "/despre-talant-vivos.html"
              }}
            >
              {t("aboutPage.readFullManifest")}
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                window.location.href = "/wallet"
              }}
            >
              {t("aboutPage.installApp")}
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
  const { t } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{t("walletPage.balanceSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {walletEntries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <p className="font-medium">{t(entry.labelKey)}</p>
                  <p className="text-sm text-slate-500">{t(entry.metaKey)}</p>
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
  const { t } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#173F74] via-[#204E8C] to-[#F6BC3E] p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <HeartHandshake className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h3 className="text-2xl font-semibold sm:text-3xl">{t("nav.fund")}</h3>
            <p className="mt-1 max-w-2xl text-sm text-white/85 sm:text-base">
              {t("fundPage.recentRequests")}
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
            {t("fundPage.createRequest")}
          </Button>
        </div>
      </div>

      <Card className="vivos-card border-0">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">{t("fundPage.recentRequests")}</CardTitle>
          <div className="text-sm vivos-muted">{fundRequests.length} cereri</div>
        </CardHeader>

        <CardContent className="space-y-4">
          {fundRequests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-base font-medium">{t("fundPage.noActiveRequests")}</p>
              <p className="mt-2 text-sm vivos-muted">
                {t("fundPage.noActiveRequests")}
              </p>
            </div>
          ) : (
            fundRequests.map((item) => {
              const authorName =
                item.author?.name?.trim() ||
                item.author?.alias?.trim() ||
                item.author?.email?.trim() ||
                t("roles.member")

              const urgencyLabel =
                item.urgency === "ridicata"
                  ? t("fundPage.urgencyHigh")
                  : item.urgency === "medie"
                  ? t("fundPage.urgencyMedium")
                  : t("fundPage.urgencyLow")

              const statusLabel =
                item.status === "in_review"
                  ? t("fundPage.statusInReview")
                  : item.status === "approved"
                  ? t("fundPage.statusApproved")
                  : item.status === "supported"
                  ? t("fundPage.statusSupported")
                  : item.status === "closed"
                  ? t("fundPage.statusClosed")
                  : t("fundPage.statusNew")

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
                  <p className="mt-1 text-sm vivos-muted">{t("fundPage.requestFrom")}: {authorName}</p>

                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide vivos-muted">{t("fundPage.amount")}</p>
                      <p className="mt-1 text-sm font-medium text-[#173F74]">
                        {item.amount_talanti
                          ? `${Number(item.amount_talanti).toFixed(2)} talanți`
                          : t("fundPage.flexibleAmount")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide vivos-muted">{t("homePage.date")}</p>
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
                      {t("fundPage.writeToAuthor")}
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
                      {t("fundPage.offerSupport")}
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
  const { t } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{t("archivePage.archiveAndProofs")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {archiveItems.map((item, i) => (
            <div key={i} className="rounded-2xl border p-4">
              <p className="font-medium">{t(item.titleKey)}</p>
              <p className="text-sm text-slate-500">
                {t(item.typeKey)} · {item.date}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function GovernanceScreen() {
  const { t } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{t("nav.governance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            {t("governancePage.text1")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsScreen() {
  const { t } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{t("settingsPage.generalSettings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("settingsPage.notificationsText")}
          </p>

          <PushSubscribeButton />
        </CardContent>
      </Card>

      <VivosInstallPanel />
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
  const [memberRolesMap, setMemberRolesMap] = useState<Record<string, string[]>>({})

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

      const isLoggedIn = !!session?.user

      if (isLoggedIn) {
        const [membersResult, rolesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, name, alias, role, skills, offers_summary, needs_summary, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("member_roles")
            .select("user_id, role, is_active")
            .eq("is_active", true),
        ])

        const membersData = (membersResult.data || []) as ProfileMember[]
        const rolesData = (rolesResult.data || []) as MemberRoleRow[]

        const rolesMap = rolesData.reduce<Record<string, string[]>>((acc, item) => {
          if (!acc[item.user_id]) acc[item.user_id] = []
          acc[item.user_id].push(item.role)
          return acc
        }, {})

        setMembers(membersData)
        setMemberRolesMap(rolesMap)
        setPublicMembersCount(membersData.length)
        setMembersLoading(false)
      } else {
        setMembers([])
        setMemberRolesMap({})
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
        setPublicMembersCount(count || 0)
        setMembersLoading(false)
      }
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
        .neq("status", "closed")
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
            memberRolesMap={memberRolesMap}
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
