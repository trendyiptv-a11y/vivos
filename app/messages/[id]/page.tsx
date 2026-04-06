"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type Message = {
  id: string
  sender_id: string
  body: string
  created_at: string
}

type Member = {
  member_id: string
  name: string | null
  alias: string | null
  email: string | null
}

function sortMessages(list: Message[]) {
  return [...list].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

function upsertMessage(list: Message[], incoming: Message) {
  const exists = list.some((msg) => msg.id === incoming.id)
  if (exists) return list
  return sortMessages([...list, incoming])
}

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = String(params.id)

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])

  const bottomRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const markActiveConversation = useCallback(
    async (currentUserId: string) => {
      const { error } = await supabase
        .from("active_conversations")
        .upsert(
          {
            user_id: currentUserId,
            conversation_id: conversationId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,conversation_id" }
        )

      if (error) {
        console.error("Active conversation upsert error:", error)
      }
    },
    [conversationId]
  )

  const clearActiveConversation = useCallback(
    async (currentUserId: string) => {
      const { error } = await supabase
        .from("active_conversations")
        .delete()
        .eq("user_id", currentUserId)
        .eq("conversation_id", conversationId)

      if (error) {
        console.error("Active conversation delete error:", error)
      }
    },
    [conversationId]
  )

  const loadMessagesOnly = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Load messages error:", error)
      return
    }

    const normalizedMessages: Message[] = (data ?? []).map((item: any) => ({
      id: item.id,
      sender_id: item.sender_id,
      body: item.body,
      created_at: item.created_at,
    }))

    setMessages((prev) => {
      const prevIds = prev.map((m) => m.id).join("|")
      const nextIds = normalizedMessages.map((m) => m.id).join("|")
      if (prevIds === nextIds) return prev
      return normalizedMessages
    })
  }, [conversationId])

  const loadMembersOnly = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_conversation_members_with_profiles", {
      p_conversation_id: conversationId,
    })

    if (error) {
      console.error("Load members error:", error)
      setMembers([])
      return
    }

    const normalizedMembers: Member[] = (data ?? []).map((item: any) => ({
      member_id: item.member_id,
      name: item.name ?? null,
      alias: item.alias ?? null,
      email: item.email ?? null,
    }))

    setMembers(normalizedMembers)
  }, [conversationId])

  useEffect(() => {
    async function loadInitial() {
      setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setUserId(session.user.id)

      await Promise.all([
        loadMessagesOnly(),
        loadMembersOnly(),
        markActiveConversation(session.user.id),
      ])

      setLoading(false)
    }

    loadInitial()
  }, [conversationId, router, loadMessagesOnly, loadMembersOnly, markActiveConversation])

  useEffect(() => {
    if (!userId) return

    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        await markActiveConversation(userId)
        await loadMessagesOnly()
      } else {
        await clearActiveConversation(userId)
      }
    }

    const handleFocus = async () => {
      await markActiveConversation(userId)
      await loadMessagesOnly()
    }

    const handleOnline = async () => {
      await markActiveConversation(userId)
      await loadMessagesOnly()
    }

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        markActiveConversation(userId)
      }
    }, 15000)

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("online", handleOnline)

    return () => {
      window.clearInterval(heartbeat)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("online", handleOnline)
      clearActiveConversation(userId)
    }
  }, [userId, markActiveConversation, clearActiveConversation, loadMessagesOnly])

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-live-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as any

          if (!incoming?.id) return

          const newMessage: Message = {
            id: incoming.id,
            sender_id: incoming.sender_id,
            body: incoming.body,
            created_at: incoming.created_at,
          }

          setMessages((prev) => upsertMessage(prev, newMessage))
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const otherName = useMemo(() => {
    const other = members.find((m) => m.member_id !== userId)

    return (
      other?.name?.trim() ||
      other?.alias?.trim() ||
      other?.email?.trim() ||
      "Membru"
    )
  }, [members, userId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !userId) return

    setSending(true)

    const cleanBody = body.trim()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      alert("Sesiunea nu este validă. Reautentifică-te.")
      setSending(false)
      return
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: cleanBody,
      })
      .select("id, sender_id, body, created_at")
      .single()

    if (error) {
      alert(`Mesajul nu a putut fi trimis: ${error.message}`)
      setSending(false)
      return
    }

    if (data) {
      const { error: notificationError } = await supabase.rpc("create_message_notification", {
        p_conversation_id: conversationId,
        p_message_id: data.id,
        p_sender_id: userId,
        p_message_body: cleanBody,
      })

      if (notificationError) {
        console.error("Notification error:", notificationError)
      }

      try {
        const pushResponse = await fetch("/api/notifications/send-message-push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conversationId,
            messageId: data.id,
            messageBody: cleanBody,
          }),
        })

        if (!pushResponse.ok) {
          const pushResult = await pushResponse.json().catch(() => null)
          console.error("Push send error:", pushResult)
        }
      } catch (pushError) {
        console.error("Push request failed:", pushError)
      }

      setMessages((prev) =>
        upsertMessage(prev, {
          id: data.id,
          sender_id: data.sender_id,
          body: data.body,
          created_at: data.created_at,
        })
      )
    }

    setBody("")
    setSending(false)
    scrollToBottom()
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Conversație</p>
            <h1 className="text-3xl font-semibold">{otherName}</h1>
          </div>

          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/messages")}>
            Înapoi la mesaje
          </Button>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Mesaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Se încarcă conversația...
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Nu există încă mesaje în această conversație.
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const mine = msg.sender_id === userId
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-2xl border p-4 ${mine ? "bg-slate-50" : "bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{mine ? "Tu" : otherName}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(msg.created_at).toLocaleString("ro-RO")}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{msg.body}</p>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Trimite mesaj</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                placeholder="Scrie mesajul tău..."
              />

              <Button type="submit" className="rounded-2xl" disabled={sending}>
                {sending ? "Se trimite..." : "Trimite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
