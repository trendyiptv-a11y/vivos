"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"
import { useI18n } from "@/lib/i18n/provider"

type AppLang = "ro" | "da" | "en"

const signupTexts: Record<AppLang, Record<string, string>> = {
  ro: {
    platform: "VIVOS Messenger",
    title: "Creează cont Messenger",
    email: "Email",
    emailPlaceholder: "nume@email.com",
    password: "Parolă",
    passwordPlaceholder: "Alege o parolă",
    loading: "Se creează...",
    submit: "Sign up",
    alreadyHaveAccount: "Am deja cont",
    success: "Cererea a fost procesată. Dacă emailul este nou, verifică inbox-ul pentru confirmare. Dacă ai deja cont, folosește Login.",
  },
  da: {
    platform: "VIVOS Messenger",
    title: "Opret Messenger-konto",
    email: "E-mail",
    emailPlaceholder: "navn@email.com",
    password: "Adgangskode",
    passwordPlaceholder: "Vælg en adgangskode",
    loading: "Opretter...",
    submit: "Tilmeld",
    alreadyHaveAccount: "Jeg har allerede en konto",
    success: "Anmodningen er behandlet. Hvis e-mailen er ny, skal du tjekke din indbakke for bekræftelse. Hvis du allerede har en konto, brug Login.",
  },
  en: {
    platform: "VIVOS Messenger",
    title: "Create Messenger account",
    email: "Email",
    emailPlaceholder: "name@email.com",
    password: "Password",
    passwordPlaceholder: "Choose a password",
    loading: "Creating...",
    submit: "Sign up",
    alreadyHaveAccount: "I already have an account",
    success: "Request processed. If the email is new, check your inbox for confirmation. If you already have an account, use Login.",
  },
}

export default function MessengerSignupPage() {
  const router = useRouter()
  const { language } = useI18n()
  const lang = (language === "da" || language === "en" ? language : "ro") as AppLang
  const text = signupTexts[lang]

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
        emailRedirectTo: "https://vivos-land.vercel.app/messenger/login",
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage(text.success)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6" style={{ background: vivosTheme.gradients.appBackground }}>
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-4 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
              <img src="/icons/icon-192.png" alt="VIVOS Messenger" className="h-14 w-14 object-cover" />
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{text.platform}</p>
          <CardTitle className="mt-2 text-2xl">{text.title}</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{text.email}</label>
              <Input
                type="email"
                placeholder={text.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{text.password}</label>
              <Input
                type="password"
                placeholder={text.passwordPlaceholder}
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
              {loading ? text.loading : text.submit}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => router.push("/messenger/login")}
            >
              {text.alreadyHaveAccount}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
