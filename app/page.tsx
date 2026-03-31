"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  BookOpen,
  Coins,
  FileText,
  HandCoins,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase/client"

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "members", label: "Membri", icon: Users },
  { id: "market", label: "Piață comunitară", icon: ShoppingBag },
  { id: "wallet", label: "Portofel", icon: Wallet },
  { id: "fund", label: "Fond mutual", icon: HeartHandshake },
  { id: "archive", label: "Arhivă", icon: FileText },
  { id: "governance", label: "Guvernanță", icon: Shield },
  { id: "settings", label: "Setări", icon: Settings },
]

const marketItems = [
  {
    title: "Reparații electrice ușoare",
    type: "Ofertă",
    category: "Servicii",
    value: "120 talanți",
    location: "Copenhaga",
    status: "Activ",
  },
  {
    title: "Transport pentru spital",
    type: "Cerere",
    category: "Logistică",
    value: "40 talanți",
    location: "Odense",
    status: "Urgent",
  },
  {
    title: "Legume și conserve",
    type: "Ofertă",
    category: "Bunuri",
    value: "60 talanți",
    location: "Varde",
    status: "Activ",
  },
  {
    title: "Ajutor configurare site",
    type: "Cerere",
    category: "Digital",
    value: "150 talanți",
    location: "Remote",
    status: "În lucru",
  },
]

const walletEntries = [
  { label: "Schimb confirmat", amount: "+120", meta: "Reparații electrice" },
  { label: "Contribuție fond mutual", amount: "-30", meta: "Contribuție lunară" },
  { label: "Recompensă implicare", amount: "+25", meta: "Moderare comunitară" },
  { label: "Sprijin primit", amount: "+90", meta: "Transport medical" },
]

const fundRequests = [
  { member: "Elena D.", need: "medicamente", urgency: "Ridicată", amount: "300 DKK", status: "În analiză" },
  { member: "Ana M.", need: "transport", urgency: "Mediu", amount: "150 DKK", status: "Aprobat parțial" },
  { member: "Mihai C.", need: "hrană", urgency: "Ridicată", amount: "200 DKK", status: "Executat" },
]

const archiveItems = [
  { title: "Decizie #14 — criterii fond mutual", type: "Hotărâre", date: "28 mar 2026" },
  { title: "Raport lunar martie 2026", type: "Raport", date: "27 mar 2026" },
  { title: "Actualizare regulament barter", type: "Regulă", date: "25 mar 2026" },
  { title: "Timestamp registru contribuții", type: "Dovadă", date: "24 mar 2026" },
]

type ProfileMember = {
  id: string
  email: string
  name: string | null
  alias: string | null
  role: string | null
  skills: string | null
  offers_summary: string | null
  needs_summary: string | null
  created_at?: string | null
}
type MarketPost = {
  id: string
  author_id: string
  post_type: "offer" | "request"
  title: string
  category: string | null
  description: string | null
  value_text: string | null
  location: string | null
  status: "active" | "in_progress" | "closed"
  created_at: string
}
type ShellProps = {
  active: string
  setActive: (value: string) => void
  children: React.ReactNode
  userEmail: string | null
}

function Shell({ active, setActive, children, userEmail }: ShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center gap-3 border-b px-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rețea vie</p>
              <h1 className="text-xl font-semibold">VIVOS</h1>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 rounded-2xl border bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Spațiu comunitar</p>
              <p className="mt-1 text-sm font-medium">Ordine vie, schimb și sprijin mutual</p>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = active === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                      isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b bg-white/85 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Wireframe MVP</p>
                <h2 className="text-2xl font-semibold">Platforma comunitară VIVOS</h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2 md:flex">
                  <Search className="h-4 w-4 text-slate-500" />
                  <Input
                    className="h-auto w-48 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    placeholder="Caută membri, decizii, schimburi..."
                  />
                </div>

                <Button variant="outline" className="rounded-2xl">
                  <Bell className="mr-2 h-4 w-4" />
                  Notificări
                </Button>

                {userEmail ? (
                  <>
                    <div className="max-w-[120px] truncate rounded-2xl border bg-white px-3 py-2 text-xs text-slate-600 sm:max-w-[180px] sm:text-sm">
                      {userEmail}
                    </div>

                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={async () => {
                        await supabase.auth.signOut()
                        window.location.href = "/"
                      }}
                    >
                      Logout
                    </Button>

                    <Avatar className="h-10 w-10 rounded-2xl">
                      <AvatarFallback className="rounded-2xl bg-slate-900 text-white">
                        {userEmail.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </>
                ) : (
                  <Button
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.href = "/login"
                    }}
                  >
                    Login
                  </Button>
                )}
              </div>
            </div>
          </header>

          <ScrollArea className="flex-1">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="p-6"
            >
              {children}
            </motion.div>
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="rounded-3xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  )
}

