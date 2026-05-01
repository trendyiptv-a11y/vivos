"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, UserRound, Mail, AtSign, LogOut } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"

type ProfileRow = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
}

export default function MessengerProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [alias, setAlias] = useState("")

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/messenger/login?redirect=/messenger/profile")
        return
      }

      setUserId(session.user.id)
      setEmail(session.user.email ?? "")

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, alias, email")
        .eq("id", session.user.id)
        .maybeSingle()

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      const profile = data as ProfileRow | null
      setName(profile?.name ?? "")
      setAlias(profile?.alias ?? "")
      setEmail(profile?.email ?? session.user.email ?? "")
      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setMessage("")

    const payload = {
      id: userId,
      email: email || null,
      name: name.trim() || null,
      alias: alias.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage("Profilul Messenger a fost actualizat.")
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/messenger/login")
  }

  const avatarSeed = email || name || alias || "VI"

  return (
    <main className="min-h-screen pb-28" style={{ background: vivosTheme.gradients.appBackground }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8,20,40,0.16)",
        }}
      >
        <div className="mx-auto flex min-h-[72px] max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/messenger")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)" }}
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
                VIVOS Messenger
              </p>
              <h1 className="text-lg font-semibold text-white">Profil Messenger</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <section
          className="rounded-[28px] border p-4"
          style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.10)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-3xl border border-white/15">
                <AvatarFallback
                  className="rounded-3xl text-lg font-semibold text-white"
                  style={{ background: getVivosAvatarGradient(avatarSeed) }}
                >
                  {avatarSeed.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.52)" }}>
                  Spațiu independent
                </p>
                <h2 className="text-xl font-semibold text-white">Identitate Messenger</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.62)" }}>
                  Aici rămân doar datele de bază pentru conversații și apeluri, fără interfața platformei mari.
                </p>
              </div>
            </div>
            <Button variant="outline" className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </section>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Actualizează profilul Messenger</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Se încarcă profilul...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4" />Email</label>
                  <Input value={email} disabled className="rounded-2xl bg-slate-100" />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium"><UserRound className="h-4 w-4" />Nume</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Numele tău în Messenger" className="rounded-2xl" />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium"><AtSign className="h-4 w-4" />Alias</label>
                  <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Alias scurt" className="rounded-2xl" />
                </div>

                {message ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{message}</div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" className="rounded-2xl" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Se salvează..." : "Salvează"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={() => router.push("/messenger")}>Înapoi la Messenger</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
