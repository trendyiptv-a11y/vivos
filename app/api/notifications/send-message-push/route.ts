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

function setupWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Lipsesc cheile VAPID sau VAPID_SUBJECT.")
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
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
      return NextResponse.json(
        { error: "Lipsesc conversationId sau messageId." },
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

    const senderId = user.id

    const { data: membersData, error: membersError } = await supabase
      .from("conversation_members")
      .select("member_id")
      .eq("conversation_id", conversationId)

    if (membersError || !membersData) {
      return NextResponse.json(
        { error: `Nu am putut citi membrii conversației: ${membersError?.message || "necunoscut"}` },
        { status: 500 }
      )
    }

    const recipient = membersData.find((m: any) => m.member_id !== senderId)

    if (!recipient?.member_id) {
      return NextResponse.json({ ok: true, delivered: 0, reason: "Nu există receptor." })
    }

    const recipientId = recipient.member_id

    const activeThreshold = new Date(Date.now() - 30 * 1000).toISOString()

    const { data: activeConversation, error: activeConversationError } = await supabase
      .from("active_conversations")
      .select("user_id, conversation_id, updated_at")
      .eq("user_id", recipientId)
      .eq("conversation_id", conversationId)
      .gte("updated_at", activeThreshold)
      .maybeSingle()

    if (activeConversationError) {
      console.error("Active conversation check error:", activeConversationError)
    }

    if (activeConversation) {
      await supabase.from("notification_delivery_log").insert({
        user_id: recipientId,
        notification_type: "new_message",
        channel: "push",
        status: "acked",
        conversation_id: conversationId,
        message_id: messageId,
        error_message: "Push suprimat: receptorul este activ în conversație.",
      })

      return NextResponse.json({
        ok: true,
        delivered: 0,
        suppressed: true,
        reason: "Receptorul este deja activ în conversație.",
      })
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
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipientId)
      .eq("is_active", true)

    if (subscriptionsError) {
      return NextResponse.json(
        { error: `Nu am putut citi push subscriptions: ${subscriptionsError.message}` },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      await supabase.from("notification_delivery_log").insert({
        user_id: recipientId,
        notification_type: "new_message",
        channel: "push",
        status: "failed",
        conversation_id: conversationId,
        message_id: messageId,
        error_message: "Nu există push subscription activ.",
      })

      return NextResponse.json({ ok: true, delivered: 0, reason: "Nu există subscription activ." })
    }

    setupWebPush()

    const preview = messageBody.slice(0, 140)

    const payload = JSON.stringify({
      title: "Ai primit un mesaj nou",
      body: `${senderName}: ${preview}`,
      url: `/messages/${conversationId}`,
      tag: `conversation-${conversationId}`,
      conversationId,
      notificationType: "new_message",
    })

    let delivered = 0

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )

        delivered += 1

        await supabase.from("notification_delivery_log").insert({
          user_id: recipientId,
          notification_type: "new_message",
          channel: "push",
          status: "sent",
          conversation_id: conversationId,
          message_id: messageId,
        })
      } catch (pushError: any) {
        const statusCode = pushError?.statusCode || null
        const errorMessage = pushError?.body || pushError?.message || "Push send failed"

        await supabase.from("notification_delivery_log").insert({
          user_id: recipientId,
          notification_type: "new_message",
          channel: "push",
          status: "failed",
          conversation_id: conversationId,
          message_id: messageId,
          error_message: String(errorMessage),
        })

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false, last_seen_at: new Date().toISOString() })
            .eq("id", sub.id)
        }
      }
    }

    return NextResponse.json({ ok: true, delivered })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Eroare internă la trimiterea Web Push." },
      { status: 500 }
    )
  }
}
