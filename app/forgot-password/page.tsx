"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
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

    setMessage(
      "Dacă adresa există în sistem, am trimis emailul pentru resetarea parolei."
    );
    setEmail("");
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold">Resetare parolă</h1>
        <p className="mb-6 text-sm text-white/70">
          Introdu emailul contului și vei primi un link pentru setarea unei parole noi.
        </p>

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@email.com"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none ring-0 placeholder:text-white/40 focus:border-white/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Se trimite..." : "Trimite link de reset"}
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
            Înapoi la autentificare
          </Link>
        </div>
      </div>
    </main>
  );
}
