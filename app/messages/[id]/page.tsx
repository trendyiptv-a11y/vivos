"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, MoreVertical, Phone, PhoneOff, PhoneIncoming, Mic, Send } from "lucide-react"
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

type CallUiState = "idle" | "outgoing" | "incoming" | "connected"

type IncomingCall = {
  callSessionId: string
  fromUserId: string
}

type RuntimeNetworkDetail = {
  connected?: boolean
  connectionType?: string
  source?: string
}

type NotificationRefRow = {
  id: string
  ref_id: string | null
}

function emitWindowEvent(name: string, detail: Record<string, unknown> = {}) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch (error) {
    console.error(`Window event emit error for ${name}:`, error)
  }
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

function describeMicrophoneError(error: any) {
  const name = String(error?.name || "")
  const message = String(error?.message || "")
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "Accesul la microfon este blocat. Permite microfonul pentru VIVOS și încearcă din nou."
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "Nu a fost găsit niciun microfon disponibil pe device."
  if (name === "NotReadableError" || name === "TrackStartError")
    return "Microfonul nu poate fi pornit acum. Închide alte aplicații care folosesc audio și încearcă din nou."
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError")
    return "Configurația audio a device-ului nu este compatibilă momentan."
  if (message) return `Microfon indisponibil: ${message}`
  return "Microfonul nu poate fi folosit acum în aplicație."
}

function isNearBottom(threshold = 160) {
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
  const totalHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0
  return totalHeight - (scrollTop + viewportHeight) <= threshold
}

function formatMessageTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
}

function formatMessageDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const conversationId = String(params.id)

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [audioPermissionMessage, setAudioPermissionMessage] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [connectionLabel, setConnectionLabel] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [publicPulseCount, setPublicPulseCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const [callUiState, setCallUiState] = useState<CallUiState>("idle")
  const [callBusy, setCallBusy] = useState(false)
  const [currentCallSessionId, setCurrentCallSessionId] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const callChannelRef = useRef<any>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const currentCallSessionIdRef = useRef<string | null>(null)
  const autoActionHandledRef = useRef<string | null>(null)
  const acceptedCallSessionRef = useRef<string | null>(null)
  const initialScrollDoneRef = useRef(false)
  const shouldStickToBottomRef = useRef(true)
  const previousMessageCountRef = useRef(0)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // ── All hooks / logic below are IDENTICAL to original ─────────────────────

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) return
      if (!profileMenuRef.current.contains(event.target as Node)) setProfileMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    async function loadTopBarState() {
      const { data: { session } } = await supabase.auth.getSession()
      setUserEmail(session?.user?.email ?? null)
      if (!session?.user) { setUnreadCount(0); setPublicPulseCount(0); return }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [{ count: unread, error: unreadError }, { count: pulse, error: pulseError }] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", session.user.id).eq("is_read", false),
        supabase.from("public_activity_feed").select("*", { count: "exact", head: true }).gte("created_at", since),
      ])
      if (!unreadError) setUnreadCount(unread || 0)
      if (!pulseError) setPublicPulseCount(pulse || 0)
    }
    loadTopBarState()
    const notificationsChannel = supabase.channel("conversation-topbar-notifications").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => { loadTopBarState() }).subscribe()
    const pulseChannel = supabase.channel("conversation-topbar-pulse").on("postgres_changes", { event: "INSERT", schema: "public", table: "public_activity_feed" }, () => { loadTopBarState() }).subscribe()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { loadTopBarState() })
    return () => { supabase.removeChannel(notificationsChannel); supabase.removeChannel(pulseChannel); subscription.unsubscribe() }
  }, [])

  useEffect(() => { currentCallSessionIdRef.current = currentCallSessionId }, [currentCallSessionId])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" })
  }, [])

  useEffect(() => {
    const handleScroll = () => { shouldStickToBottomRef.current = isNearBottom() }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (!messages.length) return
    const previousCount = previousMessageCountRef.current
    const hasNewMessages = messages.length > previousCount
    previousMessageCountRef.current = messages.length
    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true
      shouldStickToBottomRef.current = true
      scrollToBottom("auto")
      const rafId = window.requestAnimationFrame(() => scrollToBottom("auto"))
      const timerId = window.setTimeout(() => scrollToBottom("auto"), 120)
      return () => { window.cancelAnimationFrame(rafId); window.clearTimeout(timerId) }
    }
    if (hasNewMessages && shouldStickToBottomRef.current) scrollToBottom("smooth")
  }, [messages, scrollToBottom])

  useEffect(() => {
    initialScrollDoneRef.current = false
    shouldStickToBottomRef.current = true
    previousMessageCountRef.current = 0
  }, [conversationId])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [body])

  const stopRingtone = useCallback(() => {
    const el = ringtoneRef.current
    if (!el) return
    try { el.pause(); el.currentTime = 0 } catch (error) { console.error("Stop ringtone error:", error) }
  }, [])

  const playRingtone = useCallback(async () => {
    const el = ringtoneRef.current
    if (!el) return
    try { el.loop = true; await el.play() } catch (error) { console.error("Play ringtone error:", error) }
  }, [])

  const cleanupAudioCall = useCallback(() => {
    stopRingtone()
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.onconnectionstatechange = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((track) => track.stop()); localStreamRef.current = null }
    if (remoteAudioRef.current) { try { remoteAudioRef.current.pause() } catch {}; remoteAudioRef.current.srcObject = null }
  }, [stopRingtone])

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error("Browserul nu suportă accesul la microfon.")
      setAudioPermissionMessage(describeMicrophoneError(err))
      throw err
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      setAudioPermissionMessage(null)
      return stream
    } catch (error: any) { setAudioPermissionMessage(describeMicrophoneError(error)); throw error }
  }, [])

  const retryMicrophoneAccess = useCallback(async () => { try { await ensureLocalStream() } catch (error) { console.error("Retry microphone access error:", error) } }, [ensureLocalStream])

  const ensurePeerConnection = useCallback(async (currentUserId: string) => {
    if (peerConnectionRef.current) return peerConnectionRef.current
    const res = await fetch("https://vivos-api.vercel.app/api/turn-credentials")
    const { iceServers } = await res.json()
    const pc = new RTCPeerConnection({ iceServers })
    pc.ontrack = async (event) => {
      const [remoteStream] = event.streams
      const audioEl = remoteAudioRef.current
      if (!audioEl || !remoteStream) return
      audioEl.srcObject = remoteStream; audioEl.autoplay = true; audioEl.muted = false; audioEl.setAttribute("playsinline", "true")
      try { await audioEl.play() } catch (error) { console.error("Remote audio play error:", error) }
    }
    pc.onicecandidate = async (event) => {
      if (!event.candidate || !callChannelRef.current || !currentCallSessionIdRef.current) return
      try { await callChannelRef.current.send({ type: "broadcast", event: "ice_candidate", payload: { type: "ice_candidate", callSessionId: currentCallSessionIdRef.current, conversationId, fromUserId: currentUserId, candidate: event.candidate.toJSON() } }) } catch (error) { console.error("ICE send error:", error) }
    }
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === "failed" || state === "disconnected" || state === "closed") { cleanupAudioCall(); setIncomingCall(null); setCurrentCallSessionId(null); setCallUiState("idle") }
    }
    const stream = await ensureLocalStream()
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))
    peerConnectionRef.current = pc
    return pc
  }, [cleanupAudioCall, conversationId, ensureLocalStream])

  const markActiveConversation = useCallback(async (currentUserId: string) => {
    const { error } = await supabase.from("active_conversations").upsert({ user_id: currentUserId, conversation_id: conversationId, updated_at: new Date().toISOString() }, { onConflict: "user_id,conversation_id" })
    if (error) console.error("Active conversation upsert error:", error)
  }, [conversationId])

  const clearActiveConversation = useCallback(async (currentUserId: string) => {
    const { error } = await supabase.from("active_conversations").delete().eq("user_id", currentUserId).eq("conversation_id", conversationId)
    if (error) console.error("Active conversation delete error:", error)
  }, [conversationId])

  const loadMessagesOnly = useCallback(async () => {
    const { data, error } = await supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true })
    if (error) { console.error("Load messages error:", error); return }
    const normalizedMessages: Message[] = (data ?? []).map((item: any) => ({ id: item.id, sender_id: item.sender_id, body: item.body, created_at: item.created_at }))
    setMessages((prev) => {
      const prevIds = prev.map((m) => m.id).join("|")
      const nextIds = normalizedMessages.map((m) => m.id).join("|")
      return prevIds === nextIds ? prev : normalizedMessages
    })
  }, [conversationId])

  const loadMembersOnly = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_conversation_members_with_profiles", { p_conversation_id: conversationId })
    if (error) { console.error("Load members error:", error); setMembers([]); return }
    const normalizedMembers: Member[] = (data ?? []).map((item: any) => ({ member_id: item.member_id, name: item.name ?? null, alias: item.alias ?? null, email: item.email ?? null }))
    setMembers(normalizedMembers)
  }, [conversationId])

  const markConversationNotificationsRead = useCallback(async (currentUserId: string) => {
    try {
      const { data: unreadNotifications, error: unreadNotificationsError } = await supabase.from("notifications").select("id, ref_id").eq("event_type", "new_message").eq("is_read", false).eq("user_id", currentUserId)
      if (unreadNotificationsError) return
      const messageIds = ((unreadNotifications ?? []) as NotificationRefRow[]).map((item) => item.ref_id).filter((value): value is string => !!value)
      if (!messageIds.length) return
      const { data: messageRows, error: messageRowsError } = await supabase.from("messages").select("id, conversation_id").in("id", messageIds).eq("conversation_id", conversationId)
      if (messageRowsError) return
      const targetMessageIds = new Set(((messageRows ?? []) as any[]).map((row) => row.id))
      if (!targetMessageIds.size) return
      const notificationIdsToMark = ((unreadNotifications ?? []) as NotificationRefRow[]).filter((item) => item.ref_id && targetMessageIds.has(item.ref_id)).map((item) => item.id)
      if (!notificationIdsToMark.length) return
      const { error: markError } = await supabase.from("notifications").update({ is_read: true }).in("id", notificationIdsToMark)
      if (markError) return
      emitWindowEvent("vivos:notifications-updated", { source: "conversation-opened", conversationId, count: notificationIdsToMark.length })
    } catch (error) { console.error("Conversation notification cleanup error:", error) }
  }, [conversationId])

  const refreshConversationState = useCallback(async () => {
    if (!userId) return
    await Promise.all([markActiveConversation(userId), loadMessagesOnly(), loadMembersOnly(), markConversationNotificationsRead(userId)])
  }, [userId, markActiveConversation, loadMessagesOnly, loadMembersOnly, markConversationNotificationsRead])

  useEffect(() => {
    async function loadInitial() {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push("/login"); return }
      setUserId(session.user.id)
      setUserEmail(session.user.email ?? null)
      await Promise.all([loadMessagesOnly(), loadMembersOnly(), markActiveConversation(session.user.id), markConversationNotificationsRead(session.user.id)])
      setLoading(false)
    }
    loadInitial()
  }, [conversationId, router, loadMessagesOnly, loadMembersOnly, markActiveConversation, markConversationNotificationsRead])

  useEffect(() => {
    if (!userId) return
    const handleVisibility = async () => { if (document.visibilityState === "visible") await refreshConversationState(); else await clearActiveConversation(userId) }
    const handleFocus = async () => { await refreshConversationState() }
    const handleOnline = async () => { setIsOffline(false); setConnectionLabel("browser-online"); await refreshConversationState() }
    const handleNativeAppActive = async () => { await refreshConversationState() }
    const handleNativeNetworkChange = async (event: Event) => {
      const detail = (event as CustomEvent<RuntimeNetworkDetail>).detail || {}
      const connected = Boolean(detail.connected)
      const connectionType = typeof detail.connectionType === "string" ? detail.connectionType : null
      setIsOffline(!connected); setConnectionLabel(connectionType)
      if (connected) await refreshConversationState()
    }
    const heartbeat = window.setInterval(() => { if (document.visibilityState === "visible") markActiveConversation(userId) }, 15000)
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("online", handleOnline)
    window.addEventListener("vivos:app-active", handleNativeAppActive as EventListener)
    window.addEventListener("vivos:network-change", handleNativeNetworkChange as EventListener)
    return () => {
      window.clearInterval(heartbeat)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("vivos:app-active", handleNativeAppActive as EventListener)
      window.removeEventListener("vivos:network-change", handleNativeNetworkChange as EventListener)
      clearActiveConversation(userId)
    }
  }, [userId, refreshConversationState, clearActiveConversation, markActiveConversation])

  useEffect(() => {
    const channel = supabase.channel(`conversation-live-${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const incoming = payload.new as any
      if (!incoming?.id) return
      setMessages((prev) => upsertMessage(prev, { id: incoming.id, sender_id: incoming.sender_id, body: incoming.body, created_at: incoming.created_at }))
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  const otherMember = useMemo(() => members.find((m) => m.member_id !== userId) || null, [members, userId])
  const otherName = useMemo(() => otherMember?.name?.trim() || otherMember?.alias?.trim() || otherMember?.email?.trim() || "Membru", [otherMember])

  const acceptCallBySessionId = useCallback(async (callSessionId: string) => {
    if (!userId || !callChannelRef.current) return
    try {
      setCallBusy(true); stopRingtone(); await ensureLocalStream(); await ensurePeerConnection(userId)
      acceptedCallSessionRef.current = callSessionId
      const { error: updateError } = await supabase.from("call_sessions").update({ status: "accepted", answered_at: new Date().toISOString() }).eq("id", callSessionId)
      if (updateError) { alert(`Nu am putut accepta apelul: ${updateError.message}`); cleanupAudioCall(); return }
      await supabase.from("call_events").insert({ call_session_id: callSessionId, actor_id: userId, event_type: "accept", payload: { conversationId } })
      await callChannelRef.current.send({ type: "broadcast", event: "call_accept", payload: { type: "call_accept", callSessionId, conversationId, fromUserId: userId } })
      emitWindowEvent("vivos:call-accepted", { callSessionId, conversationId })
      setIncomingCall(null); setCurrentCallSessionId(callSessionId); setCallUiState("connected"); router.replace(`/messages/${conversationId}`)
    } catch (error: any) {
      console.error("Accept call error:", error); alert(error?.message || "Nu am putut accepta apelul."); cleanupAudioCall()
    } finally { setCallBusy(false) }
  }, [userId, conversationId, stopRingtone, ensureLocalStream, ensurePeerConnection, cleanupAudioCall, router])

  const rejectCallBySessionId = useCallback(async (callSessionId: string) => {
    if (!userId || !callChannelRef.current) return
    try {
      setCallBusy(true); stopRingtone()
      await supabase.from("call_sessions").update({ status: "rejected", ended_at: new Date().toISOString() }).eq("id", callSessionId)
      await supabase.from("call_events").insert({ call_session_id: callSessionId, actor_id: userId, event_type: "reject", payload: { conversationId } })
      await callChannelRef.current.send({ type: "broadcast", event: "call_reject", payload: { type: "call_reject", callSessionId, conversationId, fromUserId: userId } })
      emitWindowEvent("vivos:call-rejected", { callSessionId, conversationId })
      cleanupAudioCall(); setIncomingCall(null); setCurrentCallSessionId(null); setCallUiState("idle"); router.replace(`/messages/${conversationId}`)
    } catch (error) {
      console.error("Reject call error:", error); alert("Nu am putut respinge apelul.")
    } finally { setCallBusy(false) }
  }, [userId, conversationId, stopRingtone, cleanupAudioCall, router])

  const handleAcceptCall = useCallback(async () => { if (!incomingCall?.callSessionId) return; await acceptCallBySessionId(incomingCall.callSessionId) }, [incomingCall, acceptCallBySessionId])
  const handleRejectCall = useCallback(async () => { if (!incomingCall?.callSessionId) return; await rejectCallBySessionId(incomingCall.callSessionId) }, [incomingCall, rejectCallBySessionId])

  useEffect(() => {
    if (!userId) return
    const callChannel = supabase.channel(`call:conversation:${conversationId}`)
      .on("broadcast", { event: "call_invite" }, ({ payload }) => {
        if (!payload || payload.toUserId !== userId || payload.fromUserId === userId) return
        setIncomingCall({ callSessionId: payload.callSessionId, fromUserId: payload.fromUserId })
        setCurrentCallSessionId(payload.callSessionId); setCallUiState("incoming"); playRingtone()
      })
      .on("broadcast", { event: "call_accept" }, async ({ payload }) => {
        if (!payload || payload.callSessionId !== currentCallSessionIdRef.current || !userId) return
        try {
          stopRingtone()
          const pc = await ensurePeerConnection(userId)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await callChannelRef.current?.send({ type: "broadcast", event: "webrtc_offer", payload: { type: "webrtc_offer", callSessionId: payload.callSessionId, conversationId, fromUserId: userId, sdp: offer } })
          emitWindowEvent("vivos:call-accepted", { callSessionId: payload.callSessionId, conversationId, source: "broadcast" })
          setCallUiState("connected")
        } catch (error) { console.error("Offer create error:", error); alert("Nu am putut porni audio-ul apelului."); cleanupAudioCall(); setCurrentCallSessionId(null); setCallUiState("idle") }
      })
      .on("broadcast", { event: "call_reject" }, ({ payload }) => {
        if (!payload || payload.callSessionId !== currentCallSessionIdRef.current) return
        if (acceptedCallSessionRef.current && payload.callSessionId === acceptedCallSessionRef.current) return
        if (callUiState === "connected") return
        stopRingtone(); cleanupAudioCall(); setIncomingCall(null); setCurrentCallSessionId(null); setCallUiState("idle")
        emitWindowEvent("vivos:call-rejected", { callSessionId: payload.callSessionId, conversationId, source: "broadcast" }); alert("Apel respins.")
      })
      .on("broadcast", { event: "call_end" }, ({ payload }) => {
        if (!payload) return
        if (currentCallSessionIdRef.current && payload.callSessionId !== currentCallSessionIdRef.current) return
        stopRingtone(); cleanupAudioCall(); setIncomingCall(null); setCurrentCallSessionId(null); setCallUiState("idle")
        emitWindowEvent("vivos:call-ended", { callSessionId: payload.callSessionId, conversationId, source: "broadcast" })
      })
      .on("broadcast", { event: "webrtc_offer" }, async ({ payload }) => {
        if (!payload || payload.callSessionId !== currentCallSessionIdRef.current || !userId) return
        try {
          stopRingtone()
          const pc = await ensurePeerConnection(userId)
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          await callChannelRef.current?.send({ type: "broadcast", event: "webrtc_answer", payload: { type: "webrtc_answer", callSessionId: payload.callSessionId, conversationId, fromUserId: userId, sdp: answer } })
          setCallUiState("connected")
        } catch (error) { console.error("Offer handling error:", error) }
      })
      .on("broadcast", { event: "webrtc_answer" }, async ({ payload }) => {
        if (!payload || payload.callSessionId !== currentCallSessionIdRef.current) return
        try {
          stopRingtone()
          const pc = peerConnectionRef.current
          if (!pc) return
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          setCallUiState("connected")
        } catch (error) { console.error("Answer handling error:", error) }
      })
      .on("broadcast", { event: "ice_candidate" }, async ({ payload }) => {
        if (!payload || payload.callSessionId !== currentCallSessionIdRef.current) return
        try {
          const pc = peerConnectionRef.current
          if (!pc || !payload.candidate) return
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } catch (error) { console.error("ICE handling error:", error) }
      }).subscribe()
    callChannelRef.current = callChannel
    return () => { callChannelRef.current = null; supabase.removeChannel(callChannel) }
  }, [conversationId, userId, ensurePeerConnection, cleanupAudioCall, playRingtone, stopRingtone, callUiState])

  useEffect(() => {
    if (!userId) return
    const callAction = searchParams.get("callAction")
    const targetCallSessionId = searchParams.get("callSessionId")
    let cancelled = false; let attempts = 0
    async function syncIncomingCallFromDb() {
      const { data, error } = await supabase.from("call_sessions").select("id, caller_id, callee_id, status, created_at").eq("conversation_id", conversationId).eq("callee_id", userId).eq("status", "ringing").order("created_at", { ascending: false }).limit(1).maybeSingle()
      if (cancelled || error || !data?.id) return null
      if (!incomingCall || incomingCall.callSessionId !== data.id) { setIncomingCall({ callSessionId: data.id, fromUserId: data.caller_id }); setCurrentCallSessionId(data.id); setCallUiState("incoming"); playRingtone() }
      return data
    }
    const timer = window.setInterval(async () => {
      attempts += 1
      if (cancelled) { window.clearInterval(timer); return }
      const dbCall = await syncIncomingCallFromDb()
      if (!dbCall?.id) { if (attempts >= 12) window.clearInterval(timer); return }
      if (!targetCallSessionId || dbCall.id !== targetCallSessionId) { if (attempts >= 12) window.clearInterval(timer); return }
      if (callBusy) { if (attempts >= 12) window.clearInterval(timer); return }
      if (autoActionHandledRef.current === targetCallSessionId) { window.clearInterval(timer); return }
      if (callAction === "answer") { autoActionHandledRef.current = targetCallSessionId; window.clearInterval(timer); await acceptCallBySessionId(targetCallSessionId); return }
      if (callAction === "decline") { autoActionHandledRef.current = targetCallSessionId; window.clearInterval(timer); await rejectCallBySessionId(targetCallSessionId); return }
      if (attempts >= 12) window.clearInterval(timer)
    }, 500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [userId, conversationId, searchParams, incomingCall, callBusy, playRingtone, acceptCallBySessionId, rejectCallBySessionId])

  async function handleStartCall() {
    if (!userId || !otherMember?.member_id || callUiState !== "idle" || !callChannelRef.current) return
    try {
      setCallBusy(true); await ensureLocalStream()
      const { data: callSession, error: callSessionError } = await supabase.from("call_sessions").insert({ conversation_id: conversationId, caller_id: userId, callee_id: otherMember.member_id, status: "ringing" }).select("id").single()
      if (callSessionError || !callSession?.id) { alert(`Nu am putut porni apelul: ${callSessionError?.message || "necunoscut"}`); cleanupAudioCall(); return }
      const callSessionId = callSession.id
      await supabase.from("call_events").insert({ call_session_id: callSessionId, actor_id: userId, event_type: "invite", payload: { conversationId } })
      await callChannelRef.current.send({ type: "broadcast", event: "call_invite", payload: { type: "call_invite", callSessionId, conversationId, fromUserId: userId, toUserId: otherMember.member_id } })
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const pushResponse = await fetch("https://vivos-api.vercel.app/api/notifications/send-call-push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ conversationId, callSessionId, calleeId: otherMember.member_id }) })
          const pushResult = await pushResponse.json().catch(() => null)
          if (!pushResponse.ok) console.error("Call push error:", pushResult)
        }
      } catch (pushError: any) { console.error("Call push request failed:", pushError) }
      setCurrentCallSessionId(callSessionId); setCallUiState("outgoing")
    } catch (error: any) {
      console.error("Start call error:", error); alert(error?.message || "Nu am putut porni apelul."); cleanupAudioCall()
    } finally { setCallBusy(false) }
  }

  async function handleEndCall() {
    if (!userId || !currentCallSessionId) { cleanupAudioCall(); setIncomingCall(null); setCallUiState("idle"); setCurrentCallSessionId(null); return }
    try {
      setCallBusy(true); stopRingtone()
      await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", currentCallSessionId)
      await supabase.from("call_events").insert({ call_session_id: currentCallSessionId, actor_id: userId, event_type: "end", payload: { conversationId } })
      await callChannelRef.current?.send({ type: "broadcast", event: "call_end", payload: { type: "call_end", callSessionId: currentCallSessionId, conversationId, fromUserId: userId } })
    } catch (error) { console.error("End call error:", error) }
    finally {
      emitWindowEvent("vivos:call-ended", { callSessionId: currentCallSessionId, conversationId, source: "local" })
      cleanupAudioCall(); setIncomingCall(null); setCurrentCallSessionId(null); setCallUiState("idle"); setCallBusy(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !userId) return
    setSending(true)
    const cleanBody = body.trim()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { alert("Sesiunea nu este validă. Reautentifică-te."); setSending(false); return }
    const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, body: cleanBody }).select("id, sender_id, body, created_at").single()
    if (error) { alert(`Mesajul nu a putut fi trimis: ${error.message}`); setSending(false); return }
    if (data) {
      const { error: notificationError } = await supabase.rpc("create_message_notification", { p_conversation_id: conversationId, p_message_id: data.id, p_sender_id: userId, p_message_body: cleanBody })
      if (notificationError) console.error("Notification error:", notificationError)
      try {
        const pushResponse = await fetch("/api/notifications/send-message-push", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ conversationId, messageId: data.id, messageBody: cleanBody }) })
        if (!pushResponse.ok) { const pushResult = await pushResponse.json().catch(() => null); console.error("Push send error:", pushResult) }
      } catch (pushError) { console.error("Push request failed:", pushError) }
      shouldStickToBottomRef.current = true
      setMessages((prev) => upsertMessage(prev, { id: data.id, sender_id: data.sender_id, body: data.body, created_at: data.created_at }))
    }
    setBody(""); setSending(false); scrollToBottom("smooth")
  }

  // ── Derived UI values ──────────────────────────────────────────────────────
  const callDisplayName = otherName || "Membru"
  const callInitial = callDisplayName.trim().charAt(0).toUpperCase() || "M"
  const showCallOverlay = callUiState === "incoming" || callUiState === "outgoing" || callUiState === "connected"

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      <audio ref={remoteAudioRef} autoPlay playsInline preload="none" />
      <audio ref={ringtoneRef} src="/sounds/incoming-call.mp3" preload="auto" />

      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0f1117]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3">

            {/* Back */}
            <button
              type="button"
              onClick={() => router.push("/messages")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/[0.07] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-900/40">
                {callInitial}
              </div>
              {!isOffline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0f1117] bg-emerald-400" />
              )}
            </div>

            {/* Name + status */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight text-white">
                {loading ? "Se încarcă..." : otherName}
              </p>
              <p className="truncate text-[11px] text-white/40">
                {isOffline
                  ? `Offline${connectionLabel ? ` · ${connectionLabel}` : ""}`
                  : "Online acum"}
              </p>
            </div>

            {/* Call button */}
            {callUiState === "idle" && (
              <button
                type="button"
                onClick={handleStartCall}
                disabled={callBusy || !otherMember || isOffline}
                title={!otherMember ? "Membrul nu e încărcat" : isOffline ? "Conexiune indisponibilă" : "Apelează"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/[0.07] hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Phone className="h-4 w-4" />
              </button>
            )}
            {(callUiState === "outgoing" || callUiState === "connected") && (
              <button
                type="button"
                onClick={handleEndCall}
                disabled={callBusy}
                title={callUiState === "connected" ? "Închide apelul" : "Anulează apelul"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            )}

            {/* Menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((p) => !p)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/[0.07] hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1d27] shadow-2xl shadow-black/60">
                  {[
                    { label: "Notificări", href: "/notifications" },
                    { label: "Profil", href: "/profile" },
                    { label: "Manifest VIVOS", href: "/downloads/manifest.html" },
                    { label: "Setări", href: "/?tab=settings" },
                    { label: "Despre", href: "/?tab=about" },
                  ].map(({ label, href }) => (
                    <button
                      key={label}
                      className="block w-full px-4 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                      onClick={() => { setProfileMenuOpen(false); window.location.href = href }}
                    >
                      {label}
                    </button>
                  ))}
                  <div className="mx-3 my-1 h-px bg-white/[0.07]" />
                  <button
                    className="block w-full px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                    onClick={async () => { setProfileMenuOpen(false); await supabase.auth.signOut(); window.location.href = "/" }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── BANNERS ── */}
        {isOffline && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            Fără conexiune. VIVOS nu poate sincroniza conversația acum.
            {connectionLabel && ` Rețea: ${connectionLabel}.`}
          </div>
        )}
        {audioPermissionMessage && (
          <div className="border-b border-orange-500/20 bg-orange-500/10 px-4 py-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-orange-300">{audioPermissionMessage}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retryMicrophoneAccess}
                  className="rounded-lg border border-orange-500/30 px-3 py-1 text-xs text-orange-300 transition hover:bg-orange-500/10"
                >
                  Reîncearcă
                </button>
                <button
                  type="button"
                  onClick={() => setAudioPermissionMessage(null)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/40 transition hover:bg-white/[0.05]"
                >
                  Închide
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        <section className="flex-1 px-4 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-white/30">
              Se încarcă conversația...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-3 text-sm text-white/30">
                Nu există încă mesaje în această conversație.
              </p>
            </div>
          ) : (
            <div className="space-y-1 pb-24">
              {messages.map((msg, index) => {
                const mine = msg.sender_id === userId
                const prev = messages[index - 1]
                const showDateSeparator =
                  !prev || formatMessageDate(prev.created_at) !== formatMessageDate(msg.created_at)
                const prevSame = prev && prev.sender_id === msg.sender_id && !showDateSeparator
                const nextMsg = messages[index + 1]
                const nextSame = nextMsg && nextMsg.sender_id === msg.sender_id

                return (
                  <div key={msg.id}>
                    {showDateSeparator && (
                      <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/[0.06]" />
                        <span className="text-[11px] font-medium text-white/25">
                          {formatMessageDate(msg.created_at)}
                        </span>
                        <div className="h-px flex-1 bg-white/[0.06]" />
                      </div>
                    )}

                    <div className={`flex ${mine ? "justify-end" : "justify-start"} ${prevSame ? "mt-0.5" : "mt-2"}`}>
                      <div
                        className={[
                          "max-w-[78%] px-3.5 py-2.5 sm:max-w-[68%]",
                          "shadow-sm",
                          mine
                            ? "rounded-[18px] rounded-br-[6px] bg-violet-600 text-white"
                            : "rounded-[18px] rounded-bl-[6px] border border-white/[0.07] bg-[#1a1d27] text-white/90",
                          nextSame && mine ? "rounded-br-[18px]" : "",
                          nextSame && !mine ? "rounded-bl-[18px]" : "",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.5]">
                          {msg.body}
                        </p>
                        <div className="mt-1 flex justify-end">
                          <span className={`text-[10px] ${mine ? "text-violet-200/70" : "text-white/25"}`}>
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        {/* ── INPUT ── */}
        <div className="sticky bottom-0 z-10 border-t border-white/[0.06] bg-[#0f1117]/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isOffline}
              rows={1}
              placeholder="Scrie un mesaj..."
              className="min-h-[42px] max-h-[120px] flex-1 resize-none rounded-2xl border border-white/[0.09] bg-white/[0.05] px-4 py-2.5 text-[14.5px] leading-5 text-white placeholder-white/25 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.07]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any) }
              }}
            />
            <button
              type="submit"
              disabled={sending || isOffline || !body.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ── CALL OVERLAY ── */}
      {showCallOverlay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#13151f] shadow-2xl">

            {/* Avatar section */}
            <div className="flex flex-col items-center px-8 pt-10 pb-6 text-center">
              <div
                className={[
                  "mb-5 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white",
                  callUiState === "connected"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/40"
                    : callUiState === "incoming"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/40"
                    : "bg-gradient-to-br from-slate-600 to-slate-700",
                ].join(" ")}
              >
                {callInitial}
              </div>
              <h2 className="max-w-full truncate text-xl font-semibold text-white">{callDisplayName}</h2>

              {callUiState === "incoming" && (
                <div className="mt-2 flex items-center gap-1.5">
                  <PhoneIncoming className="h-3.5 w-3.5 text-violet-400" />
                  <p className="text-sm text-violet-300">Apel primit</p>
                </div>
              )}
              {callUiState === "outgoing" && (
                <p className="mt-2 text-sm text-white/40">Se apelează...</p>
              )}
              {callUiState === "connected" && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <p className="text-sm font-medium text-emerald-400">Conectat</p>
                </div>
              )}
            </div>

            {/* Connected: mic indicator */}
            {callUiState === "connected" && (
              <div className="mx-6 mb-4 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3">
                <Mic className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-white/60">Microfon activ</span>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 pb-8">
              {callUiState === "incoming" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleAcceptCall}
                    disabled={callBusy || isOffline}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-medium text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4" />
                    {callBusy ? "..." : "Răspunde"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectCall}
                    disabled={callBusy}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-red-600/20 py-4 text-sm font-medium text-red-400 border border-red-500/20 transition hover:bg-red-600/30 disabled:opacity-50"
                  >
                    <PhoneOff className="h-4 w-4" />
                    {callBusy ? "..." : "Respinge"}
                  </button>
                </div>
              )}
              {(callUiState === "outgoing" || callUiState === "connected") && (
                <button
                  type="button"
                  onClick={handleEndCall}
                  disabled={callBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-sm font-medium text-white shadow transition hover:bg-red-500 disabled:opacity-50"
                >
                  <PhoneOff className="h-4 w-4" />
                  {callBusy ? "Se închide..." : callUiState === "connected" ? "Închide apelul" : "Anulează apelul"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
