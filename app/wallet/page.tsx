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
import { useI18n } from "@/lib/i18n/provider"

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
  description_key?: string | null
  description_meta?: Record<string, unknown> | null
  created_at: string
}

type WalletOrderHold = {
  id: string
  amount_talanti: number
  status: "active" | "released" | "captured" | "cancelled"
}

type AppLang = "ro" | "da" | "en"

const walletTexts: Record<AppLang, Record<string, string>> = {
  ro: {
    platform: "Platforma comunitară",
    title: "Portofel",
    loading: "Se încarcă portofelul...",
    profile: "Profil",
    manifest: "Manifest VIVOS",
    settings: "Setări",
    about: "Despre",
    logout: "Logout",
    login: "Login",
    availableBalance: "Sold disponibil",
    reserved: "Rezervat",
    orderReceipts: "Încasări comenzi",
    orderPayments: "Plăți comenzi",
    transfersReceived: "Transferuri primite",
    transfersSent: "Transferuri trimise",
    talentsUnit: "talanți",
    sendTalanti: "Trimite talanți",
    supportForRequest: "Sprijin pentru cerere",
    supportRequestFallback: "Cerere de sprijin",
    supportForPrefix: "Sprijin pentru",
    supportAuthorPrefix: "Autor cerere",
    recipient: "Destinatar",
    chooseMember: "Alege un membru",
    amount: "Sumă",
    note: "Notă",
    notePlaceholder: "Ex: Ajutor pentru transport",
    sending: "Se trimite...",
    sendAction: "Trimite talanți",
    history: "Istoric tranzacții",
    noTransactions: "Nu există încă tranzacții.",
    status: "Status",
    noDescription: "Fără descriere",
    memberFallback: "Membru",
    topup: "Grant / alimentare",
    hold: "Rezervare comandă",
    release: "Eliberare hold",
    paymentIn: "Încasare comandă",
    paymentOut: "Plată comandă",
    transferIn: "Transfer primit",
    transferOut: "Transfer trimis",
    refund: "Rambursare",
    adjustment: "Ajustare",
    transferSuccess: "Transfer realizat",
    transferSupportSuccess: "Transfer realizat și cererea a fost marcată ca sprijinită.",
  },
  da: {
    platform: "Fællesskabsplatform",
    title: "Wallet",
    loading: "Indlæser wallet...",
    profile: "Profil",
    manifest: "VIVOS-manifest",
    settings: "Indstillinger",
    about: "Om",
    logout: "Log ud",
    login: "Log ind",
    availableBalance: "Tilgængelig saldo",
    reserved: "Reserveret",
    orderReceipts: "Ordreindtægter",
    orderPayments: "Ordrebetalinger",
    transfersReceived: "Modtagne overførsler",
    transfersSent: "Sendte overførsler",
    talentsUnit: "talanti",
    sendTalanti: "Send talanti",
    supportForRequest: "Støtte til anmodning",
    supportRequestFallback: "Støtteanmodning",
    supportForPrefix: "Støtte til",
    supportAuthorPrefix: "Forfatter til anmodning",
    recipient: "Modtager",
    chooseMember: "Vælg et medlem",
    amount: "Beløb",
    note: "Note",
    notePlaceholder: "Fx Hjælp til transport",
    sending: "Sender...",
    sendAction: "Send talanti",
    history: "Transaktionshistorik",
    noTransactions: "Der er endnu ingen transaktioner.",
    status: "Status",
    noDescription: "Ingen beskrivelse",
    memberFallback: "Medlem",
    topup: "Grant / påfyldning",
    hold: "Ordre-reservation",
    release: "Frigiv reservation",
    paymentIn: "Ordreindtægt",
    paymentOut: "Ordrebetaling",
    transferIn: "Modtaget overførsel",
    transferOut: "Sendt overførsel",
    refund: "Refusion",
    adjustment: "Justering",
    transferSuccess: "Overførsel gennemført",
    transferSupportSuccess: "Overførsel gennemført, og anmodningen er markeret som støttet.",
  },
  en: {
    platform: "Community platform",
    title: "Wallet",
    loading: "Loading wallet...",
    profile: "Profile",
    manifest: "VIVOS Manifest",
    settings: "Settings",
    about: "About",
    logout: "Logout",
    login: "Login",
    availableBalance: "Available balance",
    reserved: "Reserved",
    orderReceipts: "Order receipts",
    orderPayments: "Order payments",
    transfersReceived: "Transfers received",
    transfersSent: "Transfers sent",
    talentsUnit: "talanti",
    sendTalanti: "Send talanti",
    supportForRequest: "Support for request",
    supportRequestFallback: "Support request",
    supportForPrefix: "Support for",
    supportAuthorPrefix: "Request author",
    recipient: "Recipient",
    chooseMember: "Choose a member",
    amount: "Amount",
    note: "Note",
    notePlaceholder: "Ex: Help with transport",
    sending: "Sending...",
    sendAction: "Send talanti",
    history: "Transaction history",
    noTransactions: "There are no transactions yet.",
    status: "Status",
    noDescription: "No description",
    memberFallback: "Member",
    topup: "Grant / top-up",
    hold: "Order hold",
    release: "Release hold",
    paymentIn: "Order receipt",
    paymentOut: "Order payment",
    transferIn: "Transfer received",
    transferOut: "Transfer sent",
    refund: "Refund",
    adjustment: "Adjustment",
    transferSuccess: "Transfer completed",
    transferSupportSuccess: "Transfer completed and the request was marked as supported.",
  },
}

