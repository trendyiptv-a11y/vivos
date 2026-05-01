"use client"

import dynamic from "next/dynamic"
import MessengerConversationLoadingShell from "@/components/messenger/conversation-loading-shell"

const LegacyConversationPage = dynamic(() => import("@/app/messages/[id]/page"), {
  ssr: false,
  loading: () => <MessengerConversationLoadingShell />,
})

export default function MessengerConversationCore() {
  return <LegacyConversationPage />
}
