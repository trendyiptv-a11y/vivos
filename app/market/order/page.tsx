"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

function parseInitialPrice(value: string | null) {
  if (!value) return 0
  const normalized = value.replace(/,/g, ".")
  const match = normalized.match(/\d+(?:\.\d+)?/)
  if (!match) return 0
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

export default function MarketOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const marketPostId = searchParams.get("market_post_id") || ""
  const merchantUserId = searchParams.get("merchant_user_id") || ""
  const titleFromQuery = searchParams.get("title") || "Comandă merchant"
  const valueTextFromQuery = searchParams.get("value_text") || ""
  const deliveryAvailable = searchParams.get("delivery_available") === "true"

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(parseInitialPrice(valueTextFromQuery))
  const [notes, setNotes] = useState("")
  const [deliveryNeeded, setDeliveryNeeded] = useState(deliveryAvailable)

  const total = useMemo(() => {
    const computed = Number(quantity || 0) * Number(unitPrice || 0)
    return Number.isFinite(computed) ? computed : 0
  }, [quantity, unitPrice])

  useEffect(() => {
    if (!marketPostId || !merchantUserId) {
      setMessage("Lipsesc datele postării merchant.")
    }
  }, [marketPostId, merchantUserId])

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()

    if (!marketPostId || !merchantUserId) {
      setMessage("Lipsesc datele postării merchant.")
      return
    }

    if (quantity <= 0) {
      setMessage("Cantitatea trebuie să fie mai mare decât zero.")
      return
    }

    if (unitPrice < 0) {
      setMessage("Prețul în talanți nu poate fi negativ.")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const buyerUserId = session.user.id

      const { data: orderData, error: orderError } = await supabase
        .from("merchant_orders")
        .insert({
          market_post_id: marketPostId,
          merchant_user_id: merchantUserId,
          buyer_user_id: buyerUserId,
          title: titleFromQuery,
          quantity,
          unit_price_talanti: unitPrice,
          total_talanti: total,
          notes: notes.trim() || null,
          delivery_needed: deliveryNeeded,
          status: "new",
          payment_status: "unpaid",
        })
        .select("id")
        .single()

      if (orderError || !orderData) {
        setMessage(orderError?.message || "Comanda nu a putut fi creată.")
        setLoading(false)
        return
      }

      const { data: conversationId, error: conversationError } = await supabase.rpc("find_or_create_direct_conversation", {
        other_member_id: merchantUserId,
      })

      if (!conversationError && conversationId) {
        const summaryLines = [
          `Comandă nouă: ${titleFromQuery}`,
          `Cantitate: ${quantity}`,
          `Preț unitar: ${unitPrice} talanți`,
          `Total: ${total} talanți`,
          `Livrare necesară: ${deliveryNeeded ? "da" : "nu"}`,
          notes.trim() ? `Detalii: ${notes.trim()}` : null,
          `Order ID: ${orderData.id}`,
        ].filter(Boolean)

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: buyerUserId,
          body: summaryLines.join("\n"),
        })

        await supabase
          .from("conversation_hidden_for_users")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", buyerUserId)

        await supabase.from("notifications").insert({
          user_id: merchantUserId,
          event_type: "merchant_order_created",
          title: "Ai primit o comandă nouă",
          body: `${titleFromQuery} · ${quantity} buc. · ${total} talanți`,
          ref_id: orderData.id,
          is_read: false,
        })

        router.push(`/messages/${conversationId}`)
        return
      }

      setMessage("Comanda a fost creată, dar conversația nu a putut fi pornită automat.")
      setLoading(false)
    } catch (error: any) {
      console.error("Create merchant order error:", error)
      setMessage(error?.message || "Comanda nu a putut fi creată.")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)",
        }}
      >
        <div className="mx-auto flex min-h-[84px] max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>
              Piață comunitară
            </p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>
              Comandă merchant
            </h1>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/market")}>
            Înapoi
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Plasează comanda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div className="rounded-2xl border p-4">
                <p className="text-sm text-slate-500">Produs / postare</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{titleFromQuery}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {valueTextFromQuery ? <Badge variant="outline" className="rounded-xl">{valueTextFromQuery}</Badge> : null}
                  {deliveryAvailable ? <Badge className="rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Livrare disponibilă</Badge> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cantitate</label>
                  <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))} className="rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preț unitar în talanți</label>
                  <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value || 0)))} className="rounded-2xl" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Detalii comandă</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Ex: culoare, variantă, preferințe, interval orar"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border p-4">
                <input type="checkbox" checked={deliveryNeeded} onChange={(e) => setDeliveryNeeded(e.target.checked)} />
                <span className="text-sm text-slate-700">Am nevoie și de livrare</span>
              </label>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total estimat</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{total.toFixed(2)} talanți</p>
              </div>

              {message ? <div className="rounded-2xl border p-3 text-sm text-slate-600">{message}</div> : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="rounded-2xl" disabled={loading}>
                  {loading ? "Se creează..." : "Creează comanda"}
                </Button>
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => router.push("/market")}>
                  Renunță
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
