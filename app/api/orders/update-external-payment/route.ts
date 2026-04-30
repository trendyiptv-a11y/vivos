import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type UpdateExternalPaymentBody = {
  orderId?: string
  nextExternalPaymentStatus?: "pending" | "sent" | "confirmed" | "disputed" | "cancelled"
}

type ExternalPaymentStatus = "pending" | "sent" | "confirmed" | "disputed" | "cancelled"

type OrderRow = {
  id: string
  buyer_user_id: string
  merchant_user_id: string
  title: string
  status: string
  payment_status: "unpaid" | "held" | "paid" | "refunded" | "cancelled"
  external_payment_method: string | null
  external_payment_status: ExternalPaymentStatus
}

const VALID_EXTERNAL_STATUSES: ExternalPaymentStatus[] = ["pending", "sent", "confirmed", "disputed", "cancelled"]

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Lipsesc variabilele NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY.")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice("Bearer ".length)
}

function canTransition(actorId: string, order: OrderRow, nextStatus: ExternalPaymentStatus) {
  const isBuyer = actorId === order.buyer_user_id
  const isMerchant = actorId === order.merchant_user_id

  if (!isBuyer && !isMerchant) return false
  if (order.status === "cancelled" || order.status === "completed") return false

  if (nextStatus === "sent") {
    return isBuyer && order.external_payment_status === "pending"
  }

  if (nextStatus === "confirmed") {
    return isMerchant && order.external_payment_status === "sent"
  }

  if (nextStatus === "disputed") {
    return (isBuyer || isMerchant) && ["sent", "confirmed"].includes(order.external_payment_status)
  }

  if (nextStatus === "cancelled") {
    return isBuyer || isMerchant
  }

  if (nextStatus === "pending") {
    return false
  }

  return false
}

export async function POST(request: Request) {
  try {
    const bearerToken = getBearerToken(request)
    if (!bearerToken) {
      return NextResponse.json({ error: "Neautorizat. Lipsește bearer token." }, { status: 401 })
    }

    const supabase = getServerSupabase()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(bearerToken)

    if (userError || !user) {
      return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 401 })
    }

    const body = (await request.json()) as UpdateExternalPaymentBody
    const orderId = body.orderId?.trim()
    const nextExternalPaymentStatus = body.nextExternalPaymentStatus

    if (!orderId || !nextExternalPaymentStatus || !VALID_EXTERNAL_STATUSES.includes(nextExternalPaymentStatus)) {
      return NextResponse.json({ error: "Date invalide pentru actualizarea plății externe." }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("merchant_orders")
      .select("id, buyer_user_id, merchant_user_id, title, status, payment_status, external_payment_method, external_payment_status")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || "Comanda nu a fost găsită." }, { status: 404 })
    }

    const currentOrder = order as OrderRow
    const actorId = user.id

    if (!canTransition(actorId, currentOrder, nextExternalPaymentStatus)) {
      return NextResponse.json({ error: "Tranziție nepermisă pentru plata externă." }, { status: 400 })
    }

    const patch: Record<string, string> = {
      external_payment_status: nextExternalPaymentStatus,
      updated_at: new Date().toISOString(),
    }

    if (nextExternalPaymentStatus === "sent") {
      patch.external_payment_sent_at = new Date().toISOString()
    }

    if (nextExternalPaymentStatus === "confirmed") {
      patch.external_payment_confirmed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from("merchant_orders")
      .update(patch)
      .eq("id", orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const recipientUserId = actorId === currentOrder.buyer_user_id ? currentOrder.merchant_user_id : currentOrder.buyer_user_id

    const bodyText =
      nextExternalPaymentStatus === "sent"
        ? `Cumpărătorul a marcat plata MobilePay ca trimisă pentru ${currentOrder.title}.`
        : nextExternalPaymentStatus === "confirmed"
          ? `Comerciantul a confirmat plata MobilePay pentru ${currentOrder.title}.`
          : nextExternalPaymentStatus === "disputed"
            ? `Plata MobilePay pentru ${currentOrder.title} a fost marcată în dispută.`
            : `Plata externă pentru ${currentOrder.title} a fost anulată.`

    await supabase.from("notifications").insert({
      user_id: recipientUserId,
      event_type: "merchant_order_external_payment_updated",
      title: "Status plată externă actualizat",
      body: bodyText,
      ref_id: orderId,
      is_read: false,
    })

    return NextResponse.json({ ok: true, externalPaymentStatus: nextExternalPaymentStatus })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la actualizarea plății externe." },
      { status: 500 }
    )
  }
}
