"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"

export default function NewMutualFundRequestPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [amountTalanti, setAmountTalanti] = useState("")
  const [urgency, setUrgency] = useState("medie")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

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
      window.location.href = "/"
    }, 800)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Cerere nouă — Fond mutual de sprijin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="rounded-2xl border p-3 text-sm text-slate-600">
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="rounded-2xl" disabled={saving}>
                  {saving ? "Se trimite..." : "Trimite cererea"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => router.push("/")}
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
