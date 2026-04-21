"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type MemberRow = {
  id: string
  email: string
  name: string | null
  alias: string | null
  role: string | null
  skills: string | null
  offers_summary: string | null
  needs_summary: string | null
  created_at: string | null
}

export default function MemberPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<MemberRow | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadMember() {
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, alias, role, skills, offers_summary, needs_summary, created_at")
        .eq("id", memberId)
        .maybeSingle()

      if (error || !data) {
        setMessage("Membrul nu a fost găsit.")
        setLoading(false)
        return
      }

      setMember(data as MemberRow)
      setLoading(false)
    }

    if (memberId) {
      loadMember()
    }
  }, [memberId, router])

  if (loading) {
    return (
      <main
        className="min-h-screen p-6"
        style={{ background: vivosTheme.gradients.appBackground }}
      >
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Se încarcă profilul membrului...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (!member) {
    return (
      <main
        className="min-h-screen p-6"
        style={{ background: vivosTheme.gradients.appBackground }}
      >
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-slate-600">{message || "Membrul nu a fost găsit."}</p>
              <Button className="rounded-2xl" onClick={() => router.push("/")}>
                Înapoi
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const displayName =
    member.name?.trim() ||
    member.alias?.trim() ||
    member.email?.split("@")[0] ||
    "Membru"

  const skillsList = member.skills
    ? member.skills.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0)
    : []

  return (
    <main
      className="min-h-screen"
      style={{ background: vivosTheme.gradients.appBackground }}
    >
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)",
        }}
      >
        <div className="mx-auto flex min-h-[84px] max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase tracking-[0.22em] sm:text-xs"
              style={{ color: "rgba(255,255,255,0.68)" }}
            >
              Profil membru
            </p>
            <h1
              className="truncate text-lg font-semibold sm:text-2xl"
              style={{ color: vivosTheme.colors.white }}
            >
              {displayName}
            </h1>
            <p
              className="mt-1 truncate text-sm"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              {member.email}
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15"
            onClick={() => router.push("/")}
          >
            Înapoi la membri
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-6 pb-24 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Profil public intern</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium">Competențe</p>
                <div className="flex flex-wrap gap-2">
                  {(skillsList.length ? skillsList : ["fără competențe completate"]).map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="rounded-xl">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Ce oferă</p>
                <div className="rounded-2xl border bg-white p-4 text-sm text-slate-700">
                  {member.offers_summary?.trim() || "Necompletat"}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Ce caută</p>
                <div className="rounded-2xl border bg-white p-4 text-sm text-slate-700">
                  {member.needs_summary?.trim() || "Necompletat"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Detalii membru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Rol</p>
                <p className="mt-1 font-medium text-slate-900">{member.role || "member"}</p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Alias</p>
                <p className="mt-1 font-medium text-slate-900">{member.alias?.trim() || "Necompletat"}</p>
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Creat la</p>
                <p className="mt-1 font-medium text-slate-900">
                  {member.created_at ? new Date(member.created_at).toLocaleString("ro-RO") : "Necunoscut"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
