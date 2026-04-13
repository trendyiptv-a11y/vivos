"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  HeartHandshake,
  Home,
  MessageCircle,
  ShoppingBag,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"

type NotificationCountRow = {
  event_type: string
  is_read: boolean
  user_id: string | null
}

const items = [
  { label: "Acasă", href: "/", tab: null, icon: Home, eventTypes: ["user_registered"] },
  { label: "Membri", href: "/", tab: "members", icon: Users, eventTypes: [] },
  { label: "Mesaje", href: "/messages", tab: null, icon: MessageCircle, eventTypes: ["new_message"] },
  { label: "Piață", href: "/market", tab: null, icon: ShoppingBag, eventTypes: ["market_post_created"] },
  { label: "Fond", href: "/fund/new", tab: null, icon: HeartHandshake, eventTypes: ["fund_request_created"] },
]

function BadgeBubble({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 py-0.5 text-center text-[9px] font-bold leading-none text-white shadow-sm"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab")

  const [badges, setBadges] = useState<Record<string, number>>({})

  useEffect(() => {
    async function loadCounts() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setBadges({}); return }

      const userId = session.user.id

      const { data, error } = await supabase
        .from("notifications")
        .select("event_type, is_read, user_id")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq("is_read", false)

      if (error) { setBadges({}); return }

      const rows = (data ?? []) as NotificationCountRow[]
      const counts: Record<string, number> = {}
      rows.forEach((row) => { counts[row.event_type] = (counts[row.event_type] ?? 0) + 1 })
      setBadges(counts)
    }

    loadCounts()

    const channel = supabase
      .channel("nav-badge-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadCounts)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const itemsWithBadges = useMemo(() => {
    return items.map((item) => ({
      ...item,
      badge: item.eventTypes.reduce((sum, et) => sum + (badges[et] ?? 0), 0),
    }))
  }, [badges])

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 pb-safe">
        {itemsWithBadges.map((item) => {
          const Icon = item.icon
          const active = item.tab
            ? pathname === "/" && currentTab === item.tab
            : item.href === "/"
            ? pathname === "/" && !currentTab
            : pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <button
              key={`${item.href}-${item.tab}`}
              onClick={() => router.push(item.tab ? `${item.href}?tab=${item.tab}` : item.href)}
              className="relative flex flex-col items-center justify-center gap-1 px-1 py-3 text-[10px] font-medium"
            >
              {/* Active indicator pill */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-slate-900"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <motion.span
                className="relative"
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    active ? "text-slate-900" : "text-slate-400"
                  }`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <BadgeBubble count={item.badge} />
              </motion.span>

              <span className={`transition-colors duration-200 ${active ? "text-slate-900" : "text-slate-400"}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
