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
      .select("user_id, conversation_id")
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
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", calleeId)

    if (subscriptionsError) {
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, skipped: "no-subscriptions" })
    }

    const openUrl = `/messages/${conversationId}`
    const answerUrl = `/messages/${conversationId}?callAction=answer&callSessionId=${callSessionId}`
    const declineUrl = `/messages/${conversationId}?callAction=decline&callSessionId=${callSessionId}`
    const notificationPayload = JSON.stringify({
      title: "Apel incoming",
      body: `${callerName} te apelează în VIVOS`,
      tag: `incoming-call-${callSessionId}`,
      url: openUrl,
      answerUrl,
      declineUrl,
      conversationId,
      callSessionId,
      callerName,
      notificationType: "incoming_call",
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300],
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(subscription, notificationPayload)
          return { ok: true, id: sub.id }
        } catch (error: any) {
          const statusCode = error?.statusCode

          if (statusCode === 404 || statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id)
          }

          throw error
        }
      })
    )

    return NextResponse.json({
      ok: true,
      sent: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    })
  } catch (error: any) {
    console.error("send-call-push error:", error)
    return NextResponse.json(
      { error: error?.message || "Eroare necunoscută." },
      { status: 500 }
    )
  }
}
