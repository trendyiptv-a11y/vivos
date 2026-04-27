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
  { label: "Schimb confirmat", amount: "+120", meta: "Reparații electrice" },
  { label: "Contribuție fond mutual", amount: "-30", meta: "Contribuție lunară" },
  { label: "Recompensă implicare", amount: "+25", meta: "Moderare comunitară" },
  { label: "Sprijin primit", amount: "+90", meta: "Transport medical" },
] as const

export const homeArchiveItems = [
  { title: "Decizie #14 — criterii fond mutual", type: "Hotărâre", date: "28 mar 2026" },
  { title: "Raport lunar martie 2026", type: "Raport", date: "27 mar 2026" },
  { title: "Actualizare regulament barter", type: "Regulă", date: "25 mar 2026" },
  { title: "Timestamp registru contribuții", type: "Dovadă", date: "24 mar 2026" },
] as const

export type HomeNavItem = (typeof homeNavItems)[number]
