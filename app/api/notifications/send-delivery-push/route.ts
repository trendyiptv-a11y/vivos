import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

type SendDeliveryPushBody = {
  targetUserId?: string
  title?: string
  body?: string
  url?: string
  eventType?: string
  refId?: string
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

function getFirebaseApp() {
  if (getApps().length) {
    return getApp()
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Lipsesc FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL sau FIREBASE_PRIVATE_KEY.")
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

export async function POST(request: Request) {
  try {
    const bearerToken = getBearerToken(request)

    if (!bearerToken) {
      return NextResponse.json({ error: "Neautorizat. Lipsește bearer token." }, { status: 401 })
    }

    const body = (await request.json()) as SendDeliveryPushBody
    const targetUserId = body.targetUserId?.trim()
    const title = body.title?.trim()
    const messageBody = body.body?.trim() || ""
    const url = body.url?.trim() || ""
    const eventType = body.eventType?.trim() || "delivery_update"
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

    const { data: tokenRows, error: tokenError } = await supabase
      .from("device_push_tokens")
      .select("token")
      .eq("user_id", targetUserId)
      .eq("is_active", true)

    if (tokenError) {
      return NextResponse.json({ error: `Nu am putut citi tokenurile device: ${tokenError.message}` }, { status: 500 })
    }

    const tokens = (tokenRows ?? [])
      .map((row: { token?: string | null }) => row.token?.trim())
      .filter((token): token is string => !!token)

    if (!tokens.length) {
      return NextResponse.json({ ok: true, delivered: false, reason: "no_active_tokens" })
    }

    getFirebaseApp()
    const messaging = getMessaging()

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: messageBody || undefined,
      },
      data: {
        url,
        notificationType: eventType,
        refId,
        title,
        body: messageBody,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          clickAction: "OPEN_ACTIVITY_1",
        },
      },
    })

    const invalidTokens = response.responses
      .map((result, index) => ({ result, token: tokens[index] }))
      .filter(({ result }) => !result.success)
      .map(({ token }) => token)

    if (invalidTokens.length) {
      await supabase
        .from("device_push_tokens")
        .update({ is_active: false })
        .in("token", invalidTokens)
    }

    return NextResponse.json({
      ok: true,
      delivered: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la trimiterea push notification." },
      { status: 500 }
    )
  }
}
