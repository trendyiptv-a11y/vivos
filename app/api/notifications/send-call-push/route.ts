"use server"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"
import { App, cert, getApps, initializeApp } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@vivos.land"

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Lipsesc FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL sau FIREBASE_PRIVATE_KEY."
    )
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

function toDataValue(value: unknown) {
  if (value === null || value === undefined) return ""
  return String(value)
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Lipsește tokenul." }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "").trim()

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: "Sesiune invalidă." }, { status: 401 })
    }

    const body = await req.json()
    const conversationId = String(body.conversationId || "")
    const callSessionId = String(body.callSessionId || "")
    const calleeId = String(body.calleeId || "")
    const callType = body.callType === "video" ? "video" : "audio"

    if (!conversationId || !callSessionId || !calleeId) {
      return NextResponse.json(
        { error: "Lipsesc conversationId, callSessionId sau calleeId." },
        { status: 400 }
      )
    }

    if (calleeId === user.id) {
      return NextResponse.json({ ok: true, skipped: "self-call" })
    }

    const activeThreshold = new Date(Date.now() - 90 * 1000).toISOString()

    const { data: activeConversation, error: activeConversationError } = await supabaseAdmin
      .from("active_conversations")
      .select("user_id, conversation_id, updated_at")
      .eq("user_id", calleeId)
      .eq("conversation_id", conversationId)
      .gte("updated_at", activeThreshold)
      .maybeSingle()

    if (activeConversationError) {
      console.error("active_conversations read error:", activeConversationError)
    }

    if (activeConversation?.user_id && activeConversation?.conversation_id) {
      return NextResponse.json({
        ok: true,
        skipped: "callee-active-in-conversation",
      })
    }

    const { data: callSession, error: callSessionError } = await supabaseAdmin
      .from("call_sessions")
      .select("id, status, caller_id, callee_id, call_type")
      .eq("id", callSessionId)
      .maybeSingle()

    if (callSessionError) {
      return NextResponse.json({ error: callSessionError.message }, { status: 500 })
    }

    if (!callSession?.id) {
      return NextResponse.json({ ok: true, skipped: "call-session-not-found" })
    }

    if (callSession.callee_id !== calleeId || callSession.caller_id !== user.id) {
      return NextResponse.json({ ok: true, skipped: "call-session-mismatch" })
    }

    if (callSession.status !== "ringing") {
      return NextResponse.json({ ok: true, skipped: `call-not-ringing:${callSession.status}` })
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
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", calleeId)
      .eq("is_active", true)

    if (subscriptionsError) {
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 })
    }

    const { data: deviceTokens, error: deviceTokensError } = await supabaseAdmin
      .from("device_push_tokens")
      .select("id, token, platform")
      .eq("user_id", calleeId)
      .eq("is_active", true)

    if (deviceTokensError) {
      return NextResponse.json({ error: deviceTokensError.message }, { status: 500 })
    }

    if ((!subscriptions || subscriptions.length === 0) && (!deviceTokens || deviceTokens.length === 0)) {
      return NextResponse.json({ ok: true, skipped: "no-push-targets" })
    }

    const openUrl = `/messages/${conversationId}`
    const answerUrl = `/messages/${conversationId}?callAction=answer&callSessionId=${callSessionId}`
    const declineUrl = `/messages/${conversationId}?callAction=decline&callSessionId=${callSessionId}`
    const tag = `incoming-call-${callSessionId}`

    const webNotificationPayload = JSON.stringify({
      title: callType === "video" ? "Apel video incoming" : "Apel incoming",
      body:
        callType === "video"
          ? `${callerName} te apelează video în VIVOS`
          : `${callerName} te apelează în VIVOS`,
      tag,
      url: openUrl,
      answerUrl,
      declineUrl,
      conversationId,
      callSessionId,
      callerName,
      callType,
      notificationType: "incoming_call",
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300],
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      actions: [
        { action: "answer", title: "Răspunde" },
        { action: "decline", title: "Respinge" },
      ],
    })

    const webResults = await Promise.allSettled(
      (subscriptions || []).map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(subscription, webNotificationPayload)
          return { ok: true, id: sub.id }
        } catch (error: any) {
          const statusCode = error?.statusCode

          if (statusCode === 404 || statusCode === 410) {
            await supabaseAdmin
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id)
          }

          throw error
        }
      })
    )

    let fcmSent = 0
    let fcmFailed = 0

    if (deviceTokens && deviceTokens.length > 0) {
      const firebaseApp = getFirebaseAdminApp()
      const messaging = getMessaging(firebaseApp)

      const fcmResults = await Promise.allSettled(
        deviceTokens.map(async (row) => {
          try {
            await messaging.send({
              token: row.token,
              data: {
                url: toDataValue(openUrl),
                answerUrl: toDataValue(answerUrl),
                declineUrl: toDataValue(declineUrl),
                conversationId: toDataValue(conversationId),
                callSessionId: toDataValue(callSessionId),
                callerName: toDataValue(callerName),
                callType: toDataValue(callType),
                notificationType: "incoming_call",
                tag: toDataValue(tag),
                title: callType === "video" ? "Apel video incoming" : "Apel incoming",
                body: toDataValue(
                  callType === "video"
                    ? `${callerName} te apelează video în VIVOS`
                    : `${callerName} te apelează în VIVOS`
                ),
              },
              android: {
                priority: "high",
                ttl: 60000,
                collapseKey: tag,
              },
            })

            fcmSent += 1
            return { ok: true, id: row.id }
          } catch (error: any) {
            const code = String(error?.code || "")
            if (
              code.includes("registration-token-not-registered") ||
              code.includes("invalid-argument")
            ) {
              await supabaseAdmin
                .from("device_push_tokens")
                .update({ is_active: false })
                .eq("id", row.id)
            }
            throw error
          }
        })
      )

      fcmFailed = fcmResults.filter((r) => r.status === "rejected").length
    }

    return NextResponse.json({
      ok: true,
      webPushSent: webResults.filter((r) => r.status === "fulfilled").length,
      webPushFailed: webResults.filter((r) => r.status === "rejected").length,
      fcmSent,
      fcmFailed,
    })
  } catch (error: any) {
    console.error("send-call-push error:", error)
    return NextResponse.json(
      { error: error?.message || "Eroare necunoscută." },
      { status: 500 }
    )
  }
}
