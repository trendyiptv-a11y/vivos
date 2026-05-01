"use client"

import { useRouter } from "next/navigation"
import { Bell, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { vivosTheme } from "@/lib/theme/vivos-theme"

export default function MessengerNotificationsPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header className="sticky top-0 z-10 border-b backdrop-blur-xl" style={{ background: vivosTheme.styles.bottomNav.background, borderColor: vivosTheme.styles.bottomNav.borderColor, boxShadow: "0 8px 24px rgba(8,20,40,0.16)" }}>
        <div className="mx-auto flex min-h-[72px] max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/messenger")} className="flex h-10 w-10 items-center justify-center rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)" }}>
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>VIVOS Messenger</p>
              <h1 className="text-lg font-semibold text-white">Notificări</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Bell className="h-5 w-5" />Flux notificări Messenger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>Aici rămân doar notificările legate de mesaje și apeluri din Messenger.</p>
            <Button className="rounded-2xl" onClick={() => router.push("/messenger")}>Înapoi la inbox</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
