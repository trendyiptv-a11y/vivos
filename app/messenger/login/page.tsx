"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"
import { useI18n } from "@/lib/i18n/provider"

type AppLang = "ro" | "da" | "en"

const loginTexts: Record<AppLang, Record<string, string>> = {
  ro: {
    platform: "Messenger VIVOS",
    title: "Intră în Messenger",
    email: "Email",
    password: "Parolă",
    emailPlaceholder: "nume@email.com",
    passwordPlaceholder: "Parola ta",
    forgotPassword: "Ai uitat parola?",
    login: "Login",
    createAccount: "Creează cont",
    loading: "Se conectează...",
    success: "Autentificare reușită.",
  },
  da: {
    platform: "Messenger VIVOS",
    title: "Log ind i Messenger",
    email: "E-mail",
    password: "Adgangskode",
    emailPlaceholder: "navn@email.com",
    passwordPlaceholder: "Din adgangskode",
    forgotPassword: "Glemt adgangskoden?",
    login: "Log ind",
    createAccount: "Opret konto",
    loading: "Logger ind...",
    success: "Login gennemført.",
  },
  en: {
    platform: "Messenger VIVOS",
    title: "Log in to Messenger",
    email: "Email",
    password: "Password",
    emailPlaceholder: "name@email.com",
    passwordPlaceholder: "Your password",
    forgotPassword: "Forgot password?",
    login: "Log in",
    createAccount: "Create account",
    loading: "Signing in...",
    success: "Login successful.",
  },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/messenger"
  const { language } = useI18n()
  const lang = (language === "da" || language === "en" ? language : "ro") as AppLang
  const text = loginTexts[lang]

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const selectors = [".messenger-bottom-nav", ".vivos-mobile-bottom-nav"]
    const previous: Array<{ el: HTMLElement; display: string }> = []

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const el = node as HTMLElement
        previous.push({ el, display: el.style.display })
        el.style.display = "none"
      })
    })

    return () => {
      previous.forEach(({ el, display }) => {
        el.style.display = display
      })
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage(text.success)
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6" style={{ background: vivosTheme.gradients.appBackground }}>
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-4 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
              <img src="/icons/icon-192.png" alt="Messenger VIVOS" className="h-14 w-14 object-cover" />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{text.platform}</p>
          <CardTitle className="mt-2 text-2xl">{text.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{text.email}</label>
              <Input type="email" placeholder={text.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{text.password}</label>
              <Input type="password" placeholder={text.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-2xl" required />
            </div>
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-700">{text.forgotPassword}</Link>
            </div>
            {message && <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">{message}</div>}
            <Button type="submit" className="w-full rounded-2xl border-0" style={{ background: vivosTheme.gradients.activeIcon, color: vivosTheme.colors.white, boxShadow: vivosTheme.shadows.bubble }} disabled={loading}>
              {loading ? text.loading : text.login}
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-2xl" onClick={() => router.push("/messenger/signup")}>
              {text.createAccount}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

export default function MessengerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
