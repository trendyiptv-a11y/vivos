import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type RegisterDeviceTokenBody = {
  token?: string
  platform?: string
  deviceLabel?: string
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

    const body = (await request.json()) as RegisterDeviceTokenBody
    const token = body.token?.trim()
    const platform = body.platform?.trim() || "android"
    const deviceLabel = body.deviceLabel?.trim() || "capacitor-android"

    if (!token) {
      return NextResponse.json({ error: "Lipsește tokenul FCM." }, { status: 400 })
    }

    const supabase = getServerSupabase()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(bearerToken)

    if (userError || !user) {
      return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 401 })
    }

    const { error: upsertError } = await supabase
      .from("device_push_tokens")
      .upsert(
        {
          user_id: user.id,
          platform,
          token,
          device_label: deviceLabel,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      )

    if (upsertError) {
      return NextResponse.json(
        { error: `Nu am putut salva tokenul device: ${upsertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la salvarea tokenului device." },
      { status: 500 }
    )
  }
}
