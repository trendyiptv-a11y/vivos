"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Video, ArrowLeft, Clock3, PhoneIncoming, Radio } from "lucide-react"
import { vivosTheme } from "@/lib/theme/vivos-theme"

export default function MessengerCallsPage() {
  const router = useRouter()

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
              <h2 className="text-xl font-semibold text-white">Voce și video, separat de fluxul de piață</h2>
              <p className="max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.62)" }}>
                Aici construim spațiul curat pentru apeluri rapide între membri: simplu, uman și fără interfață încărcată inutil.
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
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Audio</p>
              <p className="mt-1 text-2xl font-semibold text-white">1:1</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Video</p>
              <p className="mt-1 text-2xl font-semibold text-white">Live</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>Etapă</p>
              <p className="mt-1 text-2xl font-semibold text-white">Beta</p>
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
                Flux rapid pentru coordonare directă: voce clară, acces rapid și fără pași inutili.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Radio className="h-4 w-4" />
                  <span className="font-medium">Status actual</span>
                </div>
                <p className="mt-2">Nucleul tehnic există deja în conversațiile private și este pregătit pentru istoricul de apeluri.</p>
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
                Cameră frontală sau spate, preview local și control simplu pentru contact vizual între membri.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <PhoneIncoming className="h-4 w-4" />
                  <span className="font-medium">Direcție următoare</span>
                </div>
                <p className="mt-2">Istoric de apeluri, apeluri ratate și reluare rapidă a unei conexiuni recente.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock3 className="h-5 w-5" />
              Ce urmează aici
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Istoric apeluri</p>
                <p className="mt-2">Listă clară cu ultimele apeluri audio și video dintre membri.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Apeluri ratate</p>
                <p className="mt-2">Semnal clar pentru contactele la care merită revenit rapid.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Reluare rapidă</p>
                <p className="mt-2">Buton direct către conversația relevantă sau către reapelare.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
