"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function NewMutualFundRequestPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [amountTalanti, setAmountTalanti] = useState("")
  const [urgency, setUrgency] = useState("medie")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
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

      const [{ count: unread, error: unreadError }, { count: pulse, error: pulseError }] = await Promise.all([
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
      .channel("fund-new-topbar-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          loadTopBarState()
        }
      )
      .subscribe()

    const pulseChannel = supabase
      .channel("fund-new-topbar-pulse")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "public_activity_feed" },
        () => {
          loadTopBarState()
        }
      )
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.push("/login")
      return
    }

    const payload = {
      author_id: session.user.id,
      title: title.trim(),
      description: description.trim(),
      amount_talanti: amountTalanti ? Number(amountTalanti) : null,
      urgency,
    }

    const { error } = await supabase.from("mutual_fund_requests").insert(payload)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage("Cererea a fost trimisă.")
    setTimeout(() => {
      window.location.href = "/?tab=fund"
    }, 800)
  }

  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Platforma comunitară</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl text-slate-900">Cerere nouă</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
                <div className="hidden max-w-[180px] truncate rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 sm:block">
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
                          window.location.href = "/downloads/manifest.html"
                        }}
                      >
                        Manifest VIVOS
                      </button>

                      <button
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          window.location.href = "/?tab=settings"
                        }}
                      >
                        Setări
                      </button>

                      <button
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-100"
                        onClick={() => {
                          setProfileMenuOpen(false)
                          window.location.href = "/?tab=about"
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

      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Cerere nouă — Fond mutual de sprijin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pb-24">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titlu</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-2xl"
                  placeholder="Ex: Sprijin pentru transport medical"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descriere</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Descrie clar de ce ai nevoie și ce context există."
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Suma în talanți</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={amountTalanti}
                    onChange={(e) => setAmountTalanti(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Ex: 40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Urgență</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  >
                    <option value="scazuta">Scăzută</option>
                    <option value="medie">Medie</option>
                    <option value="ridicata">Ridicată</option>
                  </select>
                </div>
              </div>

              {message && (
                <div className="rounded-2xl border p-3 text-sm text-slate-600">{message}</div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="rounded-2xl" disabled={saving}>
                  {saving ? "Se trimite..." : "Trimite cererea"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => router.push("/?tab=fund")}
                >
                  Înapoi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
