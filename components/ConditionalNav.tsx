"use client"

import { usePathname } from "next/navigation"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import MessengerBottomNav from "@/components/messenger-bottom-nav"

export default function ConditionalNav() {
  const pathname = usePathname()

  if (pathname.startsWith("/messenger/login")) return null
  if (pathname.startsWith("/messenger/signup")) return null
  if (pathname.startsWith("/messenger/forgot-password")) return null
  if (pathname.startsWith("/messenger/") && pathname !== "/messenger" && !pathname.startsWith("/messenger/calls") && !pathname.startsWith("/messenger/profile") && !pathname.startsWith("/messenger/notifications") && !pathname.startsWith("/messenger/settings") && !pathname.startsWith("/messenger/about")) {
    return null
  }

  if (pathname.startsWith("/messenger")) return <MessengerBottomNav />

  return <MobileBottomNav />
}
