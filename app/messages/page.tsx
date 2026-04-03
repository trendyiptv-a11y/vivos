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

type MemberRow = {
  conversation_id: string
  member_id: string
  profiles: {
    id: string
    name: string | null
    alias: string | null
    email: string | null
  } | null
}

type MessageRow = {
  conversation_id: string
  body: string
  created_at: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
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

      const { data: convData } = await supabase
        .from("conversations")
        .select("id, created_at")
        .order("created_at", { ascending: false })

      const conversationIds = (convData ?? []).map((c) => c.id)

      if (conversationIds.length === 0) {
        setConversations([])
        setMembers([])
        setLatestMessages([])
        setLoading(false)
        return
      }

      const [{ data: membersData }, { data: messagesData }] = await Promise.all([
        supabase
          .from("conversation_members")
          .select("conversation_id, member_id, profiles:profiles!conversation_members_member_id_fkey(id, name, alias, email)")
          .in("conversation_id", conversationIds),
        supabase
          .from("messages")
          .select("conversation_id, body, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
      ])

      setConversations((convData as ConversationRow[]) ?? [])
      setMembers((membersData as MemberRow[]) ?? [])
      setLatestMessages((messagesData as MessageRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  const conversationCards = useMemo(() => {
    return conversations.map((conv) => {
      const other = members.find((m) => m.conversation_id === conv.id && m.member_id !== userId)
      const latest = latestMessages.find((m) => m.conversation_id === conv.id)
      const name =
        other?.profiles?.name?.trim() ||
        other?.profiles?.alias?.trim() ||
        other?.profiles?.email?.trim() ||
        "Membru"

      return {
        id: conv.id,
        name,
        preview: latest?.body || "Fără mesaje încă",
        date: latest?.created_at || conv.created_at,
      }
    })
  }, [conversations, members, latestMessages, userId])

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Mesaje</p>
            <h1 className="text-3xl font-semibold">Conversații</h1>
          </div>

          <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/")}>
            Înapoi
          </Button>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Chat între membri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă mesajele...</div>
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
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.date).toLocaleString("ro-RO")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.preview}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
