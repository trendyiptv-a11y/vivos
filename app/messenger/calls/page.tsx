"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Video, ArrowLeft, Clock3, PhoneIncoming, Radio, PhoneMissed, RefreshCcw } from "lucide-react"
import { vivosTheme } from "@/lib/theme/vivos-theme"
import { supabase } from "@/lib/supabase/client"

type CallRow = {
  id: string
  conversation_id: string
  caller_id: string
  callee_id: string
  status: string
  call_type: "audio" | "video"
  created_at: string
  answered_at: string | null
  ended_at: string | null
}

type ProfileLite = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
}

function displayName(profile: ProfileLite | null) {
  return profile?.alias?.trim() || profile?.name?.trim() || profile?.email?.split("@")[0] || "Membru"
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function computeDuration(call: CallRow) {
  if (!call.answered_at || !call.ended_at) return null
  const start = new Date(call.answered_at).getTime()
  const end = new Date(call.ended_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const totalSeconds = Math.round((end - start) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function statusLabel(call: CallRow, currentUserId: string) {
  const isIncoming = call.callee_id === currentUserId
  if (call.status === "missed") return "Ratată"
  if (call.status === "rejected") return isIncoming ? "Respinsă de tine" : "Respinsă"
  if (call.status === "accepted") return "Acceptată"
  if (call.status === "ended") return "Încheiată"
  if (call.status === "ringing") return isIncoming ? "Te apelează" : "În apelare"
  return call.status
}

export default function MessengerCallsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [calls, setCalls] = useState<CallRow[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})
  const [error, setError] = useState<string>("")

  async function loadCalls() {
    setLoading(true)
    setError("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.push("/login?redirect=/messenger/calls")
      return
    }

    setCurrentUserId(session.user.id)

    const { data, error: callsError } = await supabase
      .from("call_sessions")
      .select("id, conversation_id, caller_id, callee_id, status, call_type, created_at, answered_at, ended_at")
      .or(`caller_id.eq.${session.user.id},callee_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false })
      .limit(30)

    if (callsError) {
      setCalls([])
      setProfilesMap({})
      setError(callsError.message)
      setLoading(false)
      return
    }

    const loadedCalls = ((data ?? []) as CallRow[]).map((item) => ({
      ...item,
      call_type: item.call_type === "video" ? "video" : "audio",
    }))
    setCalls(loadedCalls)

    const profileIds = Array.from(
      new Set(
        loadedCalls.flatMap((call) => [call.caller_id, call.callee_id]).filter(Boolean)
      )
    )

    if (!profileIds.length) {
      setProfilesMap({})
      setLoading(false)
      return
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, alias, email")
      .in("id", profileIds)

    if (profilesError) {
      setError(profilesError.message)
      setProfilesMap({})
      setLoading(false)
      return
    }

    const nextProfilesMap = ((profilesData ?? []) as ProfileLite[]).reduce<Record<string, ProfileLite>>((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})

    setProfilesMap(nextProfilesMap)
    setLoading(false)
  }

  useEffect(() => {
    loadCalls()
    const channel = supabase
      .channel("messenger-calls-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_sessions" }, loadCalls)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const stats = useMemo(() => {
    const total = calls.length
    const missed = currentUserId
      ? calls.filter((call) => call.status === "missed" || (call.status === "rejected" && call.callee_id === currentUserId)).length
      : 0
    const video = calls.filter((call) => call.call_type === "video").length
    return { total, missed, video }
  }, [calls, currentUserId])

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
              <h1 className="text-lg font-semibold text-white">Apeluri</h1>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15"
            onClick={() => loadCalls()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reîncarcă
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <section
          className="rounded-[28px] border p-4"
          style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.10)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.52)" }}>
                Zonă dedicată
              </p>
              <h2 className="text-xl font-semibold text-white">Istoric real de apeluri între membri</h2>
              <p className="max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.62)" }}>
                Vezi apelurile recente și revino rapid în conversația relevantă, fără să cauți manual printre mesaje.
              </p>
            </div>
            <Button
              className="rounded-2xl border-0"
              style={{ background: vivosTheme.gradients.activeIcon, color: vivosTheme.colors.white }}
              onClick={() => router.push("/messenger")}
            >
              Înapoi la conversații
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Total</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.total}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Ratate / respinse</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.missed}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Video</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.video}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Phone className="h-5 w-5" />
                Apel audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                Istoricul audio îți arată clar cine a sunat, cine a răspuns și când merită să revii rapid.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Radio className="h-4 w-4" />
                  <span className="font-medium">Status actual</span>
                </div>
                <p className="mt-2">Apelurile sunt citite direct din call_sessions și actualizate live.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Video className="h-5 w-5" />
                Apel video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                Video-ul rămâne integrat în conversație, iar aici vezi traseul lui: pornit, acceptat, încheiat sau ratat.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <PhoneIncoming className="h-4 w-4" />
                  <span className="font-medium">Direcție următoare</span>
                </div>
                <p className="mt-2">Mai târziu putem adăuga reapelare directă și filtre audio/video.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock3 className="h-5 w-5" />
              Istoric apeluri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Se încarcă istoricul apelurilor...</div>
            ) : calls.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Nu există încă apeluri înregistrate pentru contul tău.</div>
            ) : (
              calls.map((call) => {
                const otherUserId = currentUserId === call.caller_id ? call.callee_id : call.caller_id
                const otherProfile = profilesMap[otherUserId] || null
                const otherLabel = displayName(otherProfile)
                const isIncoming = currentUserId === call.callee_id
                const duration = computeDuration(call)

                return (
                  <div key={call.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {call.call_type === "video" ? (
                            <Video className="h-4 w-4 text-slate-700" />
                          ) : (
                            <Phone className="h-4 w-4 text-slate-700" />
                          )}
                          <p className="font-medium text-slate-900">{otherLabel}</p>
                          {isIncoming ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900">Primit</span>
                          ) : (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-900">Inițiat</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatWhen(call.created_at)}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                          {statusLabel(call, currentUserId || "")}
                        </span>
                        {duration ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-900">
                            {duration}
                          </span>
                        ) : null}
                        {(call.status === "missed" || call.status === "rejected") ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900 flex items-center gap-1">
                            <PhoneMissed className="h-3 w-3" />
                            Atenție
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button className="rounded-2xl" onClick={() => router.push(`/messenger/${call.conversation_id}`)}>
                        Deschide conversația
                      </Button>
                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/messenger/${call.conversation_id}?autoCall=audio`)}>
                        <Phone className="mr-2 h-4 w-4" />
                        Reapelare audio
                      </Button>
                      <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/messenger/${call.conversation_id}?autoCall=video`)}>
                        <Video className="mr-2 h-4 w-4" />
                        Reapelare video
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
