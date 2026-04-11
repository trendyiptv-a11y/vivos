import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

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
    const callSessionId = String(body.callSessionId || "")
    const conversationId = String(body.conversationId || "")

    if (!callSessionId || !conversationId) {
      return NextResponse.json(
        { error: "Lipsesc callSessionId sau conversationId." },
        { status: 400 }
      )
    }

    const { data: callSession, error: callError } = await supabaseAdmin
      .from("call_sessions")
      .select("id, callee_id, status")
      .eq("id", callSessionId)
      .eq("callee_id", user.id)
      .maybeSingle()

    if (callError) {
      return NextResponse.json({ error: callError.message }, { status: 500 })
    }

    if (!callSession?.id) {
      return NextResponse.json({ error: "Apelul nu a fost găsit." }, { status: 404 })
    }

    if (callSession.status !== "ringing") {
      return NextResponse.json({ ok: true, skipped: `status-${callSession.status}` })
    }

    const { error: updateError } = await supabaseAdmin
      .from("call_sessions")
      .update({
        status: "rejected",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callSessionId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabaseAdmin.from("call_events").insert({
      call_session_id: callSessionId,
      actor_id: user.id,
      event_type: "reject",
      payload: {
        conversationId,
        source: "notification",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("reject call error:", error)
    return NextResponse.json(
      { error: error?.message || "Eroare necunoscută." },
      { status: 500 }
    )
  }
}
