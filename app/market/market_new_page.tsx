"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"

export default function MarketNewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const [postType, setPostType] = useState("offer")
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [valueText, setValueText] = useState("")
  const [location, setLocation] = useState("")

  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setUserId(session.user.id)
      setLoading(false)
    }

    loadUser()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!userId) return

    setSaving(true)
    setMessage("")

    const { error } = await supabase.from("market_posts").insert({
      author_id: userId,
      post_type: postType,
      title,
      category,
      description,
      value_text: valueText,
      location,
      status: "active",
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    router.push("/market")
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-2xl rounded-3xl border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Se pregătește formularul...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Piață comunitară</p>
            <h1 className="text-3xl font-semibold">Publică ofertă sau cerere</h1>
          </div>

          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/market")}>
            Înapoi la piață
          </Button>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Postare nouă</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tip postare</label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  >
                    <option value="offer">Ofertă</option>
                    <option value="request">Cerere</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Categorie</label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Servicii, bunuri, digital..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Titlu</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-2xl"
                  placeholder="Ex: Reparații electrice ușoare"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valoare</label>
                  <Input
                    value={valueText}
                    onChange={(e) => setValueText(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Ex: 120 talanți"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Locație</label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Ex: Copenhaga"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descriere</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Descrie oferta sau cererea..."
                />
              </div>

              {message && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="rounded-2xl" disabled={saving}>
                  {saving ? "Se publică..." : "Publică"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => router.push("/market")}
                >
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
