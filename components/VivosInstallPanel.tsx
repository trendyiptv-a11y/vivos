"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Monitor, Share2, Smartphone, CheckCircle2 } from "lucide-react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export default function VivosInstallPanel() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  const userAgent =
    typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : ""

  const isAndroid = useMemo(() => /android/.test(userAgent), [userAgent])
  const isIOS = useMemo(() => /iphone|ipad|ipod/.test(userAgent), [userAgent])
  const isDesktop = useMemo(() => !isAndroid && !isIOS, [isAndroid, isIOS])

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const updateInstalledState = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true

      setIsInstalled(Boolean(standalone))
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", updateInstalledState)

    updateInstalledState()

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", updateInstalledState)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const handleDownloadApk = () => {
    window.location.href = "/downloads/app-release-signed.apk"
  }

  const androidAction = async () => {
    if (!isAndroid) return

    if (deferredPrompt) {
      await handleInstall()
      return
    }

    handleDownloadApk()
  }

  const iosAction = () => {
    if (!isIOS) return
    alert('Pe iPhone: deschide în Safari → Share → Add to Home Screen')
  }

  const desktopAction = async () => {
    if (!isDesktop || !deferredPrompt) return
    await handleInstall()
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(23,63,116,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_30%)]" />

      <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 backdrop-blur">
            <Smartphone className="h-3.5 w-3.5" />
            Aplicație VIVOS
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Instalează VIVOS pe dispozitivul tău
            </h2>
            <p className="max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Acces mai rapid, experiență mai fluidă și deschidere directă din ecranul principal.
              Pe Android poți instala PWA-ul sau descărca APK-ul semnat.
            </p>
          </div>

          {isInstalled ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">VIVOS este deja instalată</p>
                <p className="mt-1 text-sm text-emerald-700">
                  Poți deschide aplicația direct din ecranul principal al dispozitivului.
                </p>
              </div>
            </div>
          ) : (
            <>
              {isAndroid && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {deferredPrompt && (
                    <button
                      onClick={handleInstall}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-95"
                    >
                      <Smartphone className="h-4 w-4" />
                      Instalează aplicația
                    </button>
                  )}

                  <a
                    href="/downloads/app-release-signed.apk"
                    download
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Descarcă APK
                  </a>
                </div>
              )}

              {isDesktop && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {deferredPrompt ? (
                    <button
                      onClick={handleInstall}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-95"
                    >
                      <Monitor className="h-4 w-4" />
                      Instalează pe desktop
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Browserul tău nu afișează acum promptul de instalare. Verifică opțiunea
                      „Install app” din bara de adrese sau din meniul browserului.
                    </div>
                  )}
                </div>
              )}

              {isIOS && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-900">
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Instalare pe iPhone / iPad</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    Deschide VIVOS în Safari, apasă pe <strong>Share</strong>, apoi alege{" "}
                    <strong>Add to Home Screen</strong>. APK-ul nu poate fi instalat pe iOS.
                  </p>
                </div>
              )}

              {!deferredPrompt && isAndroid && (
                <p className="text-xs text-slate-500">
                  Dacă butonul de instalare nu apare, deschide meniul browserului și alege
                  „Install app” sau „Add to Home screen”.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-stretch">
          <div className="flex w-full flex-col justify-between rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-white shadow-inner">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                VIVOS Access
              </div>

              <h3 className="text-xl font-semibold">Acces rapid. Instalare simplă.</h3>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Alege metoda potrivită pentru dispozitivul tău și păstrează VIVOS la un singur tap distanță.
              </p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-white/80">
              <button
                type="button"
                onClick={androidAction}
                className={`block w-full rounded-2xl px-4 py-3 text-left transition ${
                  isAndroid ? "bg-white/5 hover:bg-white/10" : "cursor-not-allowed bg-white/5 opacity-50"
                }`}
              >
                Android: PWA sau APK semnat
              </button>

              <button
                type="button"
                onClick={iosAction}
                className={`block w-full rounded-2xl px-4 py-3 text-left transition ${
                  isIOS ? "bg-white/5 hover:bg-white/10" : "cursor-not-allowed bg-white/5 opacity-50"
                }`}
              >
                iPhone: Add to Home Screen
              </button>

              <button
                type="button"
                onClick={desktopAction}
                className={`block w-full rounded-2xl px-4 py-3 text-left transition ${
                  isDesktop ? "bg-white/5 hover:bg-white/10" : "cursor-not-allowed bg-white/5 opacity-50"
                }`}
              >
                Desktop: instalare direct din browser
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
