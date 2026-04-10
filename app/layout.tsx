import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"
import ServiceWorkerRegister from "./ServiceWorkerRegister"

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
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
