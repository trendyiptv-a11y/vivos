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
  conversation_id: string
  body: string
  created_at: string
}

type ConversationCard = {
  id: string
  name: string
  email: string | null
  preview: string
  date: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [conversationMembers, setConversationMembers] = useState<ConversationMemberGroup[]>([])
  const [latestMessages, setLatestMessages] = useState<MessageRow[]>([])

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
        setLoading(false)
        return
      }

      const [membersResults, messagesResult] = await Promise.all([
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
          .select("conversation_id, body, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
      ])

      const normalizedMessages: MessageRow[] = ((messagesResult.data ?? []) as any[]).map((item) => ({
        conversation_id: item.conversation_id,
        body: item.body,
        created_at: item.created_at,
      }))

      if (messagesResult.error) {
        console.error("Load messages error:", messagesResult.error)
      }

      setConversations(normalizedConversations)
      setConversationMembers(membersResults)
      setLatestMessages(normalizedMessages)
      setLoading(false)
    }

    load()
  }, [router])

  const conversationCards = useMemo<ConversationCard[]>(() => {
    return conversations.map((conv) => {
      const memberGroup = conversationMembers.find((group) => group.conversation_id === conv.id)
      const other = memberGroup?.members.find((m) => m.member_id !== userId) ?? null
      const latest = latestMessages.find((m) => m.conversation_id === conv.id)

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
      }
    })
  }, [conversations, conversationMembers, latestMessages, userId])

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
                  className="block w-full rounded-2xl border p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate pr-3 text-lg font-semibold text-slate-900">
                        {item.name}
                      </p>

                      {item.email && item.email !== item.name ? (
                        <p className="mt-1 truncate text-sm text-slate-500">{item.email}</p>
                      ) : null}
                    </div>

                    <p className="shrink-0 text-xs text-slate-500">
                      {new Date(item.date).toLocaleString("ro-RO", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <p className="mt-3 truncate text-sm text-slate-600">{item.preview}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
