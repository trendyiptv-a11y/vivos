"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  HeartHandshake,
  Home,
  MessageCircle,
  ShoppingBag,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type NotificationCountRow = {
  event_type: string
}

const items = [
  { label: "Acasă", href: "/", icon: Home },
  { label: "Membri", href: "/?tab=members", icon: Users },
  { label: "Mesaje", href: "/messages", icon: MessageCircle },
  { label: "Piață", href: "/market", icon: ShoppingBag },
  { label: "Fond", href: "/fund/new", icon: HeartHandshake },
]

function BadgeBubble({ count }: { count: number }) {
  if (count <= 0) return null

  const text = count > 99 ? "99+" : String(count)

  return (
    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-slate-900 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
      {text}
    </span>
  )
}

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    async function loadCounts() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setUnreadMessages(0)
        return
      }

      const currentUserId = session.user.id

      const { data, error } = await supabase
        .from("notifications")
        .select("event_type")
        .eq("user_id", currentUserId)
        .eq("is_read", false)

      if (error) {
        console.error("Unread notifications load error:", error)
        setUnreadMessages(0)
        return
      }

      const rows = (data ?? []) as NotificationCountRow[]
      setUnreadMessages(rows.filter((row) => row.event_type === "new_message").length)
    }

    loadCounts()

    const channel = supabase
      .channel("mobile-bottom-nav-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const itemsWithBadges = useMemo(() => {
    return items.map((item) => {
      if (item.href === "/messages") {
        return { ...item, badge: unreadMessages }
      }

      return { ...item, badge: 0 }
    })
  }, [unreadMessages])

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {itemsWithBadges.map((item) => {
          const Icon = item.icon

          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/?tab=members"
              ? pathname === "/"
              : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center gap-1 px-1 py-3 text-[11px] transition ${
                active ? "text-slate-900" : "text-slate-500"
              }`}
            >
              <span className="relative">
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                <BadgeBubble count={item.badge} />
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
