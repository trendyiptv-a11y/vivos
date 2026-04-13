import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@vivos.land"

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

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

  const header = { alg: "RS256", typ: "JWT" }
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url")
  const unsigned = `${encode(header)}.${encode(payload)}`

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(
      serviceAccount.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\n/g, ""),
      "base64"
    ),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(unsigned))
  const jwt = `${unsigned}.${Buffer.from(signature).toString("base64url")}`

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

async function sendFCMCallNotification(
  fcmToken: string,
  callerName: string,
  conversationId: string,
  callSessionId: string
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
          notification: {
            title: "Apel incoming",
            body: `${callerName} te apelează în VIVOS`,
          },
          data: {
            conversationId,
            callSessionId,
            callerName,
            notificationType: "incoming_call",
            url: `/messages/${conversationId}`,
            answerUrl: `/messages/${conversationId}?callAction=answer&callSessionId=${callSessionId}`,
          },
          webpush: {
            notification: {
              title: "Apel incoming",
              body: `${callerName} te apelează în VIVOS`,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: `incoming-call-${callSessionId}`,
              requireInteraction: true,
              vibrate: [300, 150, 300, 150, 300],
              actions: [{ action: "answer", title: "Răspunde" }],
            },
            fcm_options: {
              link: `/messages/${conversationId}?callAction=answer&callSessionId=${callSessionId}`,
            },
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err?.error?.message || "FCM call send failed")
  }

  return true
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Lipsește tokenul." }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "").trim()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: "Sesiune invalidă." }, { status: 401 })
    }

    const body = await req.json()
    const conversationId = String(body.conversationId || "")
    const callSessionId = String(body.callSessionId || "")
    const calleeId = String(body.calleeId || "")

    if (!conversationId || !callSessionId || !calleeId) {
      return NextResponse.json(
        { error: "Lipsesc conversationId, callSessionId sau calleeId." },
        { status: 400 }
      )
    }

    if (calleeId === user.id) {
      return NextResponse.json({ ok: true, skipped: "self-call" })
    }

    const { data: activeConversation } = await supabaseAdmin
      .from("active_conversations")
      .select("user_id")
      .eq("user_id", calleeId)
      .eq("conversation_id", conversationId)
      .maybeSingle()

    if (activeConversation) {
      return NextResponse.json({ ok: true, skipped: "callee-active-in-conversation" })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("name, alias, email")
      .eq("id", user.id)
      .maybeSingle()

    const callerName =
      callerProfile?.name?.trim() ||
      callerProfile?.alias?.trim() ||
      callerProfile?.email?.trim() ||
      "Un membru"

    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, fcm_token")
      .eq("user_id", calleeId)
      .eq("is_active", true)

    if (subscriptionsError) {
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, skipped: "no-subscriptions" })
    }

    const notificationPayload = JSON.stringify({
      title: "Apel incoming",
      body: `${callerName} te apelează în VIVOS`,
      tag: `incoming-call-${callSessionId}`,
      url: `/messages/${conversationId}`,
      answerUrl: `/messages/${conversationId}?callAction=answer&callSessionId=${callSessionId}`,
      declineUrl: `/messages/${conversationId}?callAction=decline&callSessionId=${callSessionId}`,
      conversationId,
      callSessionId,
      callerName,
      notificationType: "incoming_call",
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300],
    })

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      // Încearcă web-push dacă nu e FCM endpoint
      if (sub.endpoint && !sub.endpoint.startsWith("fcm:")) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notificationPayload
          )
          sent += 1
          continue
        } catch (error: any) {
          const statusCode = error?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabaseAdmin
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id)
          }
          // Fallback la FCM
        }
      }

      // FCM fallback
      if (sub.fcm_token) {
        try {
          await sendFCMCallNotification(sub.fcm_token, callerName, conversationId, callSessionId)
          sent += 1
        } catch (fcmError: any) {
          console.error("FCM call error:", fcmError)
          failed += 1
        }
      } else {
        failed += 1
      }
    }

    return NextResponse.json({ ok: true, sent, failed })
  } catch (error: any) {
    console.error("send-call-push error:", error)
    return NextResponse.json(
      { error: error?.message || "Eroare necunoscută." },
      { status: 500 }
    )
  }
}
