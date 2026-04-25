"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type MarketPost = {
  id: string
  author_id: string
  title: string
  post_type: "offer" | "request"
  category: string | null
  value_text: string | null
}

type CatalogItem = {
  id: string
  merchant_user_id: string
  title: string
  description: string | null
  category: string | null
  price_talanti: number
  stock_quantity: number | null
  unit_label: string | null
  is_active: boolean
}

type LinkRow = {
  id: string
  market_post_id: string
  catalog_item_id: string
  sort_order: number
}

function MarketLinkProductsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const marketPostId = searchParams.get("market_post_id") || ""

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [post, setPost] = useState<MarketPost | null>(null)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [linkedRows, setLinkedRows] = useState<LinkRow[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  async function loadData() {
    setLoading(true)
    setMessage("")

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) {
      router.push("/login")
      return
    }

    if (!marketPostId) {
      setMessage("Lipsește market_post_id.")
      setLoading(false)
      return
    }

    setUserId(session.user.id)

    const [postResult, catalogResult, linksResult] = await Promise.all([
      supabase
        .from("market_posts")
        .select("id, author_id, title, post_type, category, value_text")
        .eq("id", marketPostId)
        .maybeSingle(),
      supabase
        .from("merchant_catalog_items")
        .select("id, merchant_user_id, title, description, category, price_talanti, stock_quantity, unit_label, is_active")
        .eq("merchant_user_id", session.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("market_post_item_links")
        .select("id, market_post_id, catalog_item_id, sort_order")
        .eq("market_post_id", marketPostId)
        .order("sort_order", { ascending: true }),
    ])

    if (postResult.error) {
      setMessage(postResult.error.message)
      setLoading(false)
      return
    }
    if (catalogResult.error) {
      setMessage(catalogResult.error.message)
      setLoading(false)
      return
    }
    if (linksResult.error) {
      setMessage(linksResult.error.message)
      setLoading(false)
      return
    }

    const loadedPost = postResult.data as MarketPost | null
    if (!loadedPost) {
      setMessage("Postarea nu a fost găsită.")
      setLoading(false)
      return
    }

    if (loadedPost.author_id !== session.user.id) {
      setMessage("Poți lega produse doar la propriile postări.")
      setLoading(false)
      return
    }

    const rows = (linksResult.data ?? []) as LinkRow[]
    setPost(loadedPost)
    setCatalogItems((catalogResult.data ?? []) as CatalogItem[])
    setLinkedRows(rows)
    setSelectedIds(rows.map((row) => row.catalog_item_id))
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [router, marketPostId])

  function toggleItem(itemId: string) {
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  async function handleSaveLinks() {
    if (!marketPostId || !userId) return
    setSaving(true)
    setMessage("")

    const existingIds = linkedRows.map((row) => row.catalog_item_id)
    const idsToDelete = existingIds.filter((id) => !selectedIds.includes(id))
    const idsToInsert = selectedIds.filter((id) => !existingIds.includes(id))

    if (idsToDelete.length) {
      const { error } = await supabase
        .from("market_post_item_links")
        .delete()
        .eq("market_post_id", marketPostId)
        .in("catalog_item_id", idsToDelete)
      if (error) {
        setMessage(error.message)
        setSaving(false)
        return
      }
    }

    if (idsToInsert.length) {
      const payload = idsToInsert.map((catalogItemId, index) => ({
        market_post_id: marketPostId,
        catalog_item_id: catalogItemId,
        sort_order: linkedRows.length + index,
      }))
      const { error } = await supabase.from("market_post_item_links").insert(payload)
      if (error) {
        setMessage(error.message)
        setSaving(false)
        return
      }
    }

    await loadData()
    setMessage("Produsele au fost legate la postare.")
    setSaving(false)
  }

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds])

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{ background: vivosTheme.styles.bottomNav.background, borderColor: vivosTheme.styles.bottomNav.borderColor, boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)" }}
      >
        <div className="mx-auto flex min-h-[84px] max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>Market composer</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>Leagă produse la postare</h1>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/market")}>Înapoi</Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        {message ? <div className="rounded-2xl border bg-white p-4 text-sm text-slate-700">{message}</div> : null}

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Postare curentă</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă postarea...</div>
            ) : post ? (
              <div className="rounded-2xl border p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-xl">{post.post_type === "offer" ? "Ofertă" : "Cerere"}</Badge>
                  <Badge variant="outline" className="rounded-xl">{post.category || "General"}</Badge>
                </div>
                <p className="text-lg font-semibold">{post.title}</p>
                <p className="mt-2 text-sm text-slate-600">Valoare afișată: {post.value_text?.trim() || "necompletat"}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">Produse din catalog</CardTitle>
            <div className="text-sm text-slate-500">Selectate: {selectedCount}</div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă produsele...</div>
            ) : catalogItems.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu ai încă produse în catalog. Adaugă produse mai întâi din Merchant Catalog.</div>
            ) : (
              catalogItems.map((item) => {
                const isSelected = selectedIds.includes(item.id)
                return (
                  <label key={item.id} className="flex items-start gap-3 rounded-2xl border p-4">
                    <input type="checkbox" className="mt-1 h-4 w-4" checked={isSelected} onChange={() => toggleItem(item.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-xl">{item.category || "General"}</Badge>
                        <Badge className={`rounded-xl ${item.is_active ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : "bg-slate-200 text-slate-700 hover:bg-slate-200"}`}>{item.is_active ? "Activ" : "Inactiv"}</Badge>
                      </div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.description?.trim() || "Fără descriere"}</p>
                      <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                        <p>Preț: <span className="font-medium text-slate-900">{Number(item.price_talanti).toFixed(2)} talanți</span></p>
                        <p>Stoc: <span className="font-medium text-slate-900">{item.stock_quantity ?? "nelimitat"}</span></p>
                        <p>Unitate: <span className="font-medium text-slate-900">{item.unit_label || "buc"}</span></p>
                      </div>
                    </div>
                  </label>
                )
              })
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="button" className="rounded-2xl" disabled={saving || loading} onClick={handleSaveLinks}>{saving ? "Se salvează..." : "Salvează legăturile"}</Button>
              <Button type="button" variant="outline" className="rounded-2xl" onClick={() => router.push("/merchant/catalog")}>Deschide catalogul</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function MarketLinkProductsPage() {
  return (
    <Suspense fallback={null}>
      <MarketLinkProductsPageInner />
    </Suspense>
  )
}
