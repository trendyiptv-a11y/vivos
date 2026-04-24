import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

type SendWebPushBody = {
  targetUserId?: string
  title?: string
  body?: string
  url?: string
  eventType?: string
  refId?: string
}

type SubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
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

function ensureWebPushConfig() {
  const subject = process.env.WEB_PUSH_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) {
    throw new Error("Lipsesc WEB_PUSH_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY sau VAPID_PRIVATE_KEY.")
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function POST(request: Request) {
  try {
    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Neautorizat. Lipsește bearer token." }, { status: 401 })
    }

    const body = (await request.json()) as SendWebPushBody
    const targetUserId = body.targetUserId?.trim()
    const title = body.title?.trim()
    const messageBody = body.body?.trim() || ""
    const url = body.url?.trim() || "/notifications"
    const eventType = body.eventType?.trim() || "generic"
    const refId = body.refId?.trim() || ""

    if (!targetUserId || !title) {
      return NextResponse.json({ error: "Lipsește targetUserId sau title." }, { status: 400 })
    }

    const supabase = getServerSupabase()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(bearerToken)

    if (userError || !user) {
      return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 401 })
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("web_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", targetUserId)
      .eq("is_active", true)

    if (subscriptionsError) {
      return NextResponse.json({ error: `Nu am putut citi web subscriptions: ${subscriptionsError.message}` }, { status: 500 })
    }

    const rows = (subscriptions ?? []) as SubscriptionRow[]

    if (!rows.length) {
      return NextResponse.json({ ok: true, delivered: false, reason: "no_active_subscriptions" })
    }

    ensureWebPushConfig()

    const payload = JSON.stringify({
      title,
      body: messageBody || "Ai o notificare nouă.",
      url,
      notificationType: eventType,
      tag: refId ? `delivery-${refId}-${eventType}` : `delivery-${eventType}`,
    })

    const results = await Promise.allSettled(
      rows.map((row) =>
        webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          payload
        )
      )
    )

    const invalidEndpoints = results
      .map((result, index) => ({ result, endpoint: rows[index]?.endpoint }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ endpoint }) => endpoint)
      .filter((endpoint): endpoint is string => !!endpoint)

    if (invalidEndpoints.length) {
      await supabase
        .from("web_push_subscriptions")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("endpoint", invalidEndpoints)
    }

    const successCount = results.filter((result) => result.status === "fulfilled").length
    const failureCount = results.length - successCount

    return NextResponse.json({ ok: true, delivered: successCount > 0, successCount, failureCount })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la trimiterea web push notification." },
      { status: 500 }
    )
  }
}
