import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type ResolveDisputeBody = {
  orderId?: string
  resolutionNote?: string
}

type OrderRow = {
  id: string
  buyer_user_id: string
  merchant_user_id: string
  title: string
  status: string
  external_payment_status: "pending" | "sent" | "confirmed" | "disputed" | "cancelled"
  external_payment_confirmed_at: string | null
  external_payment_dispute_reason: string | null
}

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

    const body = (await request.json()) as ResolveDisputeBody
    const orderId = body.orderId?.trim()
    const resolutionNote = body.resolutionNote?.trim() || "Disputa a fost închisă și comanda revine în fluxul anterior."

    if (!orderId) {
      return NextResponse.json({ error: "Lipsește orderId." }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("merchant_orders")
      .select(
        "id, buyer_user_id, merchant_user_id, title, status, external_payment_status, external_payment_confirmed_at, external_payment_dispute_reason"
      )
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || "Comanda nu a fost găsită." }, { status: 404 })
    }

    const currentOrder = order as OrderRow
    const isBuyer = user.id === currentOrder.buyer_user_id
    const isMerchant = user.id === currentOrder.merchant_user_id

    if (!isBuyer && !isMerchant) {
      return NextResponse.json({ error: "Nu ai acces la această comandă." }, { status: 403 })
    }

    if (currentOrder.status === "cancelled" || currentOrder.status === "completed") {
      return NextResponse.json({ error: "Nu poți rezolva disputa pentru o comandă închisă." }, { status: 400 })
    }

    if (currentOrder.external_payment_status !== "disputed") {
      return NextResponse.json({ error: "Comanda nu este în dispută." }, { status: 400 })
    }

    const restoredStatus = currentOrder.external_payment_confirmed_at ? "confirmed" : "sent"
    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("merchant_orders")
      .update({
        external_payment_status: restoredStatus,
        external_payment_dispute_resolved_at: now,
        external_payment_dispute_resolved_by: user.id,
        external_payment_dispute_resolution: resolutionNote,
        updated_at: now,
      })
      .eq("id", orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const recipientUserId = isBuyer ? currentOrder.merchant_user_id : currentOrder.buyer_user_id

    await supabase.from("notifications").insert({
      user_id: recipientUserId,
      event_type: "merchant_order_external_payment_dispute_resolved",
      title: "Dispută închisă",
      body: `Disputa pentru ${currentOrder.title} a fost închisă. Statusul plății externe revine la ${restoredStatus === "confirmed" ? "confirmată" : "trimisă"}.`,
      ref_id: orderId,
      is_read: false,
    })

    return NextResponse.json({
      ok: true,
      restoredStatus,
      resolvedAt: now,
      resolvedBy: user.id,
      resolutionNote,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la rezolvarea disputei." },
      { status: 500 }
    )
  }
}
