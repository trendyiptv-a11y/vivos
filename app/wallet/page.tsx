"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type ProfileOption = {
  id: string
  email: string
  name: string | null
  alias: string | null
}

type WalletAccount = {
  user_id: string
  balance: number
}

type WalletTransaction = {
  id: string
  sender_id: string | null
  receiver_id: string | null
  amount: number
  note: string | null
  created_at: string
}

function formatTalents(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function WalletPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [members, setMembers] = useState<ProfileOption[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])

  const [receiverId, setReceiverId] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [supportRequestId, setSupportRequestId] = useState("")
  const [supportTitle, setSupportTitle] = useState("")
  const [supportAuthor, setSupportAuthor] = useState("")

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
      .channel("wallet-topbar-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          loadTopBarState()
        }
      )
      .subscribe()

    const pulseChannel = supabase
      .channel("wallet-topbar-pulse")
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

  useEffect(() => {
    async function loadWallet() {
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const currentUserId = session.user.id
      setUserId(currentUserId)
      setUserEmail(session.user.email ?? null)

      const [{ data: accountData }, { data: membersData }, { data: txData }] = await Promise.all([
        supabase
          .from("wallet_accounts")
          .select("user_id, balance")
          .eq("user_id", currentUserId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, email, name, alias")
          .neq("id", currentUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("wallet_transactions")
          .select("id, sender_id, receiver_id, amount, note, created_at")
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .order("created_at", { ascending: false })
          .limit(30),
      ])

      setAccount((accountData as WalletAccount | null) ?? { user_id: currentUserId, balance: 0 })
      setMembers((membersData as ProfileOption[]) ?? [])
      setTransactions((txData as WalletTransaction[]) ?? [])
      setLoading(false)
    }

    loadWallet()
  }, [router])

  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    const supportReceiverId = params.get("supportReceiverId") || ""
    const supportAmount = params.get("supportAmount") || ""
    const supportRequestIdParam = params.get("supportRequestId") || ""
    const supportTitleParam = params.get("supportTitle") || ""
    const supportAuthorParam = params.get("supportAuthor") || ""

    if (supportReceiverId) setReceiverId(supportReceiverId)
    if (supportAmount) setAmount(supportAmount)
    if (supportRequestIdParam) setSupportRequestId(supportRequestIdParam)
    if (supportTitleParam) setSupportTitle(supportTitleParam)
    if (supportAuthorParam) setSupportAuthor(supportAuthorParam)

    if (supportTitleParam || supportAuthorParam) {
      const pieces = [
        supportTitleParam ? `Sprijin pentru: ${supportTitleParam}` : "",
        supportAuthorParam ? `Autor cerere: ${supportAuthorParam}` : "",
      ].filter(Boolean)

      setNote(pieces.join(" · "))
    }
  }, [])

  const totalReceived = useMemo(
    () =>
      transactions
        .filter((tx) => tx.receiver_id === userId)
        .reduce((sum, tx) => sum + Number(tx.amount), 0),
    [transactions, userId]
  )

  const totalSent = useMemo(
    () =>
      transactions
        .filter((tx) => tx.sender_id === userId)
        .reduce((sum, tx) => sum + Number(tx.amount), 0),
    [transactions, userId]
  )

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!receiverId || !amount) return

    setSending(true)
    setMessage("")

    const numericAmount = Number(amount)

    const { data, error } = await supabase.rpc("transfer_talanti", {
      p_receiver_id: receiverId,
      p_amount: numericAmount,
      p_note: note || null,
    })

    if (error) {
      setMessage(error.message)
      setSending(false)
      return
    }

    if (supportRequestId) {
      await supabase
        .from("mutual_fund_requests")
        .update({ status: "supported" })
        .eq("id", supportRequestId)
    }

    setMessage(
      supportRequestId
        ? "Transfer realizat și cererea a fost marcată ca sprijinită."
        : ((data as { message?: string } | null)?.message || "Transfer realizat")
    )
    setReceiverId("")
    setAmount("")
    setNote("")
    setSupportRequestId("")
    setSupportTitle("")
    setSupportAuthor("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      const currentUserId = session.user.id

      const [{ data: accountData }, { data: txData }] = await Promise.all([
        supabase
          .from("wallet_accounts")
          .select("user_id, balance")
          .eq("user_id", currentUserId)
          .maybeSingle(),
        supabase
          .from("wallet_transactions")
          .select("id, sender_id, receiver_id, amount, note, created_at")
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .order("created_at", { ascending: false })
          .limit(30),
      ])

      setAccount((accountData as WalletAccount | null) ?? { user_id: currentUserId, balance: 0 })
      setTransactions((txData as WalletTransaction[]) ?? [])
    }

    setSending(false)
  }

  function memberLabel(member: ProfileOption) {
    return member.name?.trim() || member.alias?.trim() || member.email || "Membru"
  }

  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Se încarcă wallet-ul...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Platforma comunitară</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl text-slate-900">Portofel</h1>
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

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Sold curent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatTalents(account?.balance)}</p>
              <p className="mt-2 text-sm text-slate-500">talanți</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Total primit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatTalents(totalReceived)}</p>
              <p className="mt-2 text-sm text-slate-500">talanți</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Total trimis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatTalents(totalSent)}</p>
              <p className="mt-2 text-sm text-slate-500">talanți</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_1.1fr]">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Trimite talanți</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className="space-y-4">
                {(supportTitle || supportAuthor) && (
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Sprijin pentru cerere</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {supportTitle || "Cerere de sprijin"}
                      {supportAuthor ? ` · ${supportAuthor}` : ""}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destinatar</label>
                  <select
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                    className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    required
                  >
                    <option value="">Alege un membru</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sumă</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Ex: 25"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notă</label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Ex: Ajutor pentru transport"
                  />
                </div>

                {message && (
                  <div className="rounded-2xl border p-3 text-sm text-slate-600">{message}</div>
                )}

                <Button type="submit" className="rounded-2xl" disabled={sending}>
                  {sending ? "Se trimite..." : "Trimite talanți"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Istoric tranzacții</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {transactions.length === 0 ? (
                <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu există încă tranzacții.</div>
              ) : (
                transactions.map((tx) => {
                  const incoming = tx.receiver_id === userId
                  return (
                    <div key={tx.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{incoming ? "Primit" : "Trimis"}</p>
                          <p className="mt-1 text-sm text-slate-500">{tx.note?.trim() || "Fără notă"}</p>
                        </div>
                        <p className="text-lg font-semibold">
                          {incoming ? "+" : "-"}
                          {formatTalents(tx.amount)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{new Date(tx.created_at).toLocaleString("ro-RO")}</p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
