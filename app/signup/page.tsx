"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://vivos-land.vercel.app/login",
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage("Cererea a fost procesată. Dacă emailul este nou, verifică inbox-ul pentru confirmare. Dacă ai deja cont, folosește Login.")
    setLoading(false)
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: vivosTheme.gradients.appBackground }}
    >
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-4 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
              <img src="/icons/icon-192.png" alt="VIVOS" className="h-14 w-14 object-cover" />
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Platforma comunitară
          </p>
          <CardTitle className="mt-2 text-2xl">Creează cont VIVOS</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="nume@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Parolă</label>
              <Input
                type="password"
                placeholder="Alege o parolă"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl"
                required
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-2xl border-0"
              style={{
                background: vivosTheme.gradients.activeIcon,
                color: vivosTheme.colors.white,
                boxShadow: vivosTheme.shadows.bubble,
              }}
              disabled={loading}
            >
              {loading ? "Se creează..." : "Sign up"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => router.push("/login")}
            >
              Am deja cont
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
