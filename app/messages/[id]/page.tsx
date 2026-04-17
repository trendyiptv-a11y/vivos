"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
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

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Accesul la microfon este blocat. Permite microfonul pentru VIVOS și încearcă din nou."
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Nu a fost găsit niciun microfon disponibil pe device."
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Microfonul nu poate fi pornit acum. Închide alte aplicații care folosesc audio și încearcă din nou."
  }

  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Configurația audio a device-ului nu este compatibilă momentan."
  }

  if (message) {
    return `Microfon indisponibil: ${message}`
  }

  return "Microfonul nu poate fi folosit acum în aplicație."
}

function isNearBottom(element: HTMLElement | null, threshold = 140) {
  if (!element) return true
  return element.scrollHeight - (element.scrollTop + element.clientHeight) <= threshold
}

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const conversationId = String(params.id)

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [audioPermissionMessage, setAudioPermissionMessage] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [connectionLabel, setConnectionLabel] = useState<string | null>(null)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  const [callUiState, setCallUiState] = useState<CallUiState>("idle")
  const [callBusy, setCallBusy] = useState(false)
  const [currentCallSessionId, setCurrentCallSessionId] = useState<string | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)
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

  useEffect(() => {
    currentCallSessionIdRef.current = currentCallSessionId
  }, [currentCallSessionId])

  useEffect(() => {
    const updateViewportHeight = () => {
      const vv = window.visualViewport
      setViewportHeight(vv?.height ?? window.innerHeight)
    }

    updateViewportHeight()
    const vv = window.visualViewport
    vv?.addEventListener("resize", updateViewportHeight)
    vv?.addEventListener("scroll", updateViewportHeight)
    window.addEventListener("resize", updateViewportHeight)

    return () => {
      vv?.removeEventListener("resize", updateViewportHeight)
      vv?.removeEventListener("scroll", updateViewportHeight)
      window.removeEventListener("resize", updateViewportHeight)
    }
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      shouldStickToBottomRef.current = isNearBottom(messageListRef.current)
    }

    const node = messageListRef.current
    handleScroll()
    node?.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      node?.removeEventListener("scroll", handleScroll)
    }
  }, [messages.length])

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

      return () => {
        window.cancelAnimationFrame(rafId)
        window.clearTimeout(timerId)
      }
    }

    if (hasNewMessages && shouldStickToBottomRef.current) {
      scrollToBottom("smooth")
    }
  }, [messages, scrollToBottom])

  useEffect(() => {
    initialScrollDoneRef.current = false
    shouldStickToBottomRef.current = true
    previousMessageCountRef.current = 0
  }, [conversationId])

  const stopRingtone = useCallback(() => {
    const el = ringtoneRef.current
    if (!el) return
    try {
      el.pause()
      el.currentTime = 0
    } catch (error) {
      console.error("Stop ringtone error:", error)
    }
  }, [])

  const playRingtone = useCallback(async () => {
    const el = ringtoneRef.current
    if (!el) return
    try {
      el.loop = true
      await el.play()
    } catch (error) {
      console.error("Play ringtone error:", error)
    }
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

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause()
      } catch {}
      remoteAudioRef.current.srcObject = null
    }
  }, [stopRingtone])

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      const err = new Error("Browserul nu suportă accesul la microfon.")
      setAudioPermissionMessage(describeMicrophoneError(err))
      throw err
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      setAudioPermissionMessage(null)
      return stream
    } catch (error: any) {
      setAudioPermissionMessage(describeMicrophoneError(error))
      throw error
    }
  }, [])

  const retryMicrophoneAccess = useCallback(async () => {
    try {
      await ensureLocalStream()
    } catch (error) {
      console.error("Retry microphone access error:", error)
    }
  }, [ensureLocalStream])

  const ensurePeerConnection = useCallback(
    async (currentUserId: string) => {
      if (peerConnectionRef.current) return peerConnectionRef.current

      const res = await fetch("https://vivos-api.vercel.app/api/turn-credentials")
      const { iceServers } = await res.json()
      const pc = new RTCPeerConnection({ iceServers })

      pc.ontrack = async (event) => {
        const [remoteStream] = event.streams
        const audioEl = remoteAudioRef.current
        if (!audioEl || !remoteStream) return

        audioEl.srcObject = remoteStream
        audioEl.autoplay = true
        audioEl.muted = false
        audioEl.setAttribute("playsinline", "true")

        try {
          await audioEl.play()
        } catch (error) {
          console.error("Remote audio play error:", error)
        }
      }

      pc.onicecandidate = async (event) => {
        if (!event.candidate || !callChannelRef.current || !currentCallSessionIdRef.current) return
        try {
          await callChannelRef.current.send({
            type: "broadcast",
            event: "ice_candidate",
            payload: {
              type: "ice_candidate",
              callSessionId: currentCallSessionIdRef.current,
              conversationId,
              fromUserId: currentUserId,
              candidate: event.candidate.toJSON(),
            },
          })
        } catch (error) {
          console.error("ICE send error:", error)
        }
      }

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === "failed" || state === "disconnected" || state === "closed") {
          cleanupAudioCall()
          setIncomingCall(null)
          setCurrentCallSessionId(null)
          setCallUiState("idle")
        }
      }

      const stream = await ensureLocalStream()
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      peerConnectionRef.current = pc
      return pc
    },
    [cleanupAudioCall, conversationId, ensureLocalStream]
  )

  const markActiveConversation = useCallback(async (currentUserId: string) => {
    const { error } = await supabase
      .from("active_conversations")
      .upsert(
        { user_id: currentUserId, conversation_id: conversationId, updated_at: new Date().toISOString() },
        { onConflict: "user_id,conversation_id" }
      )
    if (error) console.error("Active conversation upsert error:", error)
  }, [conversationId])

  const clearActiveConversation = useCallback(async (currentUserId: string) => {
    const { error } = await supabase
      .from("active_conversations")
      .delete()
      .eq("user_id", currentUserId)
      .eq("conversation_id", conversationId)
    if (error) console.error("Active conversation delete error:", error)
  }, [conversationId])

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

    setMembers(
      (data ?? []).map((item: any) => ({
        member_id: item.member_id,
        name: item.name ?? null,
        alias: item.alias ?? null,
        email: item.email ?? null,
      }))
    )
  }, [conversationId])

  const markConversationNotificationsRead = useCallback(async (currentUserId: string) => {
    try {
      const { data: unreadNotifications, error: unreadNotificationsError } = await supabase
        .from("notifications")
        .select("id, ref_id")
        .eq("event_type", "new_message")
        .eq("is_read", false)
        .eq("user_id", currentUserId)

      if (unreadNotificationsError) {
        console.error("Load unread conversation notifications error:", unreadNotificationsError)
        return
      }

      const messageIds = ((unreadNotifications ?? []) as NotificationRefRow[])
        .map((item) => item.ref_id)
        .filter((value): value is string => !!value)
      if (!messageIds.length) return

      const { data: messageRows, error: messageRowsError } = await supabase
        .from("messages")
        .select("id, conversation_id")
        .in("id", messageIds)
        .eq("conversation_id", conversationId)

      if (messageRowsError) {
        console.error("Resolve message notifications for conversation error:", messageRowsError)
        return
      }

      const targetMessageIds = new Set(((messageRows ?? []) as any[]).map((row) => row.id))
      if (!targetMessageIds.size) return

      const notificationIdsToMark = ((unreadNotifications ?? []) as NotificationRefRow[])
        .filter((item) => item.ref_id && targetMessageIds.has(item.ref_id))
        .map((item) => item.id)
      if (!notificationIdsToMark.length) return

      const { error: markError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notificationIdsToMark)

      if (markError) {
        console.error("Mark conversation notifications read error:", markError)
        return
      }

      emitWindowEvent("vivos:notifications-updated", {
        source: "conversation-opened",
        conversationId,
        count: notificationIdsToMark.length,
      })
    } catch (error) {
      console.error("Conversation notification cleanup error:", error)
    }
  }, [conversationId])

  const refreshConversationState = useCallback(async () => {
    if (!userId) return
    await Promise.all([
      markActiveConversation(userId),
      loadMessagesOnly(),
      loadMembersOnly(),
      markConversationNotificationsRead(userId),
    ])
  }, [userId, markActiveConversation, loadMessagesOnly, loadMembersOnly, markConversationNotificationsRead])

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
        markConversationNotificationsRead(session.user.id),
      ])
      setLoading(false)
    }

    loadInitial()
  }, [conversationId, router, loadMessagesOnly, loadMembersOnly, markActiveConversation, markConversationNotificationsRead])

  useEffect(() => {
    if (!userId) return

    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        await refreshConversationState()
      } else {
        await clearActiveConversation(userId)
      }
    }

    const handleFocus = async () => {
      await refreshConversationState()
    }

    const handleOnline = async () => {
      setIsOffline(false)
      setConnectionLabel("browser-online")
      await refreshConversationState()
    }

    const handleNativeAppActive = async () => {
      await refreshConversationState()
    }

    const handleNativeNetworkChange = async (event: Event) => {
      const detail = (event as CustomEvent<RuntimeNetworkDetail>).detail || {}
      const connected = Boolean(detail.connected)
      const connectionType = typeof detail.connectionType === "string" ? detail.connectionType : null
      setIsOffline(!connected)
      setConnectionLabel(connectionType)
      if (connected) await refreshConversationState()
    }

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") markActiveConversation(userId)
    }, 15000)

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
    const channel = supabase
      .channel(`conversation-live-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as any
          if (!incoming?.id) return
          setMessages((prev) =>
            upsertMessage(prev, {
              id: incoming.id,
              sender_id: incoming.sender_id,
              body: incoming.body,
              created_at: incoming.created_at,
            })
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const otherMember = useMemo(() => members.find((m) => m.member_id !== userId) || null, [members, userId])
  const otherName = useMemo(
    () => otherMember?.name?.trim() || otherMember?.alias?.trim() || otherMember?.email?.trim() || "Membru",
    [otherMember]
  )

  const acceptCallBySessionId = useCallback(async (callSessionId: string) => {
    if (!userId || !callChannelRef.current) return
    try {
      setCallBusy(true)
      stopRingtone()
      await ensureLocalStream()
      await ensurePeerConnection(userId)
      acceptedCallSessionRef.current = callSessionId

      const { error: updateError } = await supabase
        .from("call_sessions")
        .update({ status: "accepted", answered_at: new Date().toISOString() })
        .eq("id", callSessionId)

      if (updateError) {
        alert(`Nu am putut accepta apelul: ${updateError.message}`)
        cleanupAudioCall()
        return
      }

      await supabase.from("call_events").insert({
        call_session_id: callSessionId,
        actor_id: userId,
        event_type: "accept",
        payload: { conversationId },
      })

      await callChannelRef.current.send({
        type: "broadcast",
        event: "call_accept",
        payload: { type: "call_accept", callSessionId, conversationId, fromUserId: userId },
      })

      emitWindowEvent("vivos:call-accepted", { callSessionId, conversationId })
      setIncomingCall(null)
      setCurrentCallSessionId(callSessionId)
      setCallUiState("connected")
      router.replace(`/messages/${conversationId}`)
    } catch (error: any) {
      console.error("Accept call error:", error)
      alert(error?.message || "Nu am putut accepta apelul.")
      cleanupAudioCall()
    } finally {
      setCallBusy(false)
    }
  }, [userId, conversationId, stopRingtone, ensureLocalStream, ensurePeerConnection, cleanupAudioCall, router])

  const rejectCallBySessionId = useCallback(async (callSessionId: string) => {
    if (!userId || !callChannelRef.current) return
    try {
      setCallBusy(true)
      stopRingtone()

      await supabase
        .from("call_sessions")
        .update({ status: "rejected", ended_at: new Date().toISOString() })
        .eq("id", callSessionId)

      await supabase.from("call_events").insert({
        call_session_id: callSessionId,
        actor_id: userId,
        event_type: "reject",
        payload: { conversationId },
      })

      await callChannelRef.current.send({
        type: "broadcast",
        event: "call_reject",
        payload: { type: "call_reject", callSessionId, conversationId, fromUserId: userId },
      })

      emitWindowEvent("vivos:call-rejected", { callSessionId, conversationId })
      cleanupAudioCall()
      setIncomingCall(null)
      setCurrentCallSessionId(null)
      setCallUiState("idle")
      router.replace(`/messages/${conversationId}`)
    } catch (error) {
      console.error("Reject call error:", error)
      alert("Nu am putut respinge apelul.")
    } finally {
      setCallBusy(false)
    }
  }, [userId, conversationId, stopRingtone, cleanupAudioCall, router])

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall?.callSessionId) return
    await acceptCallBySessionId(incomingCall.callSessionId)
  }, [incomingCall, acceptCallBySessionId])

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall?.callSessionId) return
    await rejectCallBySessionId(incomingCall.callSessionId)
  }, [incomingCall, rejectCallBySessionId])

  const handleStartCall = useCallback(async () => {
    if (!userId || !otherMember?.member_id || callUiState !== "idle") return
    if (!callChannelRef.current) {
      alert("Canalul de apel nu este pregătit.")
      return
    }

    try {
      setCallBusy(true)
      await ensureLocalStream()

      const { data: callSession, error: callSessionError } = await supabase
        .from("call_sessions")
        .insert({ conversation_id: conversationId, caller_id: userId, callee_id: otherMember.member_id, status: "ringing" })
        .select("id")
        .single()

      if (callSessionError || !callSession?.id) {
        alert(`Nu am putut porni apelul: ${callSessionError?.message || "necunoscut"}`)
        cleanupAudioCall()
        return
      }

      const callSessionId = callSession.id
      await supabase.from("call_events").insert({
        call_session_id: callSessionId,
        actor_id: userId,
        event_type: "invite",
        payload: { conversationId },
      })

      await callChannelRef.current.send({
        type: "broadcast",
        event: "call_invite",
        payload: { type: "call_invite", callSessionId, conversationId, fromUserId: userId, toUserId: otherMember.member_id },
      })

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          await fetch("https://vivos-api.vercel.app/api/notifications/send-call-push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ conversationId, callSessionId, calleeId: otherMember.member_id }),
          })
        }
      } catch (pushError) {
        console.error("Call push request failed:", pushError)
      }

      setCurrentCallSessionId(callSessionId)
      setCallUiState("outgoing")
    } catch (error: any) {
      console.error("Start call error:", error)
      alert(error?.message || "Nu am putut porni apelul.")
      cleanupAudioCall()
    } finally {
      setCallBusy(false)
    }
  }, [userId, otherMember, callUiState, conversationId, ensureLocalStream, cleanupAudioCall])

  const handleEndCall = useCallback(async () => {
    if (!userId || !currentCallSessionId) {
      cleanupAudioCall()
      setIncomingCall(null)
      setCallUiState("idle")
      setCurrentCallSessionId(null)
      return
    }

    try {
      setCallBusy(true)
      stopRingtone()
      await supabase
        .from("call_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", currentCallSessionId)

      await supabase.from("call_events").insert({
        call_session_id: currentCallSessionId,
        actor_id: userId,
        event_type: "end",
        payload: { conversationId },
      })

      await callChannelRef.current?.send({
        type: "broadcast",
        event: "call_end",
        payload: { type: "call_end", callSessionId: currentCallSessionId, conversationId, fromUserId: userId },
      })
    } catch (error) {
      console.error("End call error:", error)
    } finally {
      emitWindowEvent("vivos:call-ended", { callSessionId: currentCallSessionId, conversationId, source: "local" })
      cleanupAudioCall()
      setIncomingCall(null)
      setCurrentCallSessionId(null)
      setCallUiState("idle")
      setCallBusy(false)
    }
  }, [userId, currentCallSessionId, conversationId, cleanupAudioCall, stopRingtone])

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
      .insert({ conversation_id: conversationId, sender_id: userId, body: cleanBody })
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
      if (notificationError) console.error("Notification error:", notificationError)

      try {
        await fetch("/api/notifications/send-message-push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ conversationId, messageId: data.id, messageBody: cleanBody }),
        })
      } catch (pushError) {
        console.error("Push request failed:", pushError)
      }

      shouldStickToBottomRef.current = true
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
    scrollToBottom("smooth")
  }

  const shellStyle = viewportHeight ? { height: `${viewportHeight}px` } : { height: "100dvh" }
  const callDisplayName = otherName || "Membru"
  const callInitial = callDisplayName.trim().charAt(0).toUpperCase() || "M"
  const showCallOverlay = callUiState === "incoming" || callUiState === "outgoing" || callUiState === "connected"

  return (
    <main className="bg-slate-50" style={shellStyle}>
      <audio ref={remoteAudioRef} autoPlay playsInline preload="none" />
      <audio ref={ringtoneRef} src="/sounds/incoming-call.mp3" preload="auto" />

      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden bg-slate-50">
        <header className="border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Conversație</p>
              <h1 className="truncate text-2xl font-semibold text-slate-900">{loading ? "Se încarcă..." : otherName}</h1>
              {!loading && !otherMember ? (
                <p className="mt-0.5 text-xs text-red-500">Conversația nu are încă datele membrului încărcate.</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {callUiState === "idle" ? (
                <Button className="h-10 rounded-2xl px-4 text-sm" onClick={handleStartCall} disabled={callBusy || !otherMember || isOffline}>
                  {callBusy ? "Se inițiază..." : "Apelează"}
                </Button>
              ) : null}
              {callUiState === "outgoing" ? (
                <Button variant="outline" className="h-10 rounded-2xl px-4 text-sm" onClick={handleEndCall} disabled={callBusy}>
                  {callBusy ? "Se închide..." : "Anulează"}
                </Button>
              ) : null}
              {callUiState === "connected" ? (
                <Button variant="outline" className="h-10 rounded-2xl px-4 text-sm" onClick={handleEndCall} disabled={callBusy}>
                  {callBusy ? "Se închide..." : "Închide"}
                </Button>
              ) : null}
              <Button variant="ghost" className="h-10 rounded-2xl px-3 text-sm" onClick={() => router.push("/messages")}>
                Înapoi
              </Button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {isOffline ? (
            <div className="mx-3 mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-4">
              <p className="font-semibold text-rose-900">Fără conexiune</p>
              <p>VIVOS nu poate sincroniza conversația acum.{connectionLabel ? ` Rețea curentă: ${connectionLabel}.` : ""}</p>
            </div>
          ) : null}

          {audioPermissionMessage ? (
            <div className="mx-3 mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:mx-4">
              <p className="font-semibold text-amber-900">Microfon necesar pentru apel</p>
              <p className="mt-1">{audioPermissionMessage}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-2xl px-3" onClick={retryMicrophoneAccess}>
                  Reîncearcă
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-2xl px-3" onClick={() => setAudioPermissionMessage(null)}>
                  Închide
                </Button>
              </div>
            </div>
          ) : null}

          <div ref={messageListRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Se încarcă conversația...</div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">Nu există încă mesaje în această conversație.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const mine = msg.sender_id === userId
                  return (
                    <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-3xl px-4 py-3 shadow-sm ${mine ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-[11px] opacity-80">
                          <p className="font-semibold">{mine ? "Tu" : otherName}</p>
                          <p>{new Date(msg.created_at).toLocaleString("ro-RO")}</p>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-5">{msg.body}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:p-4">
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <form onSubmit={handleSend} className="space-y-3">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[72px] max-h-[140px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    placeholder="Scrie mesajul tău..."
                    disabled={isOffline}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button type="submit" className="h-10 rounded-2xl px-5" disabled={sending || isOffline}>
                      {sending ? "Se trimite..." : "Trimite"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showCallOverlay ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-3xl font-semibold text-slate-700 sm:h-28 sm:w-28 sm:text-4xl">{callInitial}</div>
              <h2 className="max-w-full truncate text-2xl font-semibold text-slate-900">{callDisplayName}</h2>

              {callUiState === "incoming" ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">Apel incoming</p>
                  <p className="mt-1 text-xs text-slate-400">Te apelează acum</p>
                  <div className="mt-8 grid w-full grid-cols-2 gap-3">
                    <button type="button" onClick={handleAcceptCall} disabled={callBusy || isOffline} className="rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">{callBusy ? "Se acceptă..." : "Răspunde"}</button>
                    <button type="button" onClick={handleRejectCall} disabled={callBusy} className="rounded-2xl bg-red-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60">{callBusy ? "Se respinge..." : "Respinge"}</button>
                  </div>
                </>
              ) : null}

              {callUiState === "outgoing" ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">Se apelează...</p>
                  <p className="mt-1 text-xs text-slate-400">Așteptăm răspunsul</p>
                  <button type="button" onClick={handleEndCall} disabled={callBusy} className="mt-8 w-full rounded-2xl bg-red-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60">{callBusy ? "Se închide..." : "Anulează apelul"}</button>
                </>
              ) : null}

              {callUiState === "connected" ? (
                <>
                  <p className="mt-2 text-sm text-emerald-600">Conectat</p>
                  <p className="mt-1 text-xs text-slate-400">Apel audio activ</p>
                  <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Microfon activ</div>
                  <button type="button" onClick={handleEndCall} disabled={callBusy} className="mt-8 w-full rounded-2xl bg-red-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60">{callBusy ? "Se închide..." : "Închide apelul"}</button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
