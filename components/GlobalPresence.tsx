"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export default function GlobalPresence() {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      const userId = session.user.id

      channel = supabase.channel(`presence-global-${userId}`, {
        config: { presence: { key: userId } },
      })

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel!.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && channel) {
        supabase.removeChannel(channel)
        channel = null
      } else if (event === "SIGNED_IN") {
        init()
      }
    })

    return () => {
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return null
}
