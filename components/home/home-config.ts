import {
  BookOpen,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react"

export const homeNavItems = [
  { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { id: "members", labelKey: "nav.members", icon: Users },
  { id: "messages", labelKey: "nav.messages", icon: MessageSquare },
  { id: "market", labelKey: "nav.market", icon: ShoppingBag },
  { id: "about", labelKey: "nav.about", icon: BookOpen },
  { id: "wallet", labelKey: "nav.wallet", icon: Wallet },
  { id: "fund", labelKey: "nav.fund", icon: HeartHandshake },
  { id: "archive", labelKey: "nav.archive", icon: FileText },
  { id: "governance", labelKey: "nav.governance", icon: Shield },
  { id: "settings", labelKey: "nav.settings", icon: Settings },
] as const

export const homeWalletEntries = [
  {
    labelKey: "walletPage.entryConfirmedExchange",
    amount: "+120",
    metaKey: "walletPage.metaElectricalRepairs",
  },
  {
    labelKey: "walletPage.entryFundContribution",
    amount: "-30",
    metaKey: "walletPage.metaMonthlyContribution",
  },
  {
    labelKey: "walletPage.entryInvolvementReward",
    amount: "+25",
    metaKey: "walletPage.metaCommunityModeration",
  },
  {
    labelKey: "walletPage.entrySupportReceived",
    amount: "+90",
    metaKey: "walletPage.metaMedicalTransport",
  },
] as const

export const homeArchiveItems = [
  {
    titleKey: "archivePage.itemDecision14",
    typeKey: "archivePage.typeDecision",
    date: "28 mar 2026",
  },
  {
    titleKey: "archivePage.itemMarchReport",
    typeKey: "archivePage.typeReport",
    date: "27 mar 2026",
  },
  {
    titleKey: "archivePage.itemBarterUpdate",
    typeKey: "archivePage.typeRule",
    date: "25 mar 2026",
  },
  {
    titleKey: "archivePage.itemTimestampRegistry",
    typeKey: "archivePage.typeProof",
    date: "24 mar 2026",
  },
] as const

export type HomeNavItem = (typeof homeNavItems)[number]
