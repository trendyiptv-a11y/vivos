"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Home,
  MessageCircle,
  Package,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type NotificationCountRow = {
  event_type: string
  is_read: boolean
  user_id: string | null
}

type DeliveryRequestBadgeRow = {
  id: string
  created_by: string
  assigned_to: string | null
  status: "open" | "accepted" | "picked_up" | "delivered" | "completed" | "cancelled"
}

type DeliveryReviewBadgeRow = {
  delivery_request_id: string
  reviewer_id: string
  reviewed_user_id: string
}

const items = [
  { label: "Acasă", href: "/", tab: null, icon: Home, eventTypes: ["user_registered"] },
  { label: "Membri", href: "/", tab: "members", icon: Users, eventTypes: [] },
  { label: "Mesaje", href: "/messages", tab: null, icon: MessageCircle, eventTypes: ["new_message"] },
  { label: "Piață", href: "/market", tab: null, icon: ShoppingBag, eventTypes: ["market_post_created"] },
  {
    label: "Livrări",
    href: "/deliveries",
    tab: null,
    icon: Package,
    eventTypes: [
      "delivery_request_accepted",
      "delivery_picked_up",
      "delivery_delivered",
      "delivery_completed",
      "delivery_cancelled",
      "delivery_review_received",
    ],
  },
  { label: "Portofel", href: "/wallet", tab: null, icon: Wallet, eventTypes: [] },
]

function BadgeBubble({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0, opacity: 0, y: 2 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full px-1 py-0.5 text-center text-[9px] font-bold leading-none"
          style={{
            background: vivosTheme.colors.danger,
            color: vivosTheme.colors.white,
            boxShadow: vivosTheme.shadows.soft,
          }}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function MobileBottomNavInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get("tab")

  const [badges, setBadges] = useState<Record<string, number>>({})
  const [deliveryNeedsActionCount, setDeliveryNeedsActionCount] = useState(0)

  useEffect(() => {
    async function loadCounts() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setBadges({})
        setDeliveryNeedsActionCount(0)
        return
      }

      const userId = session.user.id

      const { data: notificationData, error: notificationError } = await supabase
        .from("notifications")
        .select("event_type, is_read, user_id")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq("is_read", false)

      if (notificationError) {
        setBadges({})
      } else {
        const rows = (notificationData ?? []) as NotificationCountRow[]
        const counts: Record<string, number> = {}

        rows.forEach((row) => {
          counts[row.event_type] = (counts[row.event_type] ?? 0) + 1
        })

        setBadges(counts)
      }

      const { data: deliveryData, error: deliveryError } = await supabase
        .from("delivery_requests")
        .select("id, created_by, assigned_to, status")
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .in("status", ["accepted", "picked_up", "delivered", "completed"])

      if (deliveryError) {
        setDeliveryNeedsActionCount(0)
        return
      }

      const deliveryRows = (deliveryData ?? []) as DeliveryRequestBadgeRow[]
      const actionKeys = new Set<string>()

      deliveryRows.forEach((row) => {
        if (row.assigned_to === userId && row.status === "accepted") {
          actionKeys.add(`pickup:${row.id}`)
        }

        if (row.assigned_to === userId && row.status === "picked_up") {
          actionKeys.add(`delivered:${row.id}`)
        }

        if (row.created_by === userId && row.status === "delivered") {
          actionKeys.add(`confirm:${row.id}`)
        }
      })

      const completedRows = deliveryRows.filter((row) => row.status === "completed")
      const completedIds = completedRows.map((row) => row.id)

      if (!completedIds.length) {
        setDeliveryNeedsActionCount(actionKeys.size)
        return
      }

      const { data: reviewData, error: reviewError } = await supabase
        .from("delivery_reviews")
        .select("delivery_request_id, reviewer_id, reviewed_user_id")
        .eq("reviewer_id", userId)
        .in("delivery_request_id", completedIds)

      const reviewRows = reviewError ? [] : ((reviewData ?? []) as DeliveryReviewBadgeRow[])

      completedRows.forEach((row) => {
        if (row.created_by === userId && row.assigned_to) {
          const alreadyReviewedCourier = reviewRows.some(
            (review) =>
              review.delivery_request_id === row.id &&
              review.reviewed_user_id === row.assigned_to
          )

          if (!alreadyReviewedCourier) {
            actionKeys.add(`review:${row.id}:creator`)
          }
        }

        if (row.assigned_to === userId) {
          const alreadyReviewedCreator = reviewRows.some(
            (review) =>
              review.delivery_request_id === row.id &&
              review.reviewed_user_id === row.created_by
          )

          if (!alreadyReviewedCreator) {
            actionKeys.add(`review:${row.id}:courier`)
          }
        }
      })

      setDeliveryNeedsActionCount(actionKeys.size)
    }

    const handleLocalNotificationChange = () => {
      loadCounts()
    }

    loadCounts()

    const notificationChannel = supabase
      .channel("nav-badge-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadCounts)
      .subscribe()

    const deliveryRequestsChannel = supabase
      .channel("nav-badge-delivery-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_requests" }, loadCounts)
      .subscribe()

    const deliveryReviewsChannel = supabase
      .channel("nav-badge-delivery-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_reviews" }, loadCounts)
      .subscribe()

    window.addEventListener("vivos:notifications-updated", handleLocalNotificationChange)

    return () => {
      window.removeEventListener("vivos:notifications-updated", handleLocalNotificationChange)
      supabase.removeChannel(notificationChannel)
      supabase.removeChannel(deliveryRequestsChannel)
      supabase.removeChannel(deliveryReviewsChannel)
    }
  }, [])

  const itemsWithBadges = useMemo(() => {
    return items.map((item) => {
      const notificationBadge = item.eventTypes.reduce((sum, et) => sum + (badges[et] ?? 0), 0)
      const deliveryActionBadge = item.href === "/deliveries" ? deliveryNeedsActionCount : 0

      return {
        ...item,
        badge: notificationBadge + deliveryActionBadge,
      }
    })
  }, [badges, deliveryNeedsActionCount])

  return (
    <nav
      className="vivos-mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-xl md:hidden"
      style={{
        background: vivosTheme.gradients.footerBackground,
        borderColor: vivosTheme.colors.borderSoft,
        boxShadow: vivosTheme.shadows.medium,
      }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 pb-safe">
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
              <AnimatePresence>
                {active && (
                  <motion.span
                    className="absolute inset-x-3 top-1.5 h-1 rounded-full"
                    style={{
                      background: vivosTheme.gradients.sendButton,
                      boxShadow: vivosTheme.shadows.buttonWarm,
                    }}
                    initial={{ opacity: 0, scaleX: 0.6 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.6 }}
                    transition={{ duration: 0.18 }}
                  />
                )}
              </AnimatePresence>

              <motion.span
                className="relative flex items-center justify-center rounded-2xl"
                animate={{
                  scale: active ? 1.08 : 1,
                  y: active ? -1 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  width: 38,
                  height: 38,
                  background: active ? vivosTheme.gradients.avatarPrimary : "transparent",
                  boxShadow: active ? vivosTheme.shadows.bubble : "none",
                }}
              >
                <Icon
                  className="h-5 w-5 transition-colors duration-200"
                  style={{
                    color: active ? vivosTheme.colors.white : vivosTheme.colors.textMuted,
                  }}
                  strokeWidth={active ? 2.4 : 1.9}
                />
                <BadgeBubble count={item.badge} />
              </motion.span>

              <span
                className="transition-colors duration-200"
                style={{
                  color: active ? vivosTheme.colors.white : vivosTheme.colors.textMuted,
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavInner />
    </Suspense>
  )
}
