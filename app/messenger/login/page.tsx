"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

function MessengerLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/messenger")
    router.refresh()
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ background: vivosTheme.gradients.appBackground }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-3xl shadow-lg"
          style={{ background: vivosTheme.gradients.activeIcon }}
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
            VIVOS
          </p>
          <h1 className="text-2xl font-bold text-white">Messenger</h1>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-xl"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
        }}
      >
        <h2 className="mb-6 text-center text-lg font-semibold text-white">
          Intră în cont
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nume@email.com"
              required
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              Parolă
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Parola ta"
              required
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
            />
          </div>

          {error && (
            <p className="rounded-2xl px-4 py-2 text-sm" style={{ background: "rgba(248,113,113,0.15)", color: "#fca5a5" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ background: vivosTheme.gradients.activeIcon }}
          >
            {loading ? "Se conectează..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Folosești același cont VIVOS
        </p>
      </div>
    </main>
  )
}

export default function MessengerLoginPage() {
  return (
    <Suspense fallback={null}>
      <MessengerLoginForm />
    </Suspense>
  )
}
