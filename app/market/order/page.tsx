"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type LinkedCatalogItem = {
  id: string
  title: string
  description: string | null
  category: string | null
  price_talanti: number
  stock_quantity: number | null
  unit_label: string | null
  is_active: boolean
}

type SelectedOrderItem = {
  catalogItemId: string
  quantity: number
}

type ProductListFilter = "all" | "in_stock"

function parseInitialPrice(value: string | null) {
  if (!value) return 0
  const normalized = value.replace(/,/g, ".")
  const match = normalized.match(/\d+(?:\.\d+)?/)
  if (!match) return 0
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : 0
}

function MarketOrderPageInner() {
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
  const [linkedItems, setLinkedItems] = useState<LinkedCatalogItem[]>([])
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [linkedItemsLoading, setLinkedItemsLoading] = useState(true)
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [productListFilter, setProductListFilter] = useState<ProductListFilter>("all")

  const hasLinkedItems = linkedItems.length > 0

  const selectedItems = useMemo<SelectedOrderItem[]>(() => {
    return Object.entries(selectedQuantities)
      .filter(([, selectedQuantity]) => Number(selectedQuantity) > 0)
      .map(([catalogItemId, selectedQuantity]) => ({ catalogItemId, quantity: Number(selectedQuantity) }))
  }, [selectedQuantities])

  const filteredLinkedItems = useMemo(() => {
    const query = productSearchTerm.trim().toLowerCase()
    return linkedItems.filter((item) => {
      if (productListFilter === "in_stock" && item.stock_quantity !== null && item.stock_quantity <= 0) return false
      if (!query) return true
      return [item.title, item.description || "", item.category || "", item.unit_label || ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [linkedItems, productListFilter, productSearchTerm])

  const total = useMemo(() => {
    if (hasLinkedItems) {
      return selectedItems.reduce((sum, selectedItem) => {
        const item = linkedItems.find((row) => row.id === selectedItem.catalogItemId)
        if (!item) return sum
        return sum + Number(item.price_talanti) * selectedItem.quantity
      }, 0)
    }

    const computed = Number(quantity || 0) * Number(unitPrice || 0)
    return Number.isFinite(computed) ? computed : 0
  }, [hasLinkedItems, linkedItems, quantity, selectedItems, unitPrice])

  useEffect(() => {
    if (!marketPostId || !merchantUserId) {
      setMessage("Lipsesc datele postării merchant.")
    }
  }, [marketPostId, merchantUserId])

  useEffect(() => {
    async function loadLinkedItems() {
      if (!marketPostId) {
        setLinkedItems([])
        setLinkedItemsLoading(false)
        return
      }

      setLinkedItemsLoading(true)
      const { data, error } = await supabase
        .from("market_post_item_links")
        .select("merchant_catalog_items(id, title, description, category, price_talanti, stock_quantity, unit_label, is_active)")
        .eq("market_post_id", marketPostId)

      if (error) {
        setLinkedItems([])
        setLinkedItemsLoading(false)
        return
      }

      const items = ((data ?? []) as any[])
        .map((row) => row.merchant_catalog_items as LinkedCatalogItem | null)
        .filter(Boolean)
        .filter((item) => item?.is_active)

      setLinkedItems(items as LinkedCatalogItem[])
      setLinkedItemsLoading(false)
    }

    loadLinkedItems()
  }, [marketPostId])

  function handleItemQuantityChange(itemId: string, nextQuantity: number) {
    setSelectedQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, Number.isFinite(nextQuantity) ? nextQuantity : 0),
    }))
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()

    if (!marketPostId || !merchantUserId) {
      setMessage("Lipsesc datele postării merchant.")
      return
    }

    if (hasLinkedItems) {
      if (!selectedItems.length) {
        setMessage("Selectează cel puțin un produs din anunț.")
        return
      }
    } else {
      if (quantity <= 0) {
        setMessage("Cantitatea trebuie să fie mai mare decât zero.")
        return
      }

      if (unitPrice < 0) {
        setMessage("Prețul în talanți nu poate fi negativ.")
        return
      }
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

      const createOrderResponse = await fetch("/api/orders/create-with-hold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          marketPostId,
          merchantUserId,
          title: titleFromQuery,
          quantity,
          unitPriceTalanti: unitPrice,
          totalTalanti: total,
          notes,
          deliveryNeeded,
          items: hasLinkedItems ? selectedItems : [],
        }),
      })

      const createOrderResult = await createOrderResponse.json().catch(() => null)

      if (!createOrderResponse.ok || !createOrderResult?.orderId) {
        setMessage(createOrderResult?.error || "Comanda nu a putut fi creată.")
        setLoading(false)
        return
      }

      const orderId = createOrderResult.orderId as string

      const { data: conversationId, error: conversationError } = await supabase.rpc("find_or_create_direct_conversation", {
        other_member_id: merchantUserId,
      })

      if (!conversationError && conversationId) {
        const selectedSummary = hasLinkedItems
          ? selectedItems
              .map((selectedItem) => {
                const item = linkedItems.find((row) => row.id === selectedItem.catalogItemId)
                if (!item) return null
                return `- ${item.title} × ${selectedItem.quantity} = ${(Number(item.price_talanti) * selectedItem.quantity).toFixed(2)} talanți`
              })
              .filter(Boolean)
          : []

        const summaryLines = [
          `Comandă nouă: ${titleFromQuery}`,
          hasLinkedItems ? "Produse selectate:" : `Cantitate: ${quantity}`,
          ...selectedSummary,
          !hasLinkedItems ? `Preț unitar: ${unitPrice} talanți` : null,
          `Total: ${total.toFixed(2)} talanți`,
          `Plată rezervată: da`,
          `Livrare necesară: ${deliveryNeeded ? "da" : "nu"}`,
          notes.trim() ? `Detalii: ${notes.trim()}` : null,
          `Order ID: ${orderId}`,
        ].filter(Boolean)

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: buyerUserId,
          body: summaryLines.join("\n"),
        })

        await supabase.from("conversation_hidden_for_users").delete().eq("conversation_id", conversationId).eq("user_id", buyerUserId)

        await supabase.from("notifications").insert({
          user_id: merchantUserId,
          event_type: "merchant_order_created",
          title: "Ai primit o comandă nouă",
          body: `${titleFromQuery} · ${hasLinkedItems ? `${selectedItems.length} produse` : `${quantity} buc.`} · ${total.toFixed(2)} talanți`,
          ref_id: orderId,
          is_read: false,
        })

        router.push(`/messages/${conversationId}`)
        return
      }

      setMessage("Comanda a fost creată cu hold, dar conversația nu a putut fi pornită automat.")
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

              {linkedItemsLoading ? (
                <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă produsele din anunț...</div>
              ) : hasLinkedItems ? (
                <div className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-900">Selectează produsele dorite</p>
                    <div className="text-sm text-slate-500">{filteredLinkedItems.length} / {linkedItems.length} produse afișate</div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Input value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="rounded-2xl" placeholder="Caută produs în acest anunț" />
                    <div className="flex gap-2">
                      <Button type="button" variant={productListFilter === "all" ? "default" : "outline"} className="rounded-2xl" onClick={() => setProductListFilter("all")}>Toate</Button>
                      <Button type="button" variant={productListFilter === "in_stock" ? "default" : "outline"} className="rounded-2xl" onClick={() => setProductListFilter("in_stock")}>În stoc</Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {filteredLinkedItems.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Nu există produse pentru căutarea sau filtrul curent.</div>
                    ) : (
                      filteredLinkedItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="rounded-xl">{item.category || "General"}</Badge>
                                <Badge className="rounded-xl bg-indigo-100 text-indigo-900 hover:bg-indigo-100">{Number(item.price_talanti).toFixed(2)} talanți / {item.unit_label || "buc"}</Badge>
                              </div>
                              <p className="font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{item.description?.trim() || "Fără descriere"}</p>
                              <p className="mt-2 text-xs text-slate-500">Stoc: {item.stock_quantity ?? "nelimitat"}</p>
                            </div>
                            <div className="w-28 space-y-2">
                              <label className="text-sm font-medium">Cantitate</label>
                              <Input type="number" min={0} step="1" value={selectedQuantities[item.id] ?? 0} onChange={(e) => handleItemQuantityChange(item.id, Number(e.target.value || 0))} className="rounded-2xl" />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
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
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Detalii comandă</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300" placeholder="Ex: culoare, variantă, preferințe, interval orar" />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border p-4">
                <input type="checkbox" checked={deliveryNeeded} onChange={(e) => setDeliveryNeeded(e.target.checked)} />
                <span className="text-sm text-slate-700">Am nevoie și de livrare</span>
              </label>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total estimat</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{total.toFixed(2)} talanți</p>
                <p className="mt-2 text-sm text-slate-600">La creare se rezervă suma în wallet sub formă de hold.</p>
              </div>

              {message ? <div className="rounded-2xl border p-3 text-sm text-slate-600">{message}</div> : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="rounded-2xl" disabled={loading || linkedItemsLoading}>
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

export default function MarketOrderPage() {
  return (
    <Suspense fallback={null}>
      <MarketOrderPageInner />
    </Suspense>
  )
}
