import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type UpdateStatusBody = {
  orderId?: string
  nextStatus?: string
}

const VALID_STATUSES = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "in_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const

type ValidStatus = (typeof VALID_STATUSES)[number]

type OrderRow = {
  id: string
  buyer_user_id: string
  merchant_user_id: string
  title: string
  total_talanti: number
  status: ValidStatus
  payment_status: "unpaid" | "held" | "paid" | "refunded" | "cancelled"
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

    const body = (await request.json()) as UpdateStatusBody
    const orderId = body.orderId?.trim()
    const nextStatus = body.nextStatus?.trim() as ValidStatus | undefined

    if (!orderId || !nextStatus || !VALID_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "Date invalide pentru actualizarea statusului." }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("merchant_orders")
      .select("id, buyer_user_id, merchant_user_id, title, total_talanti, status, payment_status")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || "Comanda nu a fost găsită." }, { status: 404 })
    }

    const currentOrder = order as OrderRow
    const actorId = user.id

    if (actorId !== currentOrder.buyer_user_id && actorId !== currentOrder.merchant_user_id) {
      return NextResponse.json({ error: "Nu ai acces la această comandă." }, { status: 403 })
    }

    let nextPaymentStatus = currentOrder.payment_status

    if (nextStatus === "completed" && currentOrder.payment_status === "held") {
      const { data: hold, error: holdError } = await supabase
        .from("wallet_order_holds")
        .select("id, amount_talanti, status")
        .eq("order_id", orderId)
        .maybeSingle()

      if (holdError || !hold) {
        return NextResponse.json({ error: holdError?.message || "Hold-ul comenzii nu a fost găsit." }, { status: 500 })
      }

      if (hold.status !== "active") {
        return NextResponse.json({ error: "Hold-ul nu mai este activ." }, { status: 400 })
      }

      const amount = Number(hold.amount_talanti || currentOrder.total_talanti || 0)

      const { error: debitBuyerError } = await supabase.rpc("increment_wallet_balance", {
        p_user_id: currentOrder.buyer_user_id,
        p_delta: -amount,
      })

      if (debitBuyerError) {
        return NextResponse.json({ error: debitBuyerError.message }, { status: 500 })
      }

      const { error: creditMerchantError } = await supabase.rpc("increment_wallet_balance", {
        p_user_id: currentOrder.merchant_user_id,
        p_delta: amount,
      })

      if (creditMerchantError) {
        return NextResponse.json({ error: creditMerchantError.message }, { status: 500 })
      }

      const { error: holdUpdateError } = await supabase
        .from("wallet_order_holds")
        .update({ status: "captured", updated_at: new Date().toISOString(), released_at: new Date().toISOString() })
        .eq("order_id", orderId)

      if (holdUpdateError) {
        return NextResponse.json({ error: holdUpdateError.message }, { status: 500 })
      }

      const { error: txError } = await supabase.from("wallet_transactions").insert([
        {
          user_id: currentOrder.buyer_user_id,
          order_id: orderId,
          transaction_type: "payment",
          amount_talanti: amount,
          direction: "debit",
          status: "posted",
          description: `Plată finală pentru comanda ${currentOrder.title}`,
        },
        {
          user_id: currentOrder.merchant_user_id,
          order_id: orderId,
          transaction_type: "payment",
          amount_talanti: amount,
          direction: "credit",
          status: "posted",
          description: `Încasare pentru comanda ${currentOrder.title}`,
        },
      ])

      if (txError) {
        return NextResponse.json({ error: txError.message }, { status: 500 })
      }

      nextPaymentStatus = "paid"
    }

    if (nextStatus === "cancelled" && currentOrder.payment_status === "held") {
      const { data: hold, error: holdError } = await supabase
        .from("wallet_order_holds")
        .select("id, amount_talanti, status")
        .eq("order_id", orderId)
        .maybeSingle()

      if (holdError || !hold) {
        return NextResponse.json({ error: holdError?.message || "Hold-ul comenzii nu a fost găsit." }, { status: 500 })
      }

      if (hold.status === "active") {
        const { error: holdUpdateError } = await supabase
          .from("wallet_order_holds")
          .update({ status: "cancelled", updated_at: new Date().toISOString(), released_at: new Date().toISOString() })
          .eq("order_id", orderId)

        if (holdUpdateError) {
          return NextResponse.json({ error: holdUpdateError.message }, { status: 500 })
        }

        const amount = Number(hold.amount_talanti || currentOrder.total_talanti || 0)
        const { error: txError } = await supabase.from("wallet_transactions").insert({
          user_id: currentOrder.buyer_user_id,
          order_id: orderId,
          transaction_type: "release",
          amount_talanti: amount,
          direction: "credit",
          status: "posted",
          description: `Eliberare hold pentru comanda anulată ${currentOrder.title}`,
        })

        if (txError) {
          return NextResponse.json({ error: txError.message }, { status: 500 })
        }
      }

      nextPaymentStatus = "cancelled"
    }

    const { error: updateOrderError } = await supabase
      .from("merchant_orders")
      .update({
        status: nextStatus,
        payment_status: nextPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (updateOrderError) {
      return NextResponse.json({ error: updateOrderError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status: nextStatus, paymentStatus: nextPaymentStatus })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la actualizarea statusului." },
      { status: 500 }
    )
  }
}
