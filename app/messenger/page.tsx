"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme, getVivosAvatarGradient } from "@/lib/theme/vivos-theme"
import { useI18n } from "@/lib/i18n/provider"
import { Bell, MessageCircle, Phone, Search } from "lucide-react"

type AppLang = "ro" | "da" | "en"

const t: Record<AppLang, Record<string, string>> = {
  ro: {
    title: "VIVOS Messenger",
    subtitle: "Mesaje private",
    conversations: "Conversații",
    loading: "Se încarcă...",
    empty: "Nicio conversație încă.",
    noMessages: "Fără mesaje",
    memberFallback: "Membru",
    login: "Autentifică-te",
    search: "Caută în conversații...",
    unread: "Necitite",
    all: "Toate",
    directSpace: "Spațiu direct de legătură",
    directSpaceBody: "Mesaje clare, apeluri rapide și contact uman fără zgomot inutil.",
    openCalls: "Deschide apeluri",
    activeNow: "Active acum",
    results: "rezultate",
  },
  da: {
    title: "VIVOS Messenger",
    subtitle: "Private beskeder",
    conversations: "Samtaler",
    loading: "Indlæser...",
    empty: "Ingen samtaler endnu.",
    noMessages: "Ingen beskeder",
    memberFallback: "Medlem",
    login: "Log ind",
    search: "Søg i samtaler...",
    unread: "Ulæste",
    all: "Alle",
    directSpace: "Direkte kontaktområde",
    directSpaceBody: "Klare beskeder, hurtige opkald og menneskelig kontakt uden unødig støj.",
    openCalls: "Åbn opkald",
    activeNow: "Aktive nu",
    results: "resultater",
  },
  en: {
    title: "VIVOS Messenger",
    subtitle: "Private messages",
    conversations: "Conversations",
    loading: "Loading...",
    empty: "No conversations yet.",
    noMessages: "No messages",
    memberFallback: "Member",
    login: "Log in",
    search: "Search conversations...",
    unread: "Unread",
    all: "All",
    directSpace: "Direct connection space",
    directSpaceBody: "Clear messages, quick calls, and human contact without unnecessary noise.",
    openCalls: "Open calls",
    activeNow: "Active now",
    results: "results",
  },
}

type ConversationRow = { id: string; created_at: string }
type HiddenRow = { conversation_id: string }
type MemberRow = { member_id: string; name: string | null; alias: string | null; email: string | null }
type MemberGroup = { conversation_id: string; members: MemberRow[] }
type MessageRow = { id?: string; conversation_id: string; body: string; created_at: string }
type NotifRow = { id: string; ref_id: string | null; is_read: boolean; event_type: string; user_id: string | null }

type ConvCard = {
  id: string
  name: string
  email: string | null
  preview: string
  date: string
  hasUnread: boolean
  unreadCount: number
}

function localeFrom(lang: string) {
  if (lang === "da") return "da-DK"
  if (lang === "en") return "en-US"
  return "ro-RO"
}

