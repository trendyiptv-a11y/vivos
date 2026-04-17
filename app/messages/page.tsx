"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

type ConversationRow = {
  id: string
  created_at: string
}

type HiddenConversationRow = {
  conversation_id: string
}

type RpcMemberRow = {
  member_id: string
  name: string | null
  alias: string | null
  email: string | null
}

type ConversationMemberGroup = {
  conversation_id: string
  members: RpcMemberRow[]
}

type MessageRow = {
  id?: string
  conversation_id: string
  body: string
  created_at: string
}

type NotificationRow = {
  id: string
  ref_id: string | null
  is_read: boolean
  event_type: string
  user_id: string | null
}

type ConversationCard = {
  id: string
  name: string
  email: string | null
  preview: string
  date: string
  hasUnread: boolean
  unreadCount: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [conversationMembers, setConversationMembers] = useState<ConversationMemberGroup[]>([])
  const [latestMessages, setLatestMessages] = useState<MessageRow[]>([])
  const [unreadConversationCounts, setUnreadConversationCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setUserId(session.user.id)

      const [{ data: convData, error: convError }, { data: hiddenData, error: hiddenError }] =
        await Promise.all([
          supabase
            .from("conversations")
            .select("id, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("conversation_hidden_for_users")
            .select("conversation_id")
            .eq("user_id", session.user.id),
        ])

      if (convError) {
        console.error("Load conversations error:", convError)
        setConversations([])
        setConversationMembers([])
        setLatestMessages([])
        setUnreadConversationCounts({})
        setLoading(false)
        return
      }

      if (hiddenError) {
        console.error("Load hidden conversations error:", hiddenError)
      }

      const hiddenIds = new Set(
        ((hiddenData ?? []) as HiddenConversationRow[]).map((item) => item.conversation_id)
      )

      const normalizedConversations = ((convData as ConversationRow[]) ?? []).filter(
        (conv) => !hiddenIds.has(conv.id)
      )

      const conversationIds = normalizedConversations.map((c) => c.id)

      if (conversationIds.length === 0) {
        setConversations([])
        setConversationMembers([])
        setLatestMessages([])
        setUnreadConversationCounts({})
        setLoading(false)
        return
      }

      const [membersResults, messagesResult, unreadNotificationsResult] = await Promise.all([
        Promise.all(
          conversationIds.map(async (conversationId) => {
            const { data, error } = await supabase.rpc("get_conversation_members_with_profiles", {
              p_conversation_id: conversationId,
            })

            if (error) {
              console.error(`Load members RPC error for conversation ${conversationId}:`, error)
              return {
                conversation_id: conversationId,
                members: [],
              } as ConversationMemberGroup
            }

            return {
              conversation_id: conversationId,
              members: ((data ?? []) as any[]).map((item) => ({
                member_id: item.member_id,
                name: item.name ?? null,
                alias: item.alias ?? null,
                email: item.email ?? null,
              })),
            } as ConversationMemberGroup
          })
        ),
        supabase
          .from("messages")
          .select("id, conversation_id, body, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("notifications")
          .select("id, ref_id, is_read, event_type, user_id")
          .eq("event_type", "new_message")
          .eq("is_read", false)
          .eq("user_id", session.user.id),
      ])

      const normalizedMessages: MessageRow[] = ((messagesResult.data ?? []) as any[]).map((item) => ({
        id: item.id,
        conversation_id: item.conversation_id,
        body: item.body,
        created_at: item.created_at,
      }))

      if (messagesResult.error) {
        console.error("Load messages error:", messagesResult.error)
      }

      const unreadNotifications = (unreadNotificationsResult.data ?? []) as NotificationRow[]
      if (unreadNotificationsResult.error) {
        console.error("Load unread notifications error:", unreadNotificationsResult.error)
      }

      const unreadMessageIds = unreadNotifications
        .map((item) => item.ref_id)
        .filter((value): value is string => !!value)

      const unreadCountsByConversation: Record<string, number> = {}

      if (unreadMessageIds.length > 0) {
        const { data: unreadMessages, error: unreadMessagesError } = await supabase
          .from("messages")
          .select("id, conversation_id")
          .in("id", unreadMessageIds)

        if (unreadMessagesError) {
          console.error("Resolve unread message conversations error:", unreadMessagesError)
        } else {
          ;((unreadMessages ?? []) as any[]).forEach((row) => {
            const conversationId = row.conversation_id as string | null
            if (!conversationId || hiddenIds.has(conversationId)) return
            unreadCountsByConversation[conversationId] =
              (unreadCountsByConversation[conversationId] ?? 0) + 1
          })
        }
      }

      setConversations(normalizedConversations)
      setConversationMembers(membersResults)
      setLatestMessages(normalizedMessages)
      setUnreadConversationCounts(unreadCountsByConversation)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel("messages-list-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          load()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const conversationCards = useMemo<ConversationCard[]>(() => {
    return conversations
      .map((conv) => {
        const memberGroup = conversationMembers.find((group) => group.conversation_id === conv.id)
        const other = memberGroup?.members.find((m) => m.member_id !== userId) ?? null
        const latest = latestMessages.find((m) => m.conversation_id === conv.id)
        const unreadCount = unreadConversationCounts[conv.id] ?? 0

        const displayName =
          other?.name?.trim() ||
          other?.alias?.trim() ||
          other?.email?.trim() ||
          "Membru"

        return {
          id: conv.id,
          name: displayName,
          email: other?.email?.trim() || null,
          preview: latest?.body || "Fără mesaje încă",
          date: latest?.created_at || conv.created_at,
          hasUnread: unreadCount > 0,
          unreadCount,
        }
      })
      .sort((a, b) => {
        if (a.hasUnread !== b.hasUnread) {
          return a.hasUnread ? -1 : 1
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
  }, [conversations, conversationMembers, latestMessages, unreadConversationCounts, userId])

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="sticky top-0 z-10 flex flex-col gap-3 bg-slate-50 px-6 pb-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Mesaje</p>
            <h1 className="text-3xl font-semibold">Conversații</h1>
          </div>

          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/")}>
            Înapoi
          </Button>
        </div>

        <Card className="mx-6 mb-24 rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Chat între membri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Se încarcă mesajele...
              </div>
            ) : conversationCards.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Nu există încă conversații. Începe una din piață, fond sau profilul unui membru.
              </div>
            ) : (
              conversationCards.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/messages/${item.id}`)}
                  className={`block w-full rounded-2xl border p-4 text-left transition hover:bg-slate-50 ${
                    item.hasUnread ? "border-slate-300 bg-slate-50/80" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate pr-3 text-lg text-slate-900 ${
                            item.hasUnread ? "font-bold" : "font-semibold"
                          }`}
                        >
                          {item.name}
                        </p>
                        {item.hasUnread ? (
                          <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                        ) : null}
                      </div>

                      {item.email && item.email !== item.name ? (
                        <p className="mt-1 truncate text-sm text-slate-500">{item.email}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-xs text-slate-500">
                        {new Date(item.date).toLocaleString("ro-RO", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {item.unreadCount > 0 ? (
                        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p
                    className={`mt-3 truncate text-sm ${
                      item.hasUnread ? "font-medium text-slate-800" : "text-slate-600"
                    }`}
                  >
                    {item.preview}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
