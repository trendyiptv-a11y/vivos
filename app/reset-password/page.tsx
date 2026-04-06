"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      setChecking(true);
      setErrorText("");

      const hash = window.location.hash;
      const hasRecoveryTokens =
        hash.includes("access_token=") ||
        hash.includes("type=recovery") ||
        hash.includes("refresh_token=");

      if (!hasRecoveryTokens) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
        } else {
          setReady(false);
          setErrorText("Link invalid, incomplet sau expirat.");
        }
        setChecking(false);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          setChecking(false);
          return;
        }

        setReady(false);
        setErrorText("Nu am putut valida linkul de resetare.");
        setChecking(false);
        return;
      }

      setReady(true);
      setChecking(false);
    };

    init();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setErrorText("");

    if (password.length < 6) {
      setErrorText("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorText("Parolele nu coincid.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setMessage("Parola a fost actualizată cu succes. Te poți autentifica.");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold">Setează parola nouă</h1>
        <p className="mb-6 text-sm text-white/70">
          Alege o parolă nouă pentru contul tău.
        </p>

        {checking ? (
          <p className="text-sm text-white/70">Se verifică linkul...</p>
        ) : !ready ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorText || "Link invalid sau expirat."}
            </p>
            <Link href="/forgot-password" className="text-sm underline underline-offset-4">
              Cere un link nou
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium">
                  Parolă nouă
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/40 focus:border-white/30"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
                  Confirmă parola
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/40 focus:border-white/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Se salvează..." : "Salvează parola"}
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
                Mergi la autentificare
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
