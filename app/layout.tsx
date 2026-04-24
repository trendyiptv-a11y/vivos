import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"
import ServiceWorkerRegister from "./ServiceWorkerRegister"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import NativePushSetup from "@/components/NativePushSetup"
import WebPushSetup from "@/components/WebPushSetup"
import InAppPushBanner from "@/components/InAppPushBanner"
import NativeRuntimeBridge from "@/components/NativeRuntimeBridge"
import NativeHapticsBridge from "@/components/NativeHapticsBridge"
import GlobalPresence from "@/components/GlobalPresence"
import DeliveryChatContextBanner from "@/components/DeliveryChatContextBanner"
import { vivosTheme } from "@/lib/theme/vivos-theme"

export const metadata: Metadata = {
  title: "VIVOS",
  description: "Platforma comunitară VIVOS",
  applicationName: "VIVOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VIVOS",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#173F72",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro" style={{ background: vivosTheme.colors.bgPrimary }}>
      <body
        className="min-h-screen overflow-x-hidden text-white antialiased"
        style={{
          background: vivosTheme.gradients.appBackground,
          color: vivosTheme.colors.textPrimary,
        }}
      >
        <ServiceWorkerRegister />
        <GlobalPresence />
        <NativeRuntimeBridge />
        <NativePushSetup />
        <WebPushSetup />
        <NativeHapticsBridge />
        <InAppPushBanner />
        <DeliveryChatContextBanner />

        <div className="relative min-h-screen pb-24 md:pb-0">
          {children}
        </div>

        <MobileBottomNav />
      </body>
    </html>
  )
}
