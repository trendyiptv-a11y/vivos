import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"
import ServiceWorkerRegister from "./ServiceWorkerRegister"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import NativePushSetup from "@/components/NativePushSetup"

export const metadata: Metadata = {
  title: "VIVOS",
  description: "Platforma comunitară VIVOS",
  applicationName: "VIVOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VIVOS",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body className="bg-slate-50">
        <ServiceWorkerRegister />
        <NativePushSetup />
        <div className="pb-24 md:pb-0">{children}</div>
        <MobileBottomNav />
      </body>
    </html>
  )
}