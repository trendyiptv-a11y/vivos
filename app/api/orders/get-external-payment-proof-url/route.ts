import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BUCKET_NAME = "payment-proofs"

type OrderRow = {
  id: string
  buyer_user_id: string
  merchant_user_id: string
  external_payment_proof_path: string | null
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

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const orderId = String(searchParams.get("orderId") || "").trim()

    if (!orderId) {
      return NextResponse.json({ error: "Lipsește orderId." }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("merchant_orders")
      .select("id, buyer_user_id, merchant_user_id, external_payment_proof_path")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || "Comanda nu a fost găsită." }, { status: 404 })
    }

    const currentOrder = order as OrderRow

    if (user.id !== currentOrder.buyer_user_id && user.id !== currentOrder.merchant_user_id) {
      return NextResponse.json({ error: "Nu ai acces la această dovadă." }, { status: 403 })
    }

    if (!currentOrder.external_payment_proof_path) {
      return NextResponse.json({ error: "Nu există dovadă încărcată pentru această comandă." }, { status: 404 })
    }

    const signedResult = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(currentOrder.external_payment_proof_path, 60 * 30)

    if (signedResult.error || !signedResult.data?.signedUrl) {
      return NextResponse.json({ error: signedResult.error?.message || "Nu am putut genera link-ul semnat." }, { status: 500 })
    }

    return NextResponse.json({ ok: true, signedUrl: signedResult.data.signedUrl })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la generarea link-ului pentru dovadă." },
      { status: 500 }
    )
  }
}
