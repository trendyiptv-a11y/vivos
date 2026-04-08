import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "").trim()

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    await supabaseAdmin.from("active_conversations").delete().eq("user_id", userId)
    await supabaseAdmin.from("call_events").delete().eq("actor_id", userId)
    await supabaseAdmin.from("conversation_hidden_for_users").delete().eq("user_id", userId)
    await supabaseAdmin.from("messages").delete().eq("sender_id", userId)
    await supabaseAdmin.from("mutual_fund_requests").delete().eq("author_id", userId)
    await supabaseAdmin.from("notification_delivery_log").delete().eq("user_id", userId)
    await supabaseAdmin.from("notification_preferences").delete().eq("user_id", userId)
    await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId)
    await supabaseAdmin.from("wallet_grants").delete().eq("user_id", userId)
    await supabaseAdmin.from("wallet_transactions").delete().eq("sender_id", userId)
    await supabaseAdmin.from("wallet_transactions").delete().eq("receiver_id", userId)
    await supabaseAdmin.from("wallet_accounts").delete().eq("user_id", userId)
    await supabaseAdmin.from("market_posts").delete().eq("author_id", userId)

    await supabaseAdmin.from("call_sessions").delete().eq("caller_id", userId)
    await supabaseAdmin.from("call_sessions").delete().eq("callee_id", userId)

    await supabaseAdmin.from("conversation_members").delete().eq("member_id", userId)
    await supabaseAdmin.from("conversations").delete().eq("created_by", userId)

    await supabaseAdmin.from("profiles").delete().eq("id", userId)

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      return NextResponse.json(
        { error: `Auth delete failed: ${deleteAuthError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
