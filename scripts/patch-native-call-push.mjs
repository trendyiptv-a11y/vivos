import fs from "node:fs"
import path from "node:path"

const targetPath = path.join(process.cwd(), "components", "messenger", "conversation-core.tsx")
let source = fs.readFileSync(targetPath, "utf8")

const helperMarker = "notifyNativeIncomingCallPush"
const helperCode = `
type NativeCallPushArgs = {
  targetUserId?: string | null
  conversationId: string
  callSessionId?: string | null
  callerUserId?: string | null
  callerName?: string | null
  callType: CallType
}

async function notifyNativeIncomingCallPush({
  targetUserId,
  conversationId,
  callSessionId,
  callerUserId,
  callerName,
  callType,
}: NativeCallPushArgs) {
  if (!targetUserId || !conversationId || !callSessionId || !callerUserId) return

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const accessToken = session?.access_token
    if (!accessToken) return

    const readableCallType = callType === "video" ? "video" : "audio"
    const cleanCallerName = callerName?.trim() || "Un membru VIVOS"

    const response = await fetch("https://vivos-api.vercel.app/api/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        targetUserId,
        conversationId,
        type: "call",
        title: "VIVOS Messenger",
        body: `${cleanCallerName} te sună ${readableCallType}`,
        data: {
          kind: "incoming_call",
          conversationId,
          callSessionId,
          callerUserId,
          fromUserId: callerUserId,
          callType,
        },
      }),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => "")
      console.error("Native call push error:", response.status, details)
    }
  } catch (error) {
    console.error("Native call push failed:", error)
  }
}
`

if (!source.includes(`async function ${helperMarker}`)) {
  const marker = "const vivosColors = {"
  if (!source.includes(marker)) {
    throw new Error(`Cannot patch ${targetPath}: vivosColors marker not found.`)
  }
  source = source.replace(marker, `${helperCode}\n${marker}`)
}

const callPushMarker = "notifyNativeIncomingCallPush({"

if (!source.includes(callPushMarker)) {
  const eventIndex = source.indexOf('event: "call_invite"')
  if (eventIndex === -1) {
    throw new Error(`Cannot patch ${targetPath}: call_invite event not found.`)
  }

  const sendStart = source.lastIndexOf("await callChannelRef.current.send(", eventIndex)
  if (sendStart === -1) {
    throw new Error(`Cannot patch ${targetPath}: call_invite send call not found.`)
  }

  const openParen = source.indexOf("(", sendStart)
  let depth = 0
  let insertAt = -1

  for (let i = openParen; i < source.length; i += 1) {
    const char = source[i]
    if (char === "(") depth += 1
    if (char === ")") {
      depth -= 1
      if (depth === 0) {
        insertAt = i + 1
        break
      }
    }
  }

  if (insertAt === -1) {
    throw new Error(`Cannot patch ${targetPath}: could not find end of call_invite send call.`)
  }

  const pushCall = `

        void notifyNativeIncomingCallPush({
          targetUserId: members.find((member) => member.member_id !== userId)?.member_id ?? null,
          conversationId,
          callSessionId: currentCallSessionIdRef.current,
          callerUserId: userId,
          callerName:
            members.find((member) => member.member_id === userId)?.name ||
            members.find((member) => member.member_id === userId)?.alias ||
            "VIVOS",
          callType: currentCallTypeRef.current,
        })`

  source = `${source.slice(0, insertAt)}${pushCall}${source.slice(insertAt)}`
}

fs.writeFileSync(targetPath, source)
console.log("Native call push patch applied.")
