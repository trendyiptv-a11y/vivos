"use client"

import { usePathname, useRouter } from "next/navigation"
import { MessageCircle, Phone, User } from "lucide-react"
import { vivosTheme } from "@/lib/theme/vivos-theme"

const items = [
  { label: "Mesaje", href: "/messenger", icon: MessageCircle },
  { label: "Apeluri", href: "/messenger/calls", icon: Phone },
  { label: "Profil", href: "/profile", icon: User },
] as const

export default function MessengerBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav
      className="messenger-bottom-nav fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t px-2 pb-safe"
      style={{
        background: vivosTheme.styles.bottomNav.background,
        borderColor: vivosTheme.styles.bottomNav.borderColor,
        boxShadow: "0 -4px 24px rgba(8,20,40,0.22)",
        minHeight: 64,
      }}
    >
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/messenger" && pathname.startsWith(href))
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-opacity"
            style={{ opacity: isActive ? 1 : 0.55 }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-2xl"
              style={{
                background: isActive ? vivosTheme.gradients.activeIcon : "transparent",
                boxShadow: isActive ? vivosTheme.shadows.bubble : undefined,
              }}
            >
              <Icon
                className="h-5 w-5"
                style={{ color: vivosTheme.colors.white }}
              />
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: vivosTheme.colors.white }}
            >
              {label}
            </span>
          </button>
        )}
      )}
    </nav>
  )
}
