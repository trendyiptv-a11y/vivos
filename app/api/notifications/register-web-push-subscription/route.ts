import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type WebPushSubscriptionBody = {
  subscription?: {
    endpoint?: string
    expirationTime?: number | null
    keys?: {
      p256dh?: string
      auth?: string
    }
  }
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

    const body = (await request.json()) as WebPushSubscriptionBody
    const endpoint = body.subscription?.endpoint?.trim()
    const p256dh = body.subscription?.keys?.p256dh?.trim()
    const auth = body.subscription?.keys?.auth?.trim()
    const expirationTime = body.subscription?.expirationTime ?? null

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Subscription invalidă." }, { status: 400 })
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
      .from("web_push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          expiration_time: expirationTime,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )

    if (upsertError) {
      return NextResponse.json({ error: `Nu am putut salva subscription: ${upsertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la salvarea web push subscription." },
      { status: 500 }
    )
  }
}
