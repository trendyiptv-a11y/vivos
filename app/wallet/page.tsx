"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function WalletPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [members, setMembers] = useState<ProfileOption[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])

  const [receiverId, setReceiverId] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [supportTitle, setSupportTitle] = useState("")
  const [supportAuthor, setSupportAuthor] = useState("")

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
    const supportReceiverId = searchParams.get("supportReceiverId") || ""
    const supportAmount = searchParams.get("supportAmount") || ""
    const supportTitleParam = searchParams.get("supportTitle") || ""
    const supportAuthorParam = searchParams.get("supportAuthor") || ""

    if (supportReceiverId) {
      setReceiverId(supportReceiverId)
    }

    if (supportAmount) {
      setAmount(supportAmount)
    }

    if (supportTitleParam) {
      setSupportTitle(supportTitleParam)
    }

    if (supportAuthorParam) {
      setSupportAuthor(supportAuthorParam)
    }

    if (supportTitleParam || supportAuthorParam) {
      const pieces = [
        supportTitleParam ? `Sprijin pentru: ${supportTitleParam}` : "",
        supportAuthorParam ? `Autor cerere: ${supportAuthorParam}` : "",
      ].filter(Boolean)

      setNote(pieces.join(" · "))
    }
  }, [searchParams])

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

    setMessage((data as { message?: string } | null)?.message || "Transfer realizat")
    setReceiverId("")
    setAmount("")
    setNote("")

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
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Wallet intern</p>
            <h1 className="text-3xl font-semibold">Talanți</h1>
          </div>

          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/")}>
            Înapoi
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Sold curent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{Number(account?.balance || 0).toFixed(2)}</p>
              <p className="mt-2 text-sm text-slate-500">talanți</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Total primit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totalReceived.toFixed(2)}</p>
              <p className="mt-2 text-sm text-slate-500">talanți</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Total trimis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totalSent.toFixed(2)}</p>
              <p className="mt-2 text-sm text-slate-500">talanți</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
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
                  <div className="rounded-2xl border p-3 text-sm text-slate-600">
                    {message}
                  </div>
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
                <div className="rounded-2xl border p-4 text-sm text-slate-600">
                  Nu există încă tranzacții.
                </div>
              ) : (
                transactions.map((tx) => {
                  const incoming = tx.receiver_id === userId
                  return (
                    <div key={tx.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {incoming ? "Primit" : "Trimis"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {tx.note?.trim() || "Fără notă"}
                          </p>
                        </div>
                        <p className="text-lg font-semibold">
                          {incoming ? "+" : "-"}
                          {Number(tx.amount).toFixed(2)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleString("ro-RO")}
                      </p>
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