export default function MessengerPage() {
  const router = useRouter()
  const { language } = useI18n()
  const lang = (language === "da" || language === "en" ? language : "ro") as AppLang
  const text = t[lang]
  const locale = localeFrom(lang)

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState("")
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [members, setMembers] = useState<MemberGroup[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({})

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  useEffect(() => {
    async function loadUnread() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) return
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false)
      setUnreadCount(count || 0)
    }
    loadUnread()
    const ch = supabase
      .channel("messenger-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadUnread)
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push("/messenger/login?redirect=/messenger")
        return
      }
      setUserId(session.user.id)
      setUserEmail(session.user.email ?? null)

      const [{ data: convData }, { data: hiddenData }] = await Promise.all([
        supabase.from("conversations").select("id, created_at").order("created_at", { ascending: false }),
        supabase.from("conversation_hidden_for_users").select("conversation_id").eq("user_id", session.user.id),
      ])

      const hiddenIds = new Set(((hiddenData ?? []) as HiddenRow[]).map((h) => h.conversation_id))
      const convs = ((convData ?? []) as ConversationRow[]).filter((c) => !hiddenIds.has(c.id))
      const ids = convs.map((c) => c.id)

      if (ids.length === 0) {
        setConversations([])
        setMembers([])
        setMessages([])
        setUnreadByConv({})
        setLoading(false)
        return
      }

      const [memberGroups, msgResult, notifResult] = await Promise.all([
        Promise.all(
          ids.map(async (cid) => {
            const { data } = await supabase.rpc("get_conversation_members_with_profiles", { p_conversation_id: cid })
            return {
              conversation_id: cid,
              members: ((data ?? []) as any[]).map((item) => ({
                member_id: item.member_id,
                name: item.name ?? null,
                alias: item.alias ?? null,
                email: item.email ?? null,
              })),
            } as MemberGroup
          })
        ),
        supabase.from("messages").select("id, conversation_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
        supabase.from("notifications").select("id, ref_id, is_read, event_type, user_id").eq("event_type", "new_message").eq("is_read", false).eq("user_id", session.user.id),
      ])

      const msgs = ((msgResult.data ?? []) as any[]).map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        body: m.body,
        created_at: m.created_at,
      }))

      const unreadMsgIds = ((notifResult.data ?? []) as NotifRow[])
        .map((n) => n.ref_id)
        .filter((v): v is string => !!v)
      const unreadByConvMap: Record<string, number> = {}

      if (unreadMsgIds.length > 0) {
        const { data: unreadMsgs } = await supabase.from("messages").select("id, conversation_id").in("id", unreadMsgIds)
        ;((unreadMsgs ?? []) as any[]).forEach((row) => {
          const cid = row.conversation_id as string
          if (!cid || hiddenIds.has(cid)) return
          unreadByConvMap[cid] = (unreadByConvMap[cid] ?? 0) + 1
        })
      }

      setConversations(convs)
      setMembers(memberGroups)
      setMessages(msgs)
      setUnreadByConv(unreadByConvMap)
      setLoading(false)
    }

    load()
    const ch = supabase
      .channel("messenger-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [router])

  const cards = useMemo<ConvCard[]>(() => {
    return conversations
      .map((conv) => {
        const group = members.find((g) => g.conversation_id === conv.id)
        const other = group?.members.find((m) => m.member_id !== userId) ?? null
        const latest = messages.find((m) => m.conversation_id === conv.id)
        const unread = unreadByConv[conv.id] ?? 0
        const name = other?.name?.trim() || other?.alias?.trim() || other?.email?.trim() || text.memberFallback
        return {
          id: conv.id,
          name,
          email: other?.email?.trim() || null,
          preview: latest?.body || text.noMessages,
          date: latest?.created_at || conv.created_at,
          hasUnread: unread > 0,
          unreadCount: unread,
        }
      })
      .sort((a, b) => {
        if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
  }, [conversations, members, messages, unreadByConv, userId, text])

  const filteredCards = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return cards
    return cards.filter((card) => {
      return [card.name, card.email || "", card.preview].some((value) => value.toLowerCase().includes(term))
    })
  }, [cards, search])

  const activeNowCount = useMemo(() => cards.filter((card) => card.hasUnread).length, [cards])

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8,20,40,0.16)",
        }}
      >
        <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: vivosTheme.gradients.activeIcon }}>
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
                VIVOS
              </p>
              <h1 className="text-lg font-semibold text-white">Messenger</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-2xl border"
                style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)" }}
                onClick={() => router.push("/messenger/notifications")}
              >
                <Bell className="h-5 w-5 text-white" />
              </button>
              {unreadCount > 0 && (
                <div
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
                  style={{ background: vivosTheme.colors.purple }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </div>

            {userEmail ? (
              <div className="relative" ref={menuRef}>
                <button className="rounded-2xl" onClick={() => setMenuOpen((p) => !p)}>
                  <Avatar className="h-10 w-10 rounded-2xl border border-white/15">
                    <AvatarFallback className="rounded-2xl text-white text-sm font-semibold" style={{ background: getVivosAvatarGradient(userEmail) }}>
                      {userEmail.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-44 rounded-2xl border p-2 shadow-lg" style={{ background: "rgba(18,46,84,0.98)", borderColor: "rgba(255,255,255,0.10)" }}>
                    <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10" onClick={() => { setMenuOpen(false); router.push("/messenger/profile") }}>
                      Profil
                    </button>
                    <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10" onClick={() => { setMenuOpen(false); router.push("/messenger/settings") }}>
                      Setări
                    </button>
                    <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10" onClick={() => { setMenuOpen(false); router.push("/messenger/about") }}>
                      Despre
                    </button>
                    <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 hover:bg-white/10" onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); router.push("/messenger/login") }}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button className="rounded-2xl border-0 text-sm" style={{ background: vivosTheme.gradients.activeIcon, color: vivosTheme.colors.white }} onClick={() => router.push("/messenger/login") }>
                {text.login}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-28">
        <section className="rounded-[28px] border p-4" style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.10)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.52)" }}>
                {text.subtitle}
              </p>
              <h2 className="text-xl font-semibold text-white">{text.directSpace}</h2>
              <p className="max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.62)" }}>
                {text.directSpaceBody}
              </p>
            </div>
            <Button className="rounded-2xl border-0" style={{ background: vivosTheme.gradients.activeIcon, color: vivosTheme.colors.white }} onClick={() => router.push("/messenger/calls")}>
              <Phone className="mr-2 h-4 w-4" />
              {text.openCalls}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>{text.conversations}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{cards.length}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>{text.unread}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{unreadCount}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.46)" }}>{text.activeNow}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{activeNowCount}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border p-3" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 rounded-2xl border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.45)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={text.search}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.48)" }}>
              {filteredCards.length} {text.results}
            </p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="rounded-full px-2.5 py-1" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.72)" }}>{text.all}</span>
              <span className="rounded-full px-2.5 py-1" style={{ background: unreadCount ? "rgba(154,113,193,0.22)" : "rgba(255,255,255,0.05)", color: unreadCount ? "#fff" : "rgba(255,255,255,0.55)" }}>{text.unread}: {unreadCount}</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {text.loading}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {search.trim() ? `${text.results}: 0` : text.empty}
          </div>
        ) : (
          filteredCards.map((card) => (
            <button
              key={card.id}
              onClick={() => router.push(`/messenger/${card.id}`)}
              className="flex w-full items-start gap-4 rounded-3xl border p-4 text-left transition"
              style={{
                background: card.hasUnread ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                borderColor: card.hasUnread ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)",
              }}
            >
              <Avatar className="h-12 w-12 shrink-0 rounded-2xl">
                <AvatarFallback className="rounded-2xl text-white font-semibold" style={{ background: getVivosAvatarGradient(card.email || card.name) }}>
                  {card.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`truncate text-base text-white ${card.hasUnread ? "font-bold" : "font-medium"}`}>{card.name}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{card.hasUnread ? text.unread : text.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {new Date(card.date).toLocaleString(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {card.unreadCount > 0 && (
                      <span className="flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: vivosTheme.colors.purple }}>
                        {card.unreadCount > 99 ? "99+" : card.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <p className={`mt-1 truncate text-sm ${card.hasUnread ? "font-medium text-white/80" : "text-white/45"}`}>
                  {card.preview}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </main>
  )
}
