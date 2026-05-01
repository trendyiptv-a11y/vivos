"use client"

import dynamic from "next/dynamic"
import { MessageCircle } from "lucide-react"
import { vivosTheme } from "@/lib/theme/vivos-theme"

const LegacyConversationPage = dynamic(() => import("@/app/messages/[id]/page"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen pb-28" style={{ background: vivosTheme.gradients.appBackground }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8,20,40,0.16)",
        }}
      >
        <div className="flex min-h-[72px] items-center gap-3 px-4 py-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ background: vivosTheme.gradients.activeIcon }}
          >
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
              VIVOS Messenger
            </p>
            <h1 className="text-lg font-semibold text-white">Conversație</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-16 text-sm" style={{ color: "rgba(255,255,255,0.58)" }}>
        Se deschide conversația…
      </div>
    </main>
  ),
})

export default function MessengerConversationCore() {
  return <LegacyConversationPage />
}
