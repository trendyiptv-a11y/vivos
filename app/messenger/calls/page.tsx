"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Phone,
  Video,
  ArrowLeft,
  Clock3,
  PhoneIncoming,
  PhoneMissed,
  RefreshCcw,
  PhoneOutgoing,
  PhoneOff,
  Filter,
} from "lucide-react"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"
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

type RawCallRow = {
  id: string
  conversation_id: string
  caller_id: string
  callee_id: string
  status: string
  call_type: string | null
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

type CallFilter = "all" | "audio" | "video" | "missed"

function displayName(profile: ProfileLite | null) {
  return profile?.alias?.trim() || profile?.name?.trim() || profile?.email?.split("@")[0] || "Membru"
}

function formatWhen(value: string) {
  const date = new Date(value)
  return {
    day: date.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
    }),
    time: date.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
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

function isMissedLike(call: CallRow, currentUserId: string | null) {
  if (!currentUserId) return false
  return call.status === "missed" || (call.status === "rejected" && call.callee_id === currentUserId)
}

function statusLabel(call: CallRow, currentUserId: string) {
  const isIncoming = call.callee_id === currentUserId
  if (call.status === "missed") return "Ratat"
  if (call.status === "rejected") return isIncoming ? "Respins" : "Anulat"
  if (call.status === "accepted") return "Acceptat"
  if (call.status === "ended") return "Încheiat"
  if (call.status === "ringing") return isIncoming ? "Sună acum" : "În apelare"
  return call.status
}

function statusBadgeClass(call: CallRow, currentUserId: string | null) {
  if (isMissedLike(call, currentUserId)) return "bg-rose-100 text-rose-900"
  if (call.status === "ended" || call.status === "accepted") return "bg-emerald-100 text-emerald-900"
  if (call.status === "ringing") return "bg-sky-100 text-sky-900"
  return "bg-slate-100 text-slate-700"
}

function directionLabel(call: CallRow, currentUserId: string | null) {
  return currentUserId === call.callee_id ? "Primit" : "Inițiat"
}

function directionIcon(call: CallRow, currentUserId: string | null) {
  const incoming = currentUserId === call.callee_id
  if (isMissedLike(call, currentUserId)) return <PhoneMissed className="h-4 w-4" />
  return incoming ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />
}

export default function MessengerCallsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [calls, setCalls] = useState<CallRow[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})
  const [error, setError] = useState<string>("")
  const [filter, setFilter] = useState<CallFilter>("all")

  async function loadCalls() {
    setLoading(true)
    setError("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      router.push("/messenger/login?redirect=/messenger/calls")
      return
    }

    setCurrentUserId(session.user.id)

    const { data, error: callsError } = await supabase
      .from("call_sessions")
      .select("id, conversation_id, caller_id, callee_id, status, call_type, created_at, answered_at, ended_at")
      .or(`caller_id.eq.${session.user.id},callee_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false })
      .limit(50)

    if (callsError) {
      setCalls([])
      setProfilesMap({})
      setError(callsError.message)
      setLoading(false)
      return
    }

    const loadedCalls: CallRow[] = ((data ?? []) as RawCallRow[]).map((item) => ({
      id: item.id,
      conversation_id: item.conversation_id,
      caller_id: item.caller_id,
      callee_id: item.callee_id,
      status: item.status,
      call_type: item.call_type === "video" ? "video" : "audio",
      created_at: item.created_at,
      answered_at: item.answered_at,
      ended_at: item.ended_at,
    }))
    setCalls(loadedCalls)

    const profileIds = Array.from(new Set(loadedCalls.flatMap((call) => [call.caller_id, call.callee_id]).filter(Boolean)))

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

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      if (filter === "audio") return call.call_type === "audio"
      if (filter === "video") return call.call_type === "video"
      if (filter === "missed") return isMissedLike(call, currentUserId)
      return true
    })
  }, [calls, filter, currentUserId])

  const stats = useMemo(() => {
    const todayKey = new Date().toDateString()
    const today = calls.filter((call) => new Date(call.created_at).toDateString() === todayKey).length
    const answered = calls.filter((call) => call.status === "ended" || call.status === "accepted").length
    const missed = calls.filter((call) => isMissedLike(call, currentUserId)).length
    return { today, answered, missed }
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
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/70" />
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.52)" }}>
              Istoric clar și rapid
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Astăzi</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.today}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Răspunse</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.answered}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Ratate</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.missed}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { key: "all", label: "Toate" },
              { key: "audio", label: "Audio" },
              { key: "video", label: "Video" },
              { key: "missed", label: "Ratat" },
            ].map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={filter === item.key ? "default" : "outline"}
                className="rounded-2xl"
                style={filter === item.key ? { background: vivosTheme.gradients.activeIcon, color: vivosTheme.colors.white, border: "none" } : undefined}
                onClick={() => setFilter(item.key as CallFilter)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock3 className="h-4 w-4 text-white/70" />
            <h2 className="text-lg font-semibold text-white">Istoric apeluri</h2>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Se încarcă istoricul apelurilor...</div>
          ) : filteredCalls.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Nu există apeluri pentru filtrul selectat.</div>
          ) : (
            filteredCalls.map((call) => {
              const otherUserId = currentUserId === call.caller_id ? call.callee_id : call.caller_id
              const otherProfile = profilesMap[otherUserId] || null
              const otherLabel = displayName(otherProfile)
              const duration = computeDuration(call)
              const when = formatWhen(call.created_at)

              return (
                <div key={call.id} className="rounded-3xl border bg-white p-4 shadow-sm" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 rounded-2xl">
                      <AvatarFallback className="rounded-2xl font-semibold text-white" style={{ background: getVivosAvatarGradient(otherProfile?.email || otherLabel) }}>
                        {otherLabel.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-slate-900">{otherLabel}</p>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(call, currentUserId)}`}>
                              {statusLabel(call, currentUserId || "")}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              {call.call_type === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                              {call.call_type === "video" ? "Video" : "Audio"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                              {directionIcon(call, currentUserId)}
                              {directionLabel(call, currentUserId)}
                            </span>
                            <span>{when.day} · {when.time}</span>
                            {duration ? <span>Durată {duration}</span> : null}
                          </div>
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
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
