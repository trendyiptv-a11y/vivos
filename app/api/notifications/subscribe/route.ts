import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type SubscribeBody = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
  userAgent?: string
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
    const token = getBearerToken(request)

    if (!token) {
      return NextResponse.json({ error: "Neautorizat. Lipsește bearer token." }, { status: 401 })
    }

    const body = (await request.json()) as SubscribeBody
    const endpoint = body.endpoint?.trim()
    const p256dh = body.keys?.p256dh?.trim()
    const auth = body.keys?.auth?.trim()
    const userAgent = body.userAgent?.trim() || null
    const deviceLabel = body.deviceLabel?.trim() || "browser"

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Date incomplete pentru push subscription." },
        { status: 400 }
      )
    }

    const supabase = getServerSupabase()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 401 })
    }

    const { error: upsertError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent,
          device_label: deviceLabel,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )

    if (upsertError) {
      return NextResponse.json(
        { error: `Nu am putut salva subscription-ul: ${upsertError.message}` },
        { status: 500 }
      )
    }

    const { error: prefError } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          push_enabled: true,
          email_fallback_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (prefError) {
      return NextResponse.json(
        { error: `Subscription salvat, dar preferințele nu au fost actualizate: ${prefError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la salvarea push subscription." },
      { status: 500 }
    )
  }
}