function DashboardScreen() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Membri activi" value="48" hint="12 membri noi în ultima lună" icon={Users} />
        <StatCard title="Valoare circulată" value="4.280" hint="Talanți schimbați în 30 zile" icon={Coins} />
        <StatCard title="Fond mutual" value="12.300 DKK" hint="Disponibil pentru sprijin imediat" icon={HandCoins} />
        <StatCard title="Cereri urgente" value="6" hint="2 necesită răspuns astăzi" icon={LifeBuoy} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Fluxul comunității</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Elena D. a primit sprijin mutual pentru medicamente.",
              "Sergiu B. a finalizat un schimb pentru reparații electrice.",
              "A fost publicată Decizia #14 privind criteriile fondului.",
              "Două oferte noi au fost adăugate în Piața comunitară.",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border p-4">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Acțiuni rapide</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              { label: "Publică ofertă", icon: ShoppingBag, href: "/market/new" },
              { label: "Cere sprijin", icon: HeartHandshake, href: "#" },
              { label: "Vezi arhiva", icon: BookOpen, href: "#" },
              { label: "Actualizează profil", icon: Users, href: "/profile" },
            ].map((item, i) => {
              const Comp = item.icon
              return (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start rounded-2xl py-6 text-left"
                  onClick={() => {
                    if (item.href !== "#") window.location.href = item.href
                  }}
                >
                  <Comp className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-3xl border-0 shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Nevoi și oferte recente</CardTitle>
            <Tabs defaultValue="all">
              <TabsList className="rounded-2xl">
                <TabsTrigger value="all">Toate</TabsTrigger>
                <TabsTrigger value="needs">Cereri</TabsTrigger>
                <TabsTrigger value="offers">Oferte</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketItems.map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-xl">
                      {item.type}
                    </Badge>
                    <Badge variant="outline" className="rounded-xl">
                      {item.category}
                    </Badge>
                    <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.location} · {item.value}
                  </p>
                </div>
                <Button className="rounded-2xl">Vezi detalii</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Sănătatea rețelei</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Încredere comunitară", 88],
              ["Circulația valorii", 72],
              ["Răspuns la urgențe", 81],
              ["Participare activă", 66],
            ].map(([label, value], i) => (
              <div key={i}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{label as string}</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <Progress value={value as number} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MembersScreen({
  members,
  loading,
  isLoggedIn,
}: {
  members: ProfileMember[]
  loading: boolean
  isLoggedIn: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Registrul membrilor</CardTitle>
            <div className="text-sm text-slate-500">
              {isLoggedIn ? `${members.length} membri` : "acces restricționat"}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Se încarcă membrii...
              </div>
            ) : !isLoggedIn ? (
              <div className="rounded-2xl border p-6">
                <h3 className="text-lg font-semibold">Vezi membrii comunității</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Autentifică-te pentru a vedea membrii activi, profilurile lor și posibilitățile de colaborare.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.href = "/login"
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.href = "/signup"
                    }}
                  >
                    Creează cont
                  </Button>
                </div>
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Nu există încă membri înregistrați în tabelul profiles.
              </div>
            ) : (
              members.map((member) => {
                const displayName =
                  member.name?.trim() ||
                  member.alias?.trim() ||
                  member.email?.split("@")[0] ||
                  "Membru"

                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

                const skillsList = member.skills
                  ? member.skills.split(",").map((s) => s.trim()).filter(Boolean)
                  : []

                return (
                  <div
  key={member.id}
  className="cursor-pointer rounded-2xl border p-4 transition hover:bg-slate-50"
  onClick={() => {
    window.location.href = `/member/${member.id}`
  }}
>
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-3">
                        <Avatar className="h-12 w-12 rounded-2xl">
                          <AvatarFallback className="rounded-2xl bg-slate-900 text-white">
                            {initials || "MB"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(skillsList.length ? skillsList : ["fără competențe completate"]).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="rounded-xl">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 md:text-right">
                        <p>
                          Rol: <span className="font-medium text-slate-900">{member.role || "member"}</span>
                        </p>
                        <p>
                          Oferă:{" "}
                          <span className="font-medium text-slate-900">
                            {member.offers_summary?.trim() || "necompletat"}
                          </span>
                        </p>
                        <p>
                          Caută:{" "}
                          <span className="font-medium text-slate-900">
                            {member.needs_summary?.trim() || "necompletat"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
  <Button
    variant="outline"
    className="rounded-2xl"
    onClick={(e) => {
      e.stopPropagation()
      window.location.href = `/member/${member.id}`
    }}
  >
    Vezi profil
  </Button>
</div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Filtre și structură</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Acces membri</p>
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Vizibil doar pentru utilizatori autentificați.
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Ce poți vedea după login</p>
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Profiluri, competențe, ce oferă și ce caută membrii comunității.
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm text-slate-600">
              <p>Total membri reali: {isLoggedIn ? members.length : 0}</p>
              <p>Încărcare: {loading ? "da" : "nu"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
function MarketScreen() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Piața comunitară</h3>
          <p className="text-slate-500">Oferte, cereri, barter și colaborări directe.</p>
        </div>
        <div className="flex gap-3">
  <Button
    variant="outline"
    className="rounded-2xl"
    onClick={() => {
      window.location.href = "/market/new"
    }}
  >
    Publică cerere
  </Button>
  <Button
    className="rounded-2xl"
    onClick={() => {
      window.location.href = "/market/new"
    }}
  >
    Publică ofertă
  </Button>
</div>
      </div>
    </div>
  )
}

function WalletScreen() {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Portofel intern</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {walletEntries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-sm text-slate-500">{entry.meta}</p>
                </div>
                <p className="text-lg font-semibold">{entry.amount}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FundScreen() {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Fond mutual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fundRequests.map((r, i) => (
              <div key={i} className="rounded-2xl border p-4">
                <p className="font-medium">{r.member}</p>
                <p className="text-sm text-slate-500">
                  Nevoie: {r.need} · {r.amount}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ArchiveScreen() {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Arhivă și memorie comunitară</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {archiveItems.map((item, i) => (
            <div key={i} className="rounded-2xl border p-4">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-slate-500">
                {item.type} · {item.date}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function GovernanceScreen() {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Guvernanță vie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Modul de guvernanță rămâne demo în această versiune.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsScreen() {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Setări</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Setările rămân demo în această versiune.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Page() {
  const [active, setActive] = useState("dashboard")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [members, setMembers] = useState<ProfileMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
const [marketPosts, setMarketPosts] = useState<MarketPost[]>([])
  useEffect(() => {
    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setUserEmail(session?.user?.email ?? null)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function loadMembers() {
      setMembersLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setMembers([])
        setMembersLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, alias, role, skills, offers_summary, needs_summary, created_at")
        .order("created_at", { ascending: false })

      if (!error && data) {
        setMembers(data as ProfileMember[])
      } else {
        setMembers([])
      }

      setMembersLoading(false)
    }

    loadMembers()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadMembers()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
const [marketPosts, setMarketPosts] = useState<MarketPost[]>([])
  const screen = useMemo(() => {
    switch (active) {
      case "members":
        return <MembersScreen members={members} loading={membersLoading} isLoggedIn={!!userEmail} />
      case "market":
        return <MarketScreen />
      case "wallet":
        return <WalletScreen />
      case "fund":
        return <FundScreen />
      case "archive":
        return <ArchiveScreen />
      case "governance":
        return <GovernanceScreen />
      case "settings":
        return <SettingsScreen />
      default:
        return <DashboardScreen />
    }
  }, [active, members, membersLoading, userEmail])

  return (
    <Shell active={active} setActive={setActive} userEmail={userEmail}>
      {screen}
    </Shell>
  )
}
