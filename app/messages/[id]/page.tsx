"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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

type CallUiState = "idle" | "outgoing" | "incoming" | "connected"

type IncomingCall = {
  callSessionId: string
  fromUserId: string
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
  const searchParams = useSearchParams()
  const conversationId = String(params.id)

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])

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

  useEffect(() => {
    currentCallSessionIdRef.current = currentCallSessionId
  }, [currentCallSessionId])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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
      throw new Error("Browserul nu suportă accesul la microfon.")
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    localStreamRef.current = stream
    return stream
  }, [])

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
          console.log("Remote audio started")
        } catch (error) {
          console.error("Remote audio play error:", error)
        }
      }

      pc.onicecandidate = async (event) => {
        if (!event.candidate) return
        if (!callChannelRef.current) return
        if (!currentCallSessionIdRef.current) return

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
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      peerConnectionRef.current = pc
      return pc
    },
    [cleanupAudioCall, conversationId, ensureLocalStream]
  )

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

    console.log("members rpc", { conversationId, data, error })

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
        await loadMembersOnly()
      } else {
        await clearActiveConversation(userId)
      }
    }

    const handleFocus = async () => {
      await markActiveConversation(userId)
      await loadMessagesOnly()
      await loadMembersOnly()
    }

    const handleOnline = async () => {
      await markActiveConversation(userId)
      await loadMessagesOnly()
      await loadMembersOnly()
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
  }, [
    userId,
    markActiveConversation,
    clearActiveConversation,
    loadMessagesOnly,
    loadMembersOnly,
  ])

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

  const otherMember = useMemo(() => {
    return members.find((m) => m.member_id !== userId) || null
  }, [members, userId])

  const otherName = useMemo(() => {
    return (
      otherMember?.name?.trim() ||
      otherMember?.alias?.trim() ||
      otherMember?.email?.trim() ||
      "Membru"
    )
  }, [otherMember])

  const acceptCallBySessionId = useCallback(
    async (callSessionId: string) => {
      if (!userId) return
      if (!callChannelRef.current) return

      try {
        setCallBusy(true)
        stopRingtone()
        await ensureLocalStream()
        await ensurePeerConnection(userId)

        acceptedCallSessionRef.current = callSessionId

        const { error: updateError } = await supabase
          .from("call_sessions")
          .update({
            status: "accepted",
            answered_at: new Date().toISOString(),
          })
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
          payload: {
            conversationId,
          },
        })

        await callChannelRef.current.send({
          type: "broadcast",
          event: "call_accept",
          payload: {
            type: "call_accept",
            callSessionId,
            conversationId,
            fromUserId: userId,
          },
        })

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
    },
    [
      userId,
      conversationId,
      stopRingtone,
      ensureLocalStream,
      ensurePeerConnection,
      cleanupAudioCall,
      router,
    ]
  )

  const rejectCallBySessionId = useCallback(
    async (callSessionId: string) => {
      if (!userId) return
      if (!callChannelRef.current) return

      try {
        setCallBusy(true)
        stopRingtone()

        await supabase
          .from("call_sessions")
          .update({
            status: "rejected",
            ended_at: new Date().toISOString(),
          })
          .eq("id", callSessionId)

        await supabase.from("call_events").insert({
          call_session_id: callSessionId,
          actor_id: userId,
          event_type: "reject",
          payload: {
            conversationId,
          },
        })

        await callChannelRef.current.send({
          type: "broadcast",
          event: "call_reject",
          payload: {
            type: "call_reject",
            callSessionId,
            conversationId,
            fromUserId: userId,
          },
        })

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
    },
    [userId, conversationId, stopRingtone, cleanupAudioCall, router]
  )

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall?.callSessionId) return
    await acceptCallBySessionId(incomingCall.callSessionId)
  }, [incomingCall, acceptCallBySessionId])

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall?.callSessionId) return
    await rejectCallBySessionId(incomingCall.callSessionId)
  }, [incomingCall, rejectCallBySessionId])

  useEffect(() => {
    if (!userId) return

    const callChannel = supabase
      .channel(`call:conversation:${conversationId}`)
      .on("broadcast", { event: "call_invite" }, ({ payload }) => {
        if (!payload) return
        if (payload.toUserId !== userId) return
        if (payload.fromUserId === userId) return

        setIncomingCall({
          callSessionId: payload.callSessionId,
          fromUserId: payload.fromUserId,
        })
        setCurrentCallSessionId(payload.callSessionId)
        setCallUiState("incoming")
        playRingtone()
      })
      .on("broadcast", { event: "call_accept" }, async ({ payload }) => {
        if (!payload) return
        if (payload.callSessionId !== currentCallSessionIdRef.current) return
        if (!userId) return

        try {
          stopRingtone()

          const pc = await ensurePeerConnection(userId)
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          await callChannelRef.current?.send({
            type: "broadcast",
            event: "webrtc_offer",
            payload: {
              type: "webrtc_offer",
              callSessionId: payload.callSessionId,
              conversationId,
              fromUserId: userId,
              sdp: offer,
            },
          })

          setCallUiState("connected")
        } catch (error) {
          console.error("Offer create error:", error)
          alert("Nu am putut porni audio-ul apelului.")
          cleanupAudioCall()
          setCurrentCallSessionId(null)
          setCallUiState("idle")
        }
      })
      .on("broadcast", { event: "call_reject" }, ({ payload }) => {
        if (!payload) return
        if (payload.callSessionId !== currentCallSessionIdRef.current) return

        if (
          acceptedCallSessionRef.current &&
          payload.callSessionId === acceptedCallSessionRef.current
        ) {
          return
        }

        if (callUiState === "connected") {
          return
        }

        stopRingtone()
        cleanupAudioCall()
        setIncomingCall(null)
        setCurrentCallSessionId(null)
        setCallUiState("idle")
        alert("Apel respins.")
      })
      .on("broadcast", { event: "call_end" }, ({ payload }) => {
        if (!payload) return
        if (
          currentCallSessionIdRef.current &&
          payload.callSessionId !== currentCallSessionIdRef.current
        ) {
          return
        }

        stopRingtone()
        cleanupAudioCall()
        setIncomingCall(null)
        setCurrentCallSessionId(null)
        setCallUiState("idle")
      })
      .on("broadcast", { event: "webrtc_offer" }, async ({ payload }) => {
        if (!payload) return
        if (payload.callSessionId !== currentCallSessionIdRef.current) return
        if (!userId) return

        try {
          stopRingtone()

          const pc = await ensurePeerConnection(userId)
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          await callChannelRef.current?.send({
            type: "broadcast",
            event: "webrtc_answer",
            payload: {
              type: "webrtc_answer",
              callSessionId: payload.callSessionId,
              conversationId,
              fromUserId: userId,
              sdp: answer,
            },
          })

          setCallUiState("connected")
        } catch (error) {
          console.error("Offer handling error:", error)
        }
      })
      .on("broadcast", { event: "webrtc_answer" }, async ({ payload }) => {
        if (!payload) return
        if (payload.callSessionId !== currentCallSessionIdRef.current) return

        try {
          stopRingtone()

          const pc = peerConnectionRef.current
          if (!pc) return
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          setCallUiState("connected")
        } catch (error) {
          console.error("Answer handling error:", error)
        }
      })
      .on("broadcast", { event: "ice_candidate" }, async ({ payload }) => {
        if (!payload) return
        if (payload.callSessionId !== currentCallSessionIdRef.current) return

        try {
          const pc = peerConnectionRef.current
          if (!pc || !payload.candidate) return
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } catch (error) {
          console.error("ICE handling error:", error)
        }
      })
      .subscribe((status) => {
        console.log("Call channel status:", status)
      })

    callChannelRef.current = callChannel

    return () => {
      callChannelRef.current = null
      supabase.removeChannel(callChannel)
    }
  }, [
    conversationId,
    userId,
    ensurePeerConnection,
    cleanupAudioCall,
    playRingtone,
    stopRingtone,
    callUiState,
  ])

  useEffect(() => {
    if (!userId) return

    const callAction = searchParams.get("callAction")
    const targetCallSessionId = searchParams.get("callSessionId")

    let cancelled = false
    let attempts = 0

    async function syncIncomingCallFromDb() {
      const { data, error } = await supabase
        .from("call_sessions")
        .select("id, caller_id, callee_id, status, created_at")
        .eq("conversation_id", conversationId)
        .eq("callee_id", userId)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled || error || !data?.id) return null

      if (!incomingCall || incomingCall.callSessionId !== data.id) {
        setIncomingCall({
          callSessionId: data.id,
          fromUserId: data.caller_id,
        })
        setCurrentCallSessionId(data.id)
        setCallUiState("incoming")
        playRingtone()
      }

      return data
    }

    const timer = window.setInterval(async () => {
      attempts += 1

      if (cancelled) {
        window.clearInterval(timer)
        return
      }

      const dbCall = await syncIncomingCallFromDb()
      if (!dbCall?.id) {
        if (attempts >= 12) window.clearInterval(timer)
        return
      }

      if (!targetCallSessionId || dbCall.id !== targetCallSessionId) {
        if (attempts >= 12) window.clearInterval(timer)
        return
      }

      if (callBusy) {
        if (attempts >= 12) window.clearInterval(timer)
        return
      }

      if (autoActionHandledRef.current === targetCallSessionId) {
        window.clearInterval(timer)
        return
      }

      if (callAction === "answer") {
        autoActionHandledRef.current = targetCallSessionId
        window.clearInterval(timer)
        await acceptCallBySessionId(targetCallSessionId)
        return
      }

      if (callAction === "decline") {
        autoActionHandledRef.current = targetCallSessionId
        window.clearInterval(timer)
        await rejectCallBySessionId(targetCallSessionId)
        return
      }

      if (attempts >= 12) {
        window.clearInterval(timer)
      }
    }, 500)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [
    userId,
    conversationId,
    searchParams,
    incomingCall,
    callBusy,
    playRingtone,
    acceptCallBySessionId,
    rejectCallBySessionId,
  ])

  async function handleStartCall() {
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
        .insert({
          conversation_id: conversationId,
          caller_id: userId,
          callee_id: otherMember.member_id,
          status: "ringing",
        })
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
        payload: {
          conversationId,
        },
      })

      await callChannelRef.current.send({
        type: "broadcast",
        event: "call_invite",
        payload: {
          type: "call_invite",
          callSessionId,
          conversationId,
          fromUserId: userId,
          toUserId: otherMember.member_id,
        },
      })

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const pushResponse = await fetch("https://vivos-api.vercel.app/api/notifications/send-call-push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              conversationId,
              callSessionId,
              calleeId: otherMember.member_id,
            }),
          })

          const pushResult = await pushResponse.json().catch(() => null)
          console.log("Call push delivery result:", pushResult)

          if (!pushResponse.ok) {
            alert(`Eroare call push: ${pushResult?.error || pushResponse.status}`)
          } else if (pushResult?.skipped) {
            alert(`Call push skipped: ${pushResult.skipped}`)
          } else {
            alert(`Call push ok: web=${pushResult?.webPushSent || 0}/${pushResult?.webPushFailed || 0}, fcm=${pushResult?.fcmSent || 0}/${pushResult?.fcmFailed || 0}`)
          }
        }
      } catch (pushError: any) {
        console.error("Call push request failed:", pushError)
        alert(`Call push request failed: ${pushError?.message || String(pushError)}`)
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
  }

  async function handleEndCall() {
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
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", currentCallSessionId)

      await supabase.from("call_events").insert({
        call_session_id: currentCallSessionId,
        actor_id: userId,
        event_type: "end",
        payload: {
          conversationId,
        },
      })

      await callChannelRef.current?.send({
        type: "broadcast",
        event: "call_end",
        payload: {
          type: "call_end",
          callSessionId: currentCallSessionId,
          conversationId,
          fromUserId: userId,
        },
      })
    } catch (error) {
      console.error("End call error:", error)
    } finally {
      cleanupAudioCall()
      setIncomingCall(null)
      setCurrentCallSessionId(null)
      setCallUiState("idle")
      setCallBusy(false)
    }
  }

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

  const callDisplayName = otherName || "Membru"
  const callInitial = callDisplayName.trim().charAt(0).toUpperCase() || "M"
  const showCallOverlay =
    callUiState === "incoming" ||
    callUiState === "outgoing" ||
    callUiState === "connected"

  return (
    <main className="min-h-screen bg-slate-50">
      <audio ref={remoteAudioRef} autoPlay playsInline preload="none" />
      <audio ref={ringtoneRef} src="/sounds/incoming-call.mp3" preload="auto" />

      <div className="mx-auto flex min-h-screen max-w-4xl flex-col">
        <div className="sticky top-0 z-10 mb-4 flex flex-col gap-3 bg-slate-50 px-4 pb-3 pt-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Conversație</p>
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">
              {loading ? "Se încarcă..." : otherName}
            </h1>
            {!loading && !otherMember ? (
              <p className="mt-1 text-sm text-red-500">
                Conversația nu are încă datele membrului încărcate.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {callUiState === "idle" ? (
              <Button
                className="rounded-2xl px-5 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleStartCall}
                disabled={callBusy || !otherMember}
                title={!otherMember ? "Conversația nu are încă membrul încărcat" : ""}
              >
                {callBusy ? "Se inițiază..." : "Apelează"}
              </Button>
            ) : null}

            {callUiState === "outgoing" ? (
              <Button
                variant="outline"
                className="rounded-2xl px-5"
                onClick={handleEndCall}
                disabled={callBusy}
              >
                {callBusy ? "Se închide..." : "Anulează"}
              </Button>
            ) : null}

            {callUiState === "connected" ? (
              <Button
                variant="outline"
                className="rounded-2xl px-5"
                onClick={handleEndCall}
                disabled={callBusy}
              >
                {callBusy ? "Se închide..." : "Închide"}
              </Button>
            ) : null}

            <Button
              variant="outline"
              className="rounded-2xl px-5"
              onClick={() => router.push("/messages")}
            >
              Înapoi
            </Button>
          </div>
        </div>

        <div className="grid flex-1 gap-4 px-4 pb-24 sm:px-6">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Mesaje</CardTitle>
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
                        className={`rounded-2xl border p-4 ${
                          mine ? "bg-slate-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{mine ? "Tu" : otherName}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(msg.created_at).toLocaleString("ro-RO")}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {msg.body}
                        </p>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Trimite mesaj</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Scrie mesajul tău..."
                />

                <Button type="submit" className="rounded-2xl px-6" disabled={sending}>
                  {sending ? "Se trimite..." : "Trimite"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {showCallOverlay ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-3xl font-semibold text-slate-700 sm:h-28 sm:w-28 sm:text-4xl">
                {callInitial}
              </div>

              <h2 className="max-w-full truncate text-2xl font-semibold text-slate-900">
                {callDisplayName}
              </h2>

              {callUiState === "incoming" ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">Apel incoming</p>
                  <p className="mt-1 text-xs text-slate-400">Te apelează acum</p>

                  <div className="mt-8 grid w-full grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleAcceptCall}
                      disabled={callBusy}
                      className="rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {callBusy ? "Se acceptă..." : "Răspunde"}
                    </button>

                    <button
                      type="button"
                      onClick={handleRejectCall}
                      disabled={callBusy}
                      className="rounded-2xl bg-red-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {callBusy ? "Se respinge..." : "Respinge"}
                    </button>
                  </div>
                </>
              ) : null}

              {callUiState === "outgoing" ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">Se apelează...</p>
                  <p className="mt-1 text-xs text-slate-400">Așteptăm răspunsul</p>

                  <button
                    type="button"
                    onClick={handleEndCall}
                    disabled={callBusy}
                    className="mt-8 w-full rounded-2xl bg-red-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {callBusy ? "Se închide..." : "Anulează apelul"}
                  </button>
                </>
              ) : null}

              {callUiState === "connected" ? (
                <>
                  <p className="mt-2 text-sm text-emerald-600">Conectat</p>
                  <p className="mt-1 text-xs text-slate-400">Apel audio activ</p>

                  <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Microfon activ
                  </div>

                  <button
                    type="button"
                    onClick={handleEndCall}
                    disabled={callBusy}
                    className="mt-8 w-full rounded-2xl bg-red-600 px-4 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {callBusy ? "Se închide..." : "Închide apelul"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
