"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { vivosTheme } from "@/lib/theme/vivos-theme"
import { useRouter } from "next/navigation"

export default function MessengerConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("Messenger conversation error:", error)
  }, [error])

  return (
    <main className="min-h-screen pb-28" style={{ background: vivosTheme.gradients.appBackground }}>
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl"
          style={{ background: "rgba(255,255,255,0.10)" }}
        >
          <AlertCircle className="h-7 w-7 text-white" />
        </div>

        <h1 className="text-xl font-semibold text-white">Conversația nu a putut fi deschisă</h1>
        <p className="mt-3 max-w-md text-sm" style={{ color: "rgba(255,255,255,0.68)" }}>
          A apărut o problemă temporară în VIVOS Messenger. Poți reîncerca sau reveni la lista de conversații.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button className="rounded-2xl" onClick={() => reset()}>
            Reîncearcă
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/messenger")}>
            Înapoi la mesaje
          </Button>
        </div>
      </div>
    </main>
  )
}
