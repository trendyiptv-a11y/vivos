import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type CreateOrderItemBody = {
  catalogItemId?: string
  quantity?: number
}

type CreateOrderBody = {
  marketPostId?: string
  merchantUserId?: string
  title?: string
  quantity?: number
  unitPriceTalanti?: number
  totalTalanti?: number
  notes?: string
  deliveryNeeded?: boolean
  items?: CreateOrderItemBody[]
}

type CatalogItemRow = {
  id: string
  merchant_user_id: string
  title: string
  description: string | null
  price_talanti: number
  unit_label: string | null
  is_active: boolean
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
    const marketPostId = body.marketPostId?.trim() || null
    const merchantUserId = body.merchantUserId?.trim()
    const title = body.title?.trim()
    const notes = body.notes?.trim() || null
    const quantity = Number(body.quantity || 0)
    const unitPriceTalanti = Number(body.unitPriceTalanti || 0)
    const requestedTotalTalanti = Number(body.totalTalanti || 0)
    const deliveryNeeded = !!body.deliveryNeeded
    const buyerUserId = user.id
    const requestedItems = Array.isArray(body.items) ? body.items : []

    if (!merchantUserId || !title) {
      return NextResponse.json({ error: "Lipsesc datele comenzii." }, { status: 400 })
    }

    if (buyerUserId === merchantUserId) {
      return NextResponse.json({ error: "Nu poți crea comandă către propriul cont." }, { status: 400 })
    }

    let orderQuantity = quantity
    let orderUnitPriceTalanti = unitPriceTalanti
    let totalTalanti = requestedTotalTalanti
    let orderItemsPayload: Array<{
      catalog_item_id: string
      title_snapshot: string
      description_snapshot: string | null
      unit_label_snapshot: string | null
      quantity: number
      unit_price_talanti: number
      line_total_talanti: number
    }> = []

    if (requestedItems.length > 0) {
      const normalizedItems = requestedItems
        .map((item) => ({
          catalogItemId: item.catalogItemId?.trim() || "",
          quantity: Number(item.quantity || 0),
        }))
        .filter((item) => item.catalogItemId && Number.isFinite(item.quantity) && item.quantity > 0)

      if (!normalizedItems.length) {
        return NextResponse.json({ error: "Nu există produse valide selectate pentru comandă." }, { status: 400 })
      }

      const catalogItemIds = normalizedItems.map((item) => item.catalogItemId)
      const { data: catalogRows, error: catalogError } = await supabase
        .from("merchant_catalog_items")
        .select("id, merchant_user_id, title, description, price_talanti, unit_label, is_active")
        .in("id", catalogItemIds)

      if (catalogError) {
        return NextResponse.json({ error: catalogError.message }, { status: 500 })
      }

      const catalogMap = ((catalogRows ?? []) as CatalogItemRow[]).reduce<Record<string, CatalogItemRow>>((acc, row) => {
        acc[row.id] = row
        return acc
      }, {})

      for (const item of normalizedItems) {
        const catalogRow = catalogMap[item.catalogItemId]
        if (!catalogRow) {
          return NextResponse.json({ error: "Un produs selectat nu mai există în catalog." }, { status: 400 })
        }
        if (catalogRow.merchant_user_id !== merchantUserId) {
          return NextResponse.json({ error: "Un produs selectat nu aparține acestui comerciant." }, { status: 400 })
        }
        if (!catalogRow.is_active) {
          return NextResponse.json({ error: `Produsul ${catalogRow.title} nu este activ.` }, { status: 400 })
        }

        const lineTotal = Number(catalogRow.price_talanti) * item.quantity
        orderItemsPayload.push({
          catalog_item_id: catalogRow.id,
          title_snapshot: catalogRow.title,
          description_snapshot: catalogRow.description,
          unit_label_snapshot: catalogRow.unit_label || "buc",
          quantity: item.quantity,
          unit_price_talanti: Number(catalogRow.price_talanti),
          line_total_talanti: lineTotal,
        })
      }

      orderQuantity = orderItemsPayload.reduce((sum, item) => sum + item.quantity, 0)
      totalTalanti = orderItemsPayload.reduce((sum, item) => sum + item.line_total_talanti, 0)
      orderUnitPriceTalanti = orderQuantity > 0 ? totalTalanti / orderQuantity : 0
    } else {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Cantitatea trebuie să fie mai mare decât zero." }, { status: 400 })
      }

      if (!Number.isFinite(unitPriceTalanti) || unitPriceTalanti < 0) {
        return NextResponse.json({ error: "Prețul unitar este invalid." }, { status: 400 })
      }

      if (!Number.isFinite(requestedTotalTalanti) || requestedTotalTalanti < 0) {
        return NextResponse.json({ error: "Totalul este invalid." }, { status: 400 })
      }

      totalTalanti = requestedTotalTalanti
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
        quantity: orderQuantity,
        unit_price_talanti: orderUnitPriceTalanti,
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

    if (orderItemsPayload.length > 0) {
      const { error: itemsError } = await supabase.from("merchant_order_items").insert(
        orderItemsPayload.map((item) => ({
          order_id: orderData.id,
          catalog_item_id: item.catalog_item_id,
          title_snapshot: item.title_snapshot,
          description_snapshot: item.description_snapshot,
          unit_label_snapshot: item.unit_label_snapshot,
          quantity: item.quantity,
          unit_price_talanti: item.unit_price_talanti,
          line_total_talanti: item.line_total_talanti,
        }))
      )

      if (itemsError) {
        await supabase.from("merchant_orders").delete().eq("id", orderData.id)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    const { error: holdError } = await supabase.from("wallet_order_holds").insert({
      order_id: orderData.id,
      buyer_user_id: buyerUserId,
      merchant_user_id: merchantUserId,
      amount_talanti: totalTalanti,
      status: "active",
    })

    if (holdError) {
      await supabase.from("merchant_order_items").delete().eq("order_id", orderData.id)
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
      await supabase.from("merchant_order_items").delete().eq("order_id", orderData.id)
      await supabase.from("merchant_orders").delete().eq("id", orderData.id)
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      orderId: orderData.id,
      paymentStatus: "held",
      heldTalanti: totalTalanti,
      availableTalanti: availableTalanti - totalTalanti,
      itemCount: orderItemsPayload.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la crearea comenzii cu hold." },
      { status: 500 }
    )
  }
}
