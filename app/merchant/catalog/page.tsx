"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

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
  created_at: string
  updated_at: string
}

type CsvDraftItem = {
  title: string
  description: string | null
  category: string | null
  price_talanti: number
  stock_quantity: number | null
  unit_label: string | null
  is_active: boolean
}

function parseBoolean(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase()
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "da"
}

function parseCsv(text: string): CsvDraftItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) return []

  const headers = lines[0].split(",").map((item) => item.trim())
  const idx = (name: string) => headers.indexOf(name)

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((item) => item.trim())
      return {
        title: cols[idx("title")] || "",
        description: cols[idx("description")] || null,
        category: cols[idx("category")] || null,
        price_talanti: Number(cols[idx("price_talanti")] || 0),
        stock_quantity: cols[idx("stock_quantity")] ? Number(cols[idx("stock_quantity")]) : null,
        unit_label: cols[idx("unit_label")] || "buc",
        is_active: parseBoolean(cols[idx("is_active")]),
      }
    })
    .filter((item) => item.title.trim().length > 0)
}

function templateCsv() {
  return [
    "title,description,category,price_talanti,stock_quantity,unit_label,is_active",
    "Filtru ulei,Mann pentru VW,piese auto,20,10,buc,true",
    "Antigel rosu,G12 1L,consumabile,15,25,buc,true",
    "Bec H7,12V 55W,electrice,5,40,buc,true",
  ].join("\n")
}

