import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type OrderRow = {
  id: string
  buyer_user_id: string
  merchant_user_id: string
  title: string
  status: string
  external_payment_status: "pending" | "sent" | "confirmed" | "disputed" | "cancelled"
  external_payment_proof_path: string | null
}

const BUCKET_NAME = "payment-proofs"
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-")
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

    const formData = await request.formData()
    const orderId = String(formData.get("orderId") || "").trim()
    const file = formData.get("file")

    if (!orderId || !(file instanceof File)) {
      return NextResponse.json({ error: "Lipsesc orderId sau fișierul." }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Sunt acceptate doar imagini JPG, PNG sau WEBP." }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fișierul este prea mare. Limita este 5 MB." }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from("merchant_orders")
      .select("id, buyer_user_id, merchant_user_id, title, status, external_payment_status, external_payment_proof_path")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || "Comanda nu a fost găsită." }, { status: 404 })
    }

    const currentOrder = order as OrderRow

    if (user.id !== currentOrder.buyer_user_id) {
      return NextResponse.json({ error: "Doar cumpărătorul poate încărca dovada plății externe." }, { status: 403 })
    }

    if (currentOrder.status === "cancelled" || currentOrder.status === "completed") {
      return NextResponse.json({ error: "Nu poți încărca dovadă pentru o comandă închisă." }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const extension = file.name.split(".").pop()?.toLowerCase() || (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg")
    const safeName = sanitizeFileName(file.name || `proof.${extension}`)
    const storagePath = `${currentOrder.buyer_user_id}/${orderId}/${Date.now()}-${safeName}`

    const uploadResult = await supabase.storage.from(BUCKET_NAME).upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

    if (uploadResult.error) {
      const message = uploadResult.error.message.includes("Bucket not found")
        ? `Bucket-ul ${BUCKET_NAME} nu există încă în Supabase Storage.`
        : uploadResult.error.message
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const { error: patchError } = await supabase
      .from("merchant_orders")
      .update({
        external_payment_proof_path: storagePath,
        external_payment_proof_uploaded_at: new Date().toISOString(),
        external_payment_proof_uploaded_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (patchError) {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return NextResponse.json({ error: patchError.message }, { status: 500 })
    }

    await supabase.from("notifications").insert({
      user_id: currentOrder.merchant_user_id,
      event_type: "merchant_order_external_payment_proof_uploaded",
      title: "Dovadă MobilePay încărcată",
      body: `Cumpărătorul a încărcat o dovadă de plată pentru ${currentOrder.title}.`,
      ref_id: orderId,
      is_read: false,
    })

    return NextResponse.json({ ok: true, proofPath: storagePath })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la upload-ul dovezii." },
      { status: 500 }
    )
  }
}
