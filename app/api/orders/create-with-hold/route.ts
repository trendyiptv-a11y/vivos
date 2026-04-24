import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type CreateOrderBody = {
  marketPostId?: string
  merchantUserId?: string
  title?: string
  quantity?: number
  unitPriceTalanti?: number
  totalTalanti?: number
  notes?: string
  deliveryNeeded?: boolean
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

    const body = (await request.json()) as CreateOrderBody
    const marketPostId = body.marketPostId?.trim()
    const merchantUserId = body.merchantUserId?.trim()
    const title = body.title?.trim()
    const notes = body.notes?.trim() || null
    const quantity = Number(body.quantity || 0)
    const unitPriceTalanti = Number(body.unitPriceTalanti || 0)
    const totalTalanti = Number(body.totalTalanti || 0)
    const deliveryNeeded = !!body.deliveryNeeded
    const buyerUserId = user.id

    if (!marketPostId || !merchantUserId || !title) {
      return NextResponse.json({ error: "Lipsesc datele comenzii." }, { status: 400 })
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Cantitatea trebuie să fie mai mare decât zero." }, { status: 400 })
    }

    if (!Number.isFinite(unitPriceTalanti) || unitPriceTalanti < 0) {
      return NextResponse.json({ error: "Prețul unitar este invalid." }, { status: 400 })
    }

    if (!Number.isFinite(totalTalanti) || totalTalanti < 0) {
      return NextResponse.json({ error: "Totalul este invalid." }, { status: 400 })
    }

    if (buyerUserId === merchantUserId) {
      return NextResponse.json({ error: "Nu poți crea comandă către propriul cont." }, { status: 400 })
    }

    const { data: walletAccount, error: walletError } = await supabase
      .from("wallet_accounts")
      .select("balance_talanti")
      .eq("user_id", buyerUserId)
      .maybeSingle()

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500 })
    }

    const balanceTalanti = Number(walletAccount?.balance_talanti || 0)

    const { data: activeHolds, error: holdsError } = await supabase
      .from("wallet_order_holds")
      .select("amount_talanti")
      .eq("buyer_user_id", buyerUserId)
      .eq("status", "active")

    if (holdsError) {
      return NextResponse.json({ error: holdsError.message }, { status: 500 })
    }

    const heldTalanti = (activeHolds || []).reduce((sum: number, row: any) => sum + Number(row.amount_talanti || 0), 0)
    const availableTalanti = balanceTalanti - heldTalanti

    if (totalTalanti > availableTalanti) {
      return NextResponse.json(
        {
          error: `Sold insuficient. Disponibil: ${availableTalanti.toFixed(2)} talanți. Necesari: ${totalTalanti.toFixed(2)} talanți.`,
        },
        { status: 400 }
      )
    }

    const { data: orderData, error: orderError } = await supabase
      .from("merchant_orders")
      .insert({
        market_post_id: marketPostId,
        merchant_user_id: merchantUserId,
        buyer_user_id: buyerUserId,
        title,
        quantity,
        unit_price_talanti: unitPriceTalanti,
        total_talanti: totalTalanti,
        notes,
        delivery_needed: deliveryNeeded,
        status: "new",
        payment_status: "held",
      })
      .select("id")
      .single()

    if (orderError || !orderData) {
      return NextResponse.json({ error: orderError?.message || "Comanda nu a putut fi creată." }, { status: 500 })
    }

    const { error: holdError } = await supabase.from("wallet_order_holds").insert({
      order_id: orderData.id,
      buyer_user_id: buyerUserId,
      merchant_user_id: merchantUserId,
      amount_talanti: totalTalanti,
      status: "active",
    })

    if (holdError) {
      await supabase.from("merchant_orders").delete().eq("id", orderData.id)
      return NextResponse.json({ error: holdError.message }, { status: 500 })
    }

    const { error: transactionError } = await supabase.from("wallet_transactions").insert({
      user_id: buyerUserId,
      order_id: orderData.id,
      transaction_type: "hold",
      amount_talanti: totalTalanti,
      direction: "debit",
      status: "posted",
      description: `Hold pentru comanda ${title}`,
    })

    if (transactionError) {
      await supabase.from("wallet_order_holds").delete().eq("order_id", orderData.id)
      await supabase.from("merchant_orders").delete().eq("id", orderData.id)
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      orderId: orderData.id,
      paymentStatus: "held",
      heldTalanti: totalTalanti,
      availableTalanti: availableTalanti - totalTalanti,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la crearea comenzii cu hold." },
      { status: 500 }
    )
  }
}
