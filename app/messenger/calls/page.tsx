"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Video, ArrowLeft } from "lucide-react"
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

      <div className="mx-auto max-w-3xl px-4 py-5">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Spațiu dedicat pentru apeluri audio și video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              Ai deja nucleul tehnic de apel în conversațiile private. Acest ecran deschide acum zona separată
              VIVOS Messenger pentru apeluri, iar în pasul următor aici pot intra istoricul apelurilor,
              apeluri ratate și reluarea rapidă a unui contact.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">Apel audio</span>
                </div>
                <p>
                  Fluxul rămâne simplu: contact rapid, voce clară, fără zgomot inutil în interfață.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <Video className="h-4 w-4" />
                  <span className="font-medium">Apel video</span>
                </div>
                <p>
                  Zona video va putea primi în continuare preview local, cameră frontală/spate și reluare rapidă.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl" onClick={() => router.push("/messenger")}>
                Înapoi la conversații
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
