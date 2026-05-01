import type { ReactNode } from "react"
import MessengerBottomNav from "@/components/messenger-bottom-nav"

export default function MessengerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
      <MessengerBottomNav />
    </div>
  )
}
