"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage("Autentificare reușită.")
    router.push("/")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Intră în VIVOS</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="Parola ta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl"
                required
              />
            </div>

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700"
              >
                Ai uitat parola?
              </Link>
            </div>

            {message && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                {message}
              </div>
            )}

            <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
              {loading ? "Se conectează..." : "Login"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => router.push("/signup")}
            >
              Creează cont
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
