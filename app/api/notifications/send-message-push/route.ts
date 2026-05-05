import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

type SendPushBody = {
  conversationId?: string
  messageId?: string
  messageBody?: string
}

type DevicePushTokenRow = {
  id: string
  token: string
  platform: string | null
  is_active?: boolean | null
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const EXPO_BATCH_SIZE = 100

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

function trySetupWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

function isExpoPushToken(token: string) {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function sendExpoPushNotifications(args: {
  tokens: string[]
  title: string
  body: string
  conversationId: string
  messageId: string
}) {
  const uniqueTokens = Array.from(new Set(args.tokens.filter(isExpoPushToken)))
  if (!uniqueTokens.length) return { delivered: 0, failed: 0, tickets: [] as unknown[] }

  let delivered = 0
  let failed = 0
  const tickets: unknown[] = []

  const messages = uniqueTokens.map((token) => ({
    to: token,
    title: args.title,
    body: args.body,
    sound: "default",
    priority: "high",
    channelId: "vivos-messages",
    data: {
      type: "message",
      kind: "message",
      notificationType: "new_message",
      conversationId: args.conversationId,
      messageId: args.messageId,
      url: `/messages/${args.conversationId}`,
      tag: `conversation-${args.conversationId}`,
    },
  }))

  for (const batch of chunk(messages, EXPO_BATCH_SIZE)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    })

    const result = await response.json().catch(() => null)
    tickets.push(result)

    if (!response.ok) {
      failed += batch.length
      continue
    }

    const ticketList = Array.isArray(result?.data) ? result.data : []
    if (!ticketList.length) {
      delivered += batch.length
      continue
    }

    delivered += ticketList.filter((ticket: any) => ticket?.status === "ok").length
    failed += ticketList.filter((ticket: any) => ticket?.status === "error").length
  }

  return { delivered, failed, tickets }
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
      return NextResponse.json({ ok: true, webDelivered: 0, expoDelivered: 0, reason: "Nu există receptor." })
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
        webDelivered: 0,
        expoDelivered: 0,
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

    const preview = messageBody.slice(0, 140)
    const notificationTitle = "Ai primit un mesaj nou"
    const notificationBody = `${senderName}: ${preview}`

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipientId)
      .eq("is_active", true)

    if (subscriptionsError) {
      return NextResponse.json({ error: `Nu am putut citi push subscriptions: ${subscriptionsError.message}` }, { status: 500 })
    }

    const { data: deviceTokens, error: deviceTokensError } = await supabase
      .from("device_push_tokens")
      .select("id, token, platform, is_active")
      .eq("user_id", recipientId)
      .or("is_active.eq.true,is_active.is.null")

    if (deviceTokensError) {
      return NextResponse.json({ error: `Nu am putut citi device push tokens: ${deviceTokensError.message}` }, { status: 500 })
    }

    const webPushConfigured = trySetupWebPush()

    const payload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      url: `/messages/${conversationId}`,
      tag: `conversation-${conversationId}`,
      conversationId,
      notificationType: "new_message",
    })

    let webDelivered = 0

    if ((subscriptions || []).length > 0 && webPushConfigured) {
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          webDelivered += 1
          await supabase.from("notification_delivery_log").insert({
            user_id: recipientId,
            notification_type: "new_message",
            channel: "web_push",
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
            channel: "web_push",
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
    }

    const expoTokens = ((deviceTokens ?? []) as DevicePushTokenRow[])
      .map((row) => row.token)
      .filter((value): value is string => typeof value === "string")
      .filter(isExpoPushToken)

    const expoResult = await sendExpoPushNotifications({
      tokens: expoTokens,
      title: notificationTitle,
      body: notificationBody,
      conversationId,
      messageId,
    })

    if (expoResult.delivered > 0) {
      await supabase.from("notification_delivery_log").insert({
        user_id: recipientId,
        notification_type: "new_message",
        channel: "expo_push",
        status: "sent",
        conversation_id: conversationId,
        message_id: messageId,
      })
    }

    if (expoResult.failed > 0) {
      await supabase.from("notification_delivery_log").insert({
        user_id: recipientId,
        notification_type: "new_message",
        channel: "expo_push",
        status: "failed",
        conversation_id: conversationId,
        message_id: messageId,
        error_message: JSON.stringify(expoResult.tickets).slice(0, 1000),
      })
    }

    if (webDelivered === 0 && expoResult.delivered === 0 && (subscriptions || []).length === 0 && expoTokens.length === 0) {
      await supabase.from("notification_delivery_log").insert({
        user_id: recipientId,
        notification_type: "new_message",
        channel: "push",
        status: "failed",
        conversation_id: conversationId,
        message_id: messageId,
        error_message: "Nu există niciun target activ pentru push.",
      })
    }

    return NextResponse.json({
      ok: true,
      webPushConfigured,
      webDelivered,
      expoDelivered: expoResult.delivered,
      expoFailed: expoResult.failed,
      expoTokenCount: expoTokens.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Eroare internă la trimiterea push." }, { status: 500 })
  }
}
