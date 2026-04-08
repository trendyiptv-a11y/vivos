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

type ConversationProfile = {
  id: string
  name: string | null
  alias: string | null
  email: string | null
}

type MemberRow = {
  conversation_id: string
  member_id: string
  profile: ConversationProfile | null
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

      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("id, created_at")
        .order("created_at", { ascending: false })

      if (convError) {
        console.error("Load conversations error:", convError)
        setConversations([])
        setMembers([])
        setLatestMessages([])
        setLoading(false)
        return
      }

      const conversationIds = (convData ?? []).map((c) => c.id)

      if (conversationIds.length === 0) {
        setConversations([])
        setMembers([])
        setLatestMessages([])
        setLoading(false)
        return
      }

      const [{ data: membersData, error: membersError }, { data: messagesData, error: messagesError }] =
        await Promise.all([
          supabase
            .from("conversation_members")
            .select("conversation_id, member_id")
            .in("conversation_id", conversationIds),
          supabase
            .from("messages")
            .select("conversation_id, body, created_at")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false }),
        ])

      if (membersError) {
        console.error("Load conversation members error:", membersError)
      }

      if (messagesError) {
        console.error("Load messages error:", messagesError)
      }

      const rawMembers = (membersData ?? []).map((item: any) => ({
        conversation_id: item.conversation_id as string,
        member_id: item.member_id as string,
      }))

      const memberIds = Array.from(new Set(rawMembers.map((item) => item.member_id)))

      let profilesMap = new Map<string, ConversationProfile>()

      if (memberIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, alias, email")
          .in("id", memberIds)

        if (profilesError) {
          console.error("Load profiles error:", profilesError)
        } else {
          profilesMap = new Map(
            (profilesData ?? []).map((profile: any) => [
              profile.id,
              {
                id: profile.id,
                name: profile.name ?? null,
                alias: profile.alias ?? null,
                email: profile.email ?? null,
              } as ConversationProfile,
            ])
          )
        }
      }

      const normalizedMembers: MemberRow[] = rawMembers.map((item) => ({
        conversation_id: item.conversation_id,
        member_id: item.member_id,
        profile: profilesMap.get(item.member_id) ?? null,
      }))

      const normalizedMessages: MessageRow[] = (messagesData ?? []).map((item: any) => ({
        conversation_id: item.conversation_id,
        body: item.body,
        created_at: item.created_at,
      }))

      setConversations((convData as ConversationRow[]) ?? [])
      setMembers(normalizedMembers)
      setLatestMessages(normalizedMessages)
      setLoading(false)
    }

    load()
  }, [router])

  const conversationCards = useMemo<ConversationCard[]>(() => {
    return conversations.map((conv) => {
      const other = members.find((m) => m.conversation_id === conv.id && m.member_id !== userId)
      const profile = other?.profile ?? null
      const latest = latestMessages.find((m) => m.conversation_id === conv.id)

      const displayName =
        profile?.name?.trim() ||
        profile?.alias?.trim() ||
        profile?.email?.trim() ||
        "Membru"

      return {
        id: conv.id,
        name: displayName,
        email: profile?.email?.trim() || null,
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
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {item.email && item.email !== item.name ? (
                        <p className="truncate text-sm text-slate-500">{item.email}</p>
                      ) : null}
                    </div>

                    <p className="shrink-0 text-xs text-slate-500">
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
