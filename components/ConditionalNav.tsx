"use client"

import { usePathname } from "next/navigation"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import MessengerBottomNav from "@/components/messenger-bottom-nav"

export default function ConditionalNav() {
  const pathname = usePathname()
  if (pathname.startsWith("/messenger")) return <MessengerBottomNav />
  return <MobileBottomNav />
}