export default function MerchantCatalogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [busyDeleteItemId, setBusyDeleteItemId] = useState<string | null>(null)
  const [clearingCatalog, setClearingCatalog] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [priceTalanti, setPriceTalanti] = useState("")
  const [stockQuantity, setStockQuantity] = useState("")
  const [unitLabel, setUnitLabel] = useState("buc")
  const [isActive, setIsActive] = useState(true)

  const [csvText, setCsvText] = useState(templateCsv())
  const [csvItems, setCsvItems] = useState<CsvDraftItem[]>([])

  useEffect(() => {
    setCsvItems(parseCsv(csvText))
  }, [csvText])

  async function loadCatalog() {
    setLoading(true)
    setMessage("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.push("/login")
      return
    }

    setUserId(session.user.id)

    const [rolesResult, catalogResult] = await Promise.all([
      supabase.from("member_roles").select("role, is_active").eq("user_id", session.user.id).eq("role", "merchant").eq("is_active", true),
      supabase
        .from("merchant_catalog_items")
        .select("id, merchant_user_id, title, description, category, price_talanti, stock_quantity, unit_label, is_active, created_at, updated_at")
        .eq("merchant_user_id", session.user.id)
        .order("created_at", { ascending: false }),
    ])

    if (rolesResult.error) {
      setMessage(rolesResult.error.message)
      setLoading(false)
      return
    }

    if (!rolesResult.data?.length) {
      setMessage("Activează mai întâi rolul de Comerciant din Profil.")
      setLoading(false)
      return
    }

    if (catalogResult.error) {
      setMessage(catalogResult.error.message)
      setLoading(false)
      return
    }

    setItems((catalogResult.data ?? []) as CatalogItem[])
    setLoading(false)
  }

  useEffect(() => {
    loadCatalog()
  }, [router])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    const numericPrice = Number(priceTalanti || 0)
    const numericStock = stockQuantity.trim() ? Number(stockQuantity) : null

    if (!title.trim()) {
      setMessage("Titlul produsului este obligatoriu.")
      return
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setMessage("Prețul în talanți este invalid.")
      return
    }

    if (numericStock !== null && (!Number.isFinite(numericStock) || numericStock < 0)) {
      setMessage("Stocul este invalid.")
      return
    }

    setSaving(true)
    setMessage("")

    const { error } = await supabase.from("merchant_catalog_items").insert({
      merchant_user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      price_talanti: numericPrice,
      stock_quantity: numericStock,
      unit_label: unitLabel.trim() || "buc",
      is_active: isActive,
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setTitle("")
    setDescription("")
    setCategory("")
    setPriceTalanti("")
    setStockQuantity("")
    setUnitLabel("buc")
    setIsActive(true)
    await loadCatalog()
    setMessage("Produsul a fost adăugat în catalog.")
    setSaving(false)
  }

  async function handleImportCsv() {
    if (!userId) return
    if (!csvItems.length) {
      setMessage("Nu există produse valide în CSV.")
      return
    }

    setSaving(true)
    setMessage("")

    const payload = csvItems.map((item) => ({
      merchant_user_id: userId,
      title: item.title.trim(),
      description: item.description?.trim() || null,
      category: item.category?.trim() || null,
      price_talanti: Number(item.price_talanti || 0),
      stock_quantity: item.stock_quantity,
      unit_label: item.unit_label?.trim() || "buc",
      is_active: item.is_active,
    }))

    const { error } = await supabase.from("merchant_catalog_items").insert(payload)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    await loadCatalog()
    setMessage(`Import reușit: ${payload.length} produse adăugate.`)
    setSaving(false)
  }

  async function toggleItemActive(item: CatalogItem) {
    const { error } = await supabase
      .from("merchant_catalog_items")
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq("id", item.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_active: !row.is_active } : row)))
  }

  async function handleDeleteItem(item: CatalogItem) {
    const confirmed = window.confirm(`Sigur vrei să ștergi produsul „${item.title}” din catalog?`)
    if (!confirmed) return

    try {
      setBusyDeleteItemId(item.id)
      setMessage("")

      const { error } = await supabase.from("merchant_catalog_items").delete().eq("id", item.id)

      if (error) {
        setMessage(error.message)
        return
      }

      setItems((prev) => prev.filter((row) => row.id !== item.id))
      setMessage("Produsul a fost șters din catalog.")
    } catch (error: any) {
      setMessage(error?.message || "Produsul nu a putut fi șters.")
    } finally {
      setBusyDeleteItemId(null)
    }
  }

  async function handleClearCatalog() {
    if (!userId || !items.length) return

    const confirmed = window.confirm("Sigur vrei să golești tot catalogul? Acțiunea va șterge toate produsele tale din catalog.")
    if (!confirmed) return

    const confirmedAgain = window.confirm("Confirmi definitiv golirea completă a catalogului?")
    if (!confirmedAgain) return

    try {
      setClearingCatalog(true)
      setMessage("")

      const { error } = await supabase.from("merchant_catalog_items").delete().eq("merchant_user_id", userId)

      if (error) {
        setMessage(error.message)
        setClearingCatalog(false)
        return
      }

      setItems([])
      setMessage("Catalogul a fost golit.")
    } catch (error: any) {
      setMessage(error?.message || "Catalogul nu a putut fi golit.")
    } finally {
      setClearingCatalog(false)
    }
  }

  const activeCount = useMemo(() => items.filter((item) => item.is_active).length, [items])

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header className="sticky top-0 z-10 border-b backdrop-blur-xl" style={{ background: vivosTheme.styles.bottomNav.background, borderColor: vivosTheme.styles.bottomNav.borderColor, boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)" }}>
        <div className="mx-auto flex min-h-[84px] max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>Merchant hub</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>Catalog produse</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/profile")}>Profil</Button>
            <Button variant="outline" className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push("/market")}>Piață</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Produse totale</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{items.length}</p></CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Produse active</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{activeCount}</p></CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Preview import</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{csvItems.length}</p></CardContent>
          </Card>
        </div>

        {message ? <div className="rounded-2xl border bg-white p-4 text-sm text-slate-700">{message}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] pb-24">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader><CardTitle className="text-xl">Adaugă produs</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titlu</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl" placeholder="Ex: Filtru ulei" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descriere</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300" placeholder="Detalii produs" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categorie</label>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl" placeholder="Ex: piese auto" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preț în talanți</label>
                    <Input type="number" min="0" step="0.01" value={priceTalanti} onChange={(e) => setPriceTalanti(e.target.value)} className="rounded-2xl" placeholder="Ex: 20" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stoc</label>
                    <Input type="number" min="0" step="1" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="rounded-2xl" placeholder="Ex: 10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unitate</label>
                    <Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} className="rounded-2xl" placeholder="buc" />
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border p-4">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  <span className="text-sm text-slate-700">Produs activ</span>
                </label>
                <Button type="submit" className="rounded-2xl" disabled={saving || loading}>{saving ? "Se salvează..." : "Adaugă produs"}</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader><CardTitle className="text-xl">Import CSV</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">Lipește CSV în formatul template-ului și importă produsele în catalog.</p>
                <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} className="min-h-48 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-slate-300" />
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Preview import</p>
                  <p className="mt-1">Produse detectate: {csvItems.length}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" className="rounded-2xl" disabled={saving || !csvItems.length} onClick={handleImportCsv}>{saving ? "Se importă..." : "Importă produse"}</Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setCsvText(templateCsv())}>Resetează template</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-xl">Produsele mele</CardTitle>
                <Button type="button" variant="outline" className="rounded-2xl border-red-200 text-red-700 hover:bg-red-50" disabled={!items.length || clearingCatalog} onClick={handleClearCatalog}>
                  {clearingCatalog ? "Se golește..." : "Golește catalogul"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă produsele...</div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu ai încă produse în catalog.</div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-xl">{item.category || "General"}</Badge>
                        <Badge className={`rounded-xl ${item.is_active ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : "bg-slate-200 text-slate-700 hover:bg-slate-200"}`}>{item.is_active ? "Activ" : "Inactiv"}</Badge>
                      </div>
                      <p className="text-lg font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.description?.trim() || "Fără descriere"}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                        <p>Preț: <span className="font-medium text-slate-900">{Number(item.price_talanti).toFixed(2)} talanți</span></p>
                        <p>Stoc: <span className="font-medium text-slate-900">{item.stock_quantity ?? "nelimitat"}</span></p>
                        <p>Unitate: <span className="font-medium text-slate-900">{item.unit_label || "buc"}</span></p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => toggleItemActive(item)}>
                          {item.is_active ? "Dezactivează" : "Activează"}
                        </Button>
                        <Button type="button" variant="outline" className="rounded-2xl border-red-200 text-red-700 hover:bg-red-50" disabled={busyDeleteItemId === item.id} onClick={() => handleDeleteItem(item)}>
                          {busyDeleteItemId === item.id ? "Se șterge..." : "Șterge"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
