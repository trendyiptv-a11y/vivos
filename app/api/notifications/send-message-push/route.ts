import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

type SendPushBody = {
  conversationId?: string
  messageId?: string
  messageBody?: string
}

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Lipsesc variabilele NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY.")
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice("Bearer ".length)
}

function setupWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Lipsesc cheile VAPID sau VAPID_SUBJECT.")
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

async function getFCMAccessToken(): Promise<string> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) throw new Error("Lipsește FIREBASE_SERVICE_ACCOUNT_JSON.")

  const serviceAccount = JSON.parse(serviceAccountJson)

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }

  // Creează JWT manual
  const header = { alg: "RS256", typ: "JWT" }
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url")

  const unsigned = `${encode(header)}.${encode(payload)}`

  // Importă cheia privată și semnează
  const privateKey = serviceAccount.private_key
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(
      privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\n/g, ""),
      "base64"
    ),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(unsigned)
  )

  const jwt = `${unsigned}.${Buffer.from(signature).toString("base64url")}`

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  conversationId: string
) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const accessToken = await getFCMAccessToken()

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          data: {
            url: `/messages/${conversationId}`,
            conversationId,
            notificationType: "new_message",
          },
          webpush: {
            notification: {
              title,
              body,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: `conversation-${conversationId}`,
            },
            fcm_options: {
              link: `/messages/${conversationId}`,
            },
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err?.error?.message || "FCM send failed")
  }

  return true
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: "Neautorizat. Lipsește bearer token." }, { status: 401 })
    }

    const body = (await request.json()) as SendPushBody
    const conversationId = body.conversationId?.trim()
    const messageId = body.messageId?.trim()
    const messageBody = body.messageBody?.trim() || ""

    if (!conversationId || !messageId) {
      return NextResponse.json({ error: "Lipsesc conversationId sau messageId." }, { status: 400 })
    }

    const supabase = getServerSupabase()

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 401 })
    }

    const senderId = user.id

    const { data: membersData, error: membersError } = await supabase
      .from("conversation_members")
      .select("member_id")
      .eq("conversation_id", conversationId)

    if (membersError || !membersData) {
      return NextResponse.json({ error: `Nu am putut citi membrii conversației.` }, { status: 500 })
    }

    const recipient = membersData.find((m: any) => m.member_id !== senderId)
    if (!recipient?.member_id) {
      return NextResponse.json({ ok: true, delivered: 0, reason: "Nu există receptor." })
    }

    const recipientId = recipient.member_id

    const activeThreshold = new Date(Date.now() - 30 * 1000).toISOString()
    const { data: activeConversation } = await supabase
      .from("active_conversations")
      .select("user_id")
      .eq("user_id", recipientId)
      .eq("conversation_id", conversationId)
      .gte("updated_at", activeThreshold)
      .maybeSingle()

    if (activeConversation) {
      return NextResponse.json({ ok: true, delivered: 0, suppressed: true })
    }

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("name, alias, email")
      .eq("id", senderId)
      .maybeSingle()

    const senderName =
      senderProfile?.name?.trim() ||
      senderProfile?.alias?.trim() ||
      senderProfile?.email?.trim() ||
      "Un membru"

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, fcm_token")
      .eq("user_id", recipientId)
      .eq("is_active", true)

    if (subscriptionsError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, delivered: 0, reason: "Nu există subscription activ." })
    }

    const preview = messageBody.slice(0, 140)
    const notifTitle = "Ai primit un mesaj nou"
    const notifBody = `${senderName}: ${preview}`

    setupWebPush()

    let delivered = 0

    for (const sub of subscriptions) {
      // Încearcă web-push dacă endpoint-ul nu e FCM
      if (sub.endpoint && !sub.endpoint.startsWith("fcm:")) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: notifTitle,
              body: notifBody,
              url: `/messages/${conversationId}`,
              tag: `conversation-${conversationId}`,
              conversationId,
              notificationType: "new_message",
            })
          )
          delivered += 1
          continue
        } catch (pushError: any) {
          const statusCode = pushError?.statusCode || null
          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id)
          }
          // Fallback la FCM dacă există token
        }
      }

      // FCM fallback
      if (sub.fcm_token) {
        try {
          await sendFCMNotification(sub.fcm_token, notifTitle, notifBody, conversationId)
          delivered += 1
        } catch (fcmError: any) {
          console.error("FCM error:", fcmError)
        }
      }
    }

    return NextResponse.json({ ok: true, delivered })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă." },
      { status: 500 }
    )
  }
}
