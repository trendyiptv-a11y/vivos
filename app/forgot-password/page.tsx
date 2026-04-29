"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";

type AppLang = "ro" | "da" | "en";

const forgotTexts: Record<AppLang, Record<string, string>> = {
  ro: {
    title: "Resetare parolă",
    subtitle: "Introdu emailul contului și vei primi un link pentru setarea unei parole noi.",
    email: "Email",
    emailPlaceholder: "nume@email.com",
    loading: "Se trimite...",
    submit: "Trimite link de reset",
    success: "Dacă adresa există în sistem, am trimis emailul pentru resetarea parolei.",
    backToLogin: "Înapoi la autentificare",
  },
  da: {
    title: "Nulstil adgangskode",
    subtitle: "Indtast din e-mailadresse, og vi sender dig et link til at oprette en ny adgangskode.",
    email: "E-mail",
    emailPlaceholder: "navn@email.com",
    loading: "Sender...",
    submit: "Send nulstillingslink",
    success: "Hvis adressen findes i systemet, har vi sendt en e-mail til nulstilling af adgangskoden.",
    backToLogin: "Tilbage til login",
  },
  en: {
    title: "Reset password",
    subtitle: "Enter your account email and you'll receive a link to set a new password.",
    email: "Email",
    emailPlaceholder: "name@email.com",
    loading: "Sending...",
    submit: "Send reset link",
    success: "If the address exists in our system, we've sent a password reset email.",
    backToLogin: "Back to login",
  },
};

export default function ForgotPasswordPage() {
  const { language } = useI18n();
  const lang = (language === "da" || language === "en" ? language : "ro") as AppLang;
  const text = forgotTexts[lang];

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorText("");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setMessage(text.success);
    setEmail("");
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold">{text.title}</h1>
        <p className="mb-6 text-sm text-white/70">{text.subtitle}</p>

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              {text.email}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={text.emailPlaceholder}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none ring-0 placeholder:text-white/40 focus:border-white/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? text.loading : text.submit}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        ) : null}

        {errorText ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorText}
          </p>
        ) : null}

        <div className="mt-6 text-sm text-white/70">
          <Link href="/login" className="underline underline-offset-4">
            {text.backToLogin}
          </Link>
        </div>
      </div>
    </main>
  );
}