function localeFromLanguage(language: string) {
  if (language === "da") return "da-DK"
  if (language === "en") return "en-US"
  return "ro-RO"
}

function formatTalants(value: number | string | null | undefined, locale: string) {
  return Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function transactionTypeLabel(tx: WalletTransaction, text: Record<string, string>) {
  if (tx.transaction_type === "topup") return text.topup
  if (tx.transaction_type === "hold") return text.hold
  if (tx.transaction_type === "release") return text.release
  if (tx.transaction_type === "payment") return tx.direction === "credit" ? text.paymentIn : text.paymentOut
  if (tx.transaction_type === "transfer") return tx.direction === "credit" ? text.transferIn : text.transferOut
  if (tx.transaction_type === "refund") return text.refund
  return text.adjustment
}

function renderWalletDescription(
  tx: WalletTransaction,
  lang: AppLang,
  text: Record<string, string>
) {
  const meta = (tx.description_meta ?? {}) as Record<string, unknown>
  const note = typeof meta.note === "string" ? meta.note.trim() : ""

  const map: Record<AppLang, Record<string, string>> = {
    ro: {
      "wallet.desc.topup.initial_signup_grant": "Grant inițial automat la înregistrare",
      "wallet.desc.transfer.sent": note ? `Transfer trimis · ${note}` : "Transfer trimis",
      "wallet.desc.transfer.received": note ? `Transfer primit · ${note}` : "Transfer primit",
    },
    da: {
      "wallet.desc.topup.initial_signup_grant": "Automatisk startgrant ved registrering",
      "wallet.desc.transfer.sent": note ? `Sendt overførsel · ${note}` : "Sendt overførsel",
      "wallet.desc.transfer.received": note ? `Modtaget overførsel · ${note}` : "Modtaget overførsel",
    },
    en: {
      "wallet.desc.topup.initial_signup_grant": "Automatic signup grant",
      "wallet.desc.transfer.sent": note ? `Transfer sent · ${note}` : "Transfer sent",
      "wallet.desc.transfer.received": note ? `Transfer received · ${note}` : "Transfer received",
    },
  }

  if (tx.description_key && map[lang]?.[tx.description_key]) {
    return map[lang][tx.description_key]
  }

  return tx.description?.trim() || text.noDescription
}

export default function WalletPage() {
  const router = useRouter()
  const { language } = useI18n()
  const lang = (language === "da" || language === "en" ? language : "ro") as AppLang
  const text = walletTexts[lang]
  const locale = localeFromLanguage(lang)

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
          .select("id, user_id, order_id, transaction_type, amount_talanti, direction, status, description, description_key, description_meta, created_at")
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
      const pieces = [
        supportTitleParam ? `${text.supportForPrefix}: ${supportTitleParam}` : "",
        supportAuthorParam ? `${text.supportAuthorPrefix}: ${supportAuthorParam}` : "",
      ].filter(Boolean)
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
        .select("id, user_id, order_id, transaction_type, amount_talanti, direction, status, description, description_key, description_meta, created_at")
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
        ? text.transferSupportSuccess
        : ((data as { message?: string } | null)?.message || text.transferSuccess)
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
    return member.name?.trim() || member.alias?.trim() || member.email || text.memberFallback
  }

  const showUnreadBadge = !!userEmail && unreadCount > 0
  const showPublicBadge = !userEmail && publicPulseCount > 0

  if (loading) {
    return (
      <main className="min-h-screen p-6" style={{ background: vivosTheme.gradients.appBackground }}>
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">{text.loading}</p>
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

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">{text.availableBalance}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalants(availableBalance, locale)}</p><p className="mt-2 text-sm text-slate-500">{text.talentsUnit}</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">{text.reserved}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalants(reservedTalanti, locale)}</p><p className="mt-2 text-sm text-slate-500">{text.talentsUnit}</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">{text.orderReceipts}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalants(totalCommandReceived, locale)}</p><p className="mt-2 text-sm text-slate-500">{text.talentsUnit}</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">{text.orderPayments}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalants(totalCommandPaid, locale)}</p><p className="mt-2 text-sm text-slate-500">{text.talentsUnit}</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">{text.transfersReceived}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalants(totalTransferredIn, locale)}</p><p className="mt-2 text-sm text-slate-500">{text.talentsUnit}</p></CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">{text.transfersSent}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{formatTalants(totalTransferredOut, locale)}</p><p className="mt-2 text-sm text-slate-500">{text.talentsUnit}</p></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 pb-24 lg:grid-cols-[1fr_1.1fr]">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-xl">{text.sendTalanti}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className="space-y-4">
                {(supportTitle || supportAuthor) && (
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">{text.supportForRequest}</p>
                    <p className="mt-2 text-sm text-slate-600">{supportTitle || text.supportRequestFallback}{supportAuthor ? ` · ${supportAuthor}` : ""}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">{text.recipient}</label>
                  <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300" required>
                    <option value="">{text.chooseMember}</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{text.amount}</label>
                  <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-2xl" placeholder="Ex: 25" required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{text.note}</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl" placeholder={text.notePlaceholder} />
                </div>

                {message && <div className="rounded-2xl border p-3 text-sm text-slate-600">{message}</div>}

                <Button type="submit" className="rounded-2xl" disabled={sending}>{sending ? text.sending : text.sendAction}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-xl">{text.history}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {transactions.length === 0 ? (
                <div className="rounded-2xl border p-4 text-sm text-slate-600">{text.noTransactions}</div>
              ) : (
                transactions.map((tx) => {
                  const incoming = tx.direction === "credit"
                  return (
                    <div key={tx.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{transactionTypeLabel(tx, text)}</p>
                          <p className="mt-1 text-sm text-slate-500">{renderWalletDescription(tx, lang, text)}</p>
                          <p className="mt-1 text-xs text-slate-400">{text.status}: {tx.status}</p>
                        </div>
                        <p className="text-lg font-semibold">{incoming ? "+" : "-"}{formatTalants(tx.amount_talanti, locale)}</p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{new Date(tx.created_at).toLocaleString(locale)}</p>
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
