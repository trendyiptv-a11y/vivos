"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"

type DeliveryStatus = "open" | "accepted" | "picked_up" | "delivered" | "completed" | "cancelled"

type DeliveryContext = {
  id: string
  title: string
  status: DeliveryStatus
}

function statusLabel(status: DeliveryStatus) {
  switch (status) {
    case "accepted":
      return "Acceptată"
    case "picked_up":
      return "Ridicată"
    case "delivered":
      return "Predată"
    case "completed":
      return "Finalizată"
    case "cancelled":
      return "Anulată"
    default:
      return "Deschisă"
  }
}

function DeliveryChatContextBannerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const deliveryId = searchParams.get("delivery")

  const [delivery, setDelivery] = useState<DeliveryContext | null>(null)
  const [visible, setVisible] = useState(true)

  const shouldShow = useMemo(() => {
    if (!pathname?.startsWith("/messages/")) return false
    if (!deliveryId) return false
    return true
  }, [pathname, deliveryId])

  useEffect(() => {
    setVisible(true)
  }, [deliveryId])

  useEffect(() => {
    async function loadDelivery() {
      if (!shouldShow || !deliveryId) {
        setDelivery(null)
        return
      }

      const { data, error } = await supabase
        .from("delivery_requests")
        .select("id, title, status")
        .eq("id", deliveryId)
        .maybeSingle()

      if (error || !data) {
        setDelivery(null)
        return
      }

      setDelivery(data as DeliveryContext)
    }

    loadDelivery()
  }, [shouldShow, deliveryId])

  if (!shouldShow || !visible || !delivery) return null

  return (
    <div className="fixed inset-x-0 top-[72px] z-40 px-3 md:px-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#173F72]/95 px-4 py-3 text-white shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">Context livrare</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium text-white">{delivery.title}</p>
              <Badge className="rounded-xl bg-white/12 text-white hover:bg-white/12">
                {statusLabel(delivery.status)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-2xl border-white/25 bg-white/10 text-white hover:bg-white/15"
              onClick={() => router.push(`/deliveries/${delivery.id}`)}
            >
              Vezi delivery
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-white/20 bg-transparent text-white/80 hover:bg-white/10"
              onClick={() => setVisible(false)}
            >
              Ascunde
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeliveryChatContextBanner() {
  return (
    <Suspense fallback={null}>
      <DeliveryChatContextBannerInner />
    </Suspense>
  )
}
