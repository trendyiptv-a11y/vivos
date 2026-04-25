"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"

type ProfileOption = {
  id: string
  email: string
  name: string | null
  alias: string | null
}

type WalletAccount = {
  user_id: string
  balance_talanti: number
}

type WalletTransaction = {
  id: string
  user_id: string
  order_id: string | null
  transaction_type: "topup" | "hold" | "release" | "payment" | "refund" | "adjustment" | "transfer"
  amount_talanti: number
  direction: "credit" | "debit"
  status: "pending" | "posted" | "cancelled"
  description: string | null
  created_at: string
}

type WalletOrderHold = {
  id: string
  amount_talanti: number
  status: "active" | "released" | "captured" | "cancelled"
}

function formatTalents(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function transactionTypeLabel(tx: WalletTransaction) {
  if (tx.transaction_type === "topup") return "Grant / alimentare"
  if (tx.transaction_type === "hold") return "Rezervare comandă"
  if (tx.transaction_type === "release") return "Eliberare hold"
  if (tx.transaction_type === "payment") return tx.direction === "credit" ? "Încasare comandă" : "Plată comandă"
  if (tx.transaction_type === "transfer") return tx.direction === "credit" ? "Transfer primit" : "Transfer trimis"
  if (tx.transaction_type === "refund") return "Rambursare"
  return "Ajustare"
}

export default function WalletPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [members, setMembers] = useState<ProfileOption[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [activeHolds, setActiveHolds] = useState<WalletOrderHold[]>([])

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

      const [{ count: unread, error: unreadError }, { count: pulse, error: pulseError }] =
        await Promise.all([
          supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", session.user.id).eq("is_read", false),
          supabase.from("public_activity_feed").select("*", { count: "exact", head: true }).gte("created_at", since),
        ])

      if (!unreadError) setUnreadCount(unread || 0)
      if (!pulseError) setPublicPulseCount(pulse || 0)
    }

    loadTopBarState()

    const notificationsChannel = supabase
      .channel("wallet-topbar-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        loadTopBarState()
      })
      .subscribe()

    const pulseChannel = supabase
      .channel("wallet-topbar-pulse")
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
      setUserEmail(session.user.email ?? null)

      const [accountResult, membersResult, txResult, holdsResult] = await Promise.all([
        supabase.from("wallet_accounts").select("user_id, balance_talanti").eq("user_id", currentUserId).maybeSingle(),
        supabase.from("profiles").select("id, email, name, alias").neq("id", currentUserId).order("created_at", { ascending: false }),
        supabase
          .from("wallet_transactions")
          .select("id, user_id, order_id, transaction_type, amount_talanti, direction, status, description, created_at")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("wallet_order_holds")
          .select("id, amount_talanti, status")
          .eq("buyer_user_id", currentUserId)
          .eq("status", "active"),
      ])

      if (accountResult.error) setMessage(accountResult.error.message)
      if (txResult.error && !accountResult.error) setMessage(txResult.error.message)
      if (holdsResult.error && !accountResult.error && !txResult.error) setMessage(holdsResult.error.message)

      setAccount((accountResult.data as WalletAccount | null) ?? { user_id: currentUserId, balance_talanti: 0 })
      setMembers((membersResult.data as ProfileOption[]) ?? [])
      setTransactions((txResult.data as WalletTransaction[]) ?? [])
      setActiveHolds((holdsResult.data as WalletOrderHold[]) ?? [])
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
      const pieces = [supportTitleParam ? `Sprijin pentru: ${supportTitleParam}` : "", supportAuthorParam ? `Autor cerere: ${supportAuthorParam}` : ""].filter(Boolean)
      setNote(pieces.join(" · "))
    }
  }, [])

  const reservedTalanti = useMemo(() => activeHolds.reduce((sum, hold) => sum + Number(hold.amount_talanti || 0), 0), [activeHolds])
  const availableBalance = useMemo(() => Math.max(0, Number(account?.balance_talanti || 0) - reservedTalanti), [account, reservedTalanti])

  const totalCommandReceived = useMemo(
    () => transactions.filter((tx) => tx.status === "posted" && tx.direction === "credit" && tx.transaction_type === "payment").reduce((sum, tx) => sum + Number(tx.amount_talanti), 0),
    [transactions]
  )

  const totalCommandPaid = useMemo(
    () => transactions.filter((tx) => tx.status === "posted" && tx.direction === "debit" && tx.transaction_type === "payment").reduce((sum, tx) => sum + Number(tx.amount_talanti), 0),
    [transactions]
  )

  const totalTransferredIn = useMemo(
    () => transactions.filter((tx) => tx.status === "posted" && tx.direction === "credit" && tx.transaction_type === "transfer").reduce((sum, tx) => sum + Number(tx.amount_talanti), 0),
    [transactions]
  )

  const totalTransferredOut = useMemo(
    () => transactions.filter((tx) => tx.status === "posted" && tx.direction === "debit" && tx.transaction_type === "transfer").reduce((sum, tx) => sum + Number(tx.amount_talanti), 0),
    [transactions]
  )

  async function reloadWalletSnapshot(currentUserId: string) {
    const [accountResult, txResult, holdsResult] = await Promise.all([
      supabase.from("wallet_accounts").select("user_id, balance_talanti").eq("user_id", currentUserId).maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("id, user_id, order_id, transaction_type, amount_talanti, direction, status, description, created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("wallet_order_holds")
        .select("id, amount_talanti, status")
        .eq("buyer_user_id", currentUserId)
        .eq("status", "active"),
    ])

    setAccount((accountResult.data as WalletAccount | null) ?? { user_id: currentUserId, balance_talanti: 0 })
    setTransactions((txResult.data as WalletTransaction[]) ?? [])
    setActiveHolds((holdsResult.data as WalletOrderHold[]) ?? [])
  }

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
      await supabase.from("mutual_fund_requests").update({ status: "supported" }).eq("id", supportRequestId)
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
      await reloadWalletSnapshot(session.user.id)
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
      <main className="min-h-screen p-6" style={{ background: vivosTheme.gradients.appBackground }}>
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
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header className="sticky top-0 z-10 border-b backdrop-blur-xl" style={{ background: vivosTheme.styles.bottomNav.background, borderColor: vivosTheme.styles.bottomNav.borderColor, boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)" }}>
        <div className="flex min-h-[84px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>Platforma comunitară</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>Portofel</h1>
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

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Sold disponibil</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalents(availableBalance)}</p><p className="mt-2 text-sm text-slate-500">talanți</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Rezervat</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalents(reservedTalanti)}</p><p className="mt-2 text-sm text-slate-500">talanți</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Încasări comenzi</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalents(totalCommandReceived)}</p><p className="mt-2 text-sm text-slate-500">talanți</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Plăți comenzi</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalents(totalCommandPaid)}</p><p className="mt-2 text-sm text-slate-500">talanți</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Transferuri primite</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalents(totalTransferredIn)}</p><p className="mt-2 text-sm text-slate-500">talanți</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Transferuri trimise</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalents(totalTransferredOut)}</p><p className="mt-2 text-sm text-slate-500">talanți</p></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_1.1fr]">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-xl">Trimite talanți</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className="space-y-4">
                {(supportTitle || supportAuthor) && (
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Sprijin pentru cerere</p>
                    <p className="mt-2 text-sm text-slate-600">{supportTitle || "Cerere de sprijin"}{supportAuthor ? ` · ${supportAuthor}` : ""}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Destinatar</label>
                  <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300" required>
                    <option value="">Alege un membru</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sumă</label>
                  <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-2xl" placeholder="Ex: 25" required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notă</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl" placeholder="Ex: Ajutor pentru transport" />
                </div>

                {message && <div className="rounded-2xl border p-3 text-sm text-slate-600">{message}</div>}

                <Button type="submit" className="rounded-2xl" disabled={sending}>{sending ? "Se trimite..." : "Trimite talanți"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-xl">Istoric tranzacții</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {transactions.length === 0 ? (
                <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu există încă tranzacții.</div>
              ) : (
                transactions.map((tx) => {
                  const incoming = tx.direction === "credit"
                  return (
                    <div key={tx.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{transactionTypeLabel(tx)}</p>
                          <p className="mt-1 text-sm text-slate-500">{tx.description?.trim() || "Fără descriere"}</p>
                          <p className="mt-1 text-xs text-slate-400">Status: {tx.status}</p>
                        </div>
                        <p className="text-lg font-semibold">{incoming ? "+" : "-"}{formatTalents(tx.amount_talanti)}</p>
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
