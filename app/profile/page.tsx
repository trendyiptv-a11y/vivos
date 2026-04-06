"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"

type ProfileRow = {
  id: string
  email: string
  name: string | null
  alias: string | null
  role: string | null
  skills: string | null
  offers_summary: string | null
  needs_summary: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [alias, setAlias] = useState("")
  const [role, setRole] = useState("member")
  const [skills, setSkills] = useState("")
  const [offersSummary, setOffersSummary] = useState("")
  const [needsSummary, setNeedsSummary] = useState("")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
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
      setEmail(session.user.email ?? "")

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, alias, role, skills, offers_summary, needs_summary")
        .eq("id", session.user.id)
        .maybeSingle()

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      const profile = data as ProfileRow | null

      if (profile) {
        setName(profile.name ?? "")
        setAlias(profile.alias ?? "")
        setRole(profile.role ?? "member")
        setSkills(profile.skills ?? "")
        setOffersSummary(profile.offers_summary ?? "")
        setNeedsSummary(profile.needs_summary ?? "")
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!userId) return

    setSaving(true)
    setMessage("")

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      name,
      alias,
      role,
      skills,
      offers_summary: offersSummary,
      needs_summary: needsSummary,
    })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage("Profil salvat.")
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMessage("")

    if (password.length < 6) {
      setPasswordMessage("Parola trebuie să aibă cel puțin 6 caractere.")
      return
    }

    if (password !== confirmPassword) {
      setPasswordMessage("Parolele nu coincid.")
      return
    }

    setPasswordSaving(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setPasswordMessage(error.message)
      setPasswordSaving(false)
      return
    }

    setPassword("")
    setConfirmPassword("")
    setPasswordMessage("Parola a fost schimbată cu succes.")
    setPasswordSaving(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-2xl rounded-3xl border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Se încarcă profilul...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Membru autentificat</p>
            <h1 className="text-3xl font-semibold">Profil VIVOS</h1>
          </div>

          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/")}>
            Înapoi în homepage
          </Button>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Actualizează profilul</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={email} readOnly className="rounded-2xl bg-slate-100" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol</label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="rounded-2xl"
                    placeholder="member"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nume</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Numele tău"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Alias</label>
                  <Input
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Alias comunitar"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Competențe</label>
                <textarea
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="ex: electrician, logistică, design, traduceri"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ce oferi</label>
                <textarea
                  value={offersSummary}
                  onChange={(e) => setOffersSummary(e.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Servicii, bunuri, timp, ajutor pe care îl poți oferi"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ce cauți</label>
                <textarea
                  value={needsSummary}
                  onChange={(e) => setNeedsSummary(e.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Sprijin, colaborări, resurse, nevoi curente"
                />
              </div>

              {message && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="rounded-2xl" disabled={saving}>
                  {saving ? "Se salvează..." : "Salvează profilul"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => router.push("/")}
                >
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Schimbă parola</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parolă nouă</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Introdu parola nouă"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmă parola</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Reintrodu parola"
                    required
                  />
                </div>
              </div>

              {passwordMessage && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  {passwordMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="rounded-2xl" disabled={passwordSaving}>
                  {passwordSaving ? "Se actualizează..." : "Actualizează parola"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
