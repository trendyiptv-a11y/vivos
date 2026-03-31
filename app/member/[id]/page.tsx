import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@supabase/supabase-js"

type MemberPageProps = {
  params: Promise<{ id: string }>
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseAnonKey)
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { id } = await params
  const supabase = getSupabaseServerClient()

  const { data: member, error } = await supabase
    .from("profiles")
    .select("id, email, name, alias, role, skills, offers_summary, needs_summary, created_at")
    .eq("id", id)
    .maybeSingle()

  if (error || !member) {
    notFound()
  }

  const displayName =
    member.name?.trim() ||
    member.alias?.trim() ||
    member.email?.split("@")[0] ||
    "Membru"

  const skillsList = member.skills
    ? member.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm text-slate-500">Profil membru</p>
          <h1 className="text-3xl font-semibold">{displayName}</h1>
          <p className="mt-1 text-sm text-slate-500">{member.email}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
