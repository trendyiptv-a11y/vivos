import React, { useMemo, useState } from "react"
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

const members = [
  {
    name: "Sergiu B.",
    role: "Membru activ",
    skills: ["electrician", "organizare", "strategie"],
    reputation: 94,
    contribution: 1240,
    needs: "transport ocazional",
  },
  {
    name: "Ana M.",
    role: "Susținător",
    skills: ["hrană", "îngrijire", "logistică"],
    reputation: 89,
    contribution: 860,
    needs: "ajutor juridic",
  },
  {
    name: "Mihai C.",
    role: "Observator",
    skills: ["design", "web", "video"],
    reputation: 71,
    contribution: 310,
    needs: "colaborări tehnice",
  },
  {
    name: "Elena D.",
    role: "Membru activ",
    skills: ["educație", "traduceri", "administrare"],
    reputation: 91,
    contribution: 980,
    needs: "sprijin medical urgent",
  },
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

function Shell({
  active,
  setActive,
  children,
}: {
  active: string
  setActive: (value: string) => void
  children: React.ReactNode
}) {
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
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
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

                <Avatar className="h-10 w-10 rounded-2xl">
                  <AvatarFallback className="rounded-2xl bg-slate-900 text-white">
                    VB
                  </AvatarFallback>
                </Avatar>
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
              ["Publică ofertă", ShoppingBag],
              ["Cere sprijin", HeartHandshake],
              ["Vezi arhiva", BookOpen],
              ["Actualizează profil", Users],
            ].map(([label, Icon], i) => {
              const Comp = Icon as React.ComponentType<{ className?: string }>
              return (
                <Button key={i} variant="outline" className="justify-start rounded-2xl py-6 text-left">
                  <Comp className="mr-3 h-4 w-4" />
                  {label}
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

function MembersScreen() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Registrul membrilor</CardTitle>
            <Button className="rounded-2xl">Adaugă membru</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member, i) => (
              <div key={i} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12 rounded-2xl">
                      <AvatarFallback className="rounded-2xl bg-slate-900 text-white">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-slate-500">{member.role}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {member.skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="rounded-xl">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 md:text-right">
                    <p>
                      Reputație:{" "}
                      <span className="font-medium text-slate-900">{member.reputation}</span>
                    </p>
                    <p>
                      Contribuție:{" "}
                      <span className="font-medium text-slate-900">
                        {member.contribution} talanți
                      </span>
                    </p>
                    <p>
                      Nevoie:{" "}
                      <span className="font-medium text-slate-900">{member.needs}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-2xl">
                    Vezi profil
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Propune schimb
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Trimite mesaj
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Filtre și structură</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Caută</p>
              <Input placeholder="Nume, competență, rol..." className="rounded-2xl" />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Rol</p>
              <div className="flex flex-wrap gap-2">
                {["Toți", "Observator", "Activ", "Susținător", "Suspendat"].map((x) => (
                  <Badge key={x} variant="outline" className="rounded-xl">
                    {x}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Competențe populare</p>
              <div className="flex flex-wrap gap-2">
                {["electrician", "hrană", "juridic", "transport", "digital"].map((x) => (
                  <Badge key={x} variant="secondary" className="rounded-xl">
                    {x}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-slate-600">
              <p>Membru observator: 12</p>
              <p>Membru activ: 24</p>
              <p>Susținător: 9</p>
              <p>Suspendat: 3</p>
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
          <Button variant="outline" className="rounded-2xl">
            Publică cerere
          </Button>
          <Button className="rounded-2xl">Publică ofertă</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {marketItems.map((item, i) => (
          <Card key={i} className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-xl">
                  {item.type}
                </Badge>
                <Badge variant="outline" className="rounded-xl">
                  {item.category}
                </Badge>
              </div>
              <h4 className="text-lg font-semibold leading-6">{item.title}</h4>
              <p className="mt-2 text-sm text-slate-500">{item.location}</p>
              <p className="mt-1 text-sm text-slate-500">Valoare: {item.value}</p>
              <div className="mt-4 flex items-center justify-between">
                <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                  {item.status}
                </Badge>
                <Button variant="outline" className="rounded-2xl">
                  Detalii
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Flux schimb</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          {[
            ["1. Publicare", "Membrul creează o ofertă sau o cerere."],
            ["2. Potrivire", "Alt membru propune schimb sau colaborare."],
            ["3. Confirmare", "Ambele părți confirmă condițiile."],
            ["4. Feedback", "Rezultatul actualizează reputația și portofelul."],
          ].map(([title, desc], i) => (
            <div key={i} className="rounded-2xl border p-4">
              <p className="font-medium">{title as string}</p>
              <p className="mt-2 text-sm text-slate-500">{desc as string}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function WalletScreen() {
  const balance = useMemo(() => 845, [])

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Portofel intern</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-3xl bg-slate-900 p-6 text-white">
            <p className="text-sm text-slate-300">Sold disponibil</p>
            <p className="mt-2 text-4xl font-semibold">{balance} talanți</p>
            <p className="mt-3 text-sm text-slate-300">
              Valoare oferită, primită și recunoscută în comunitate.
            </p>
          </div>

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

      <div className="space-y-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Indicatori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Valoare oferită</span>
              <span className="font-medium text-slate-900">1.420</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Valoare primită</span>
              <span className="font-medium text-slate-900">575</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Contribuții fond</span>
              <span className="font-medium text-slate-900">180</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Scor de încredere</span>
              <span className="font-medium text-slate-900">A-</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Acțiuni</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button className="rounded-2xl">Transfer intern</Button>
            <Button variant="outline" className="rounded-2xl">
              Vezi toate tranzacțiile
            </Button>
            <Button variant="outline" className="rounded-2xl">
              Contribuie la fond
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
  
}

function FundScreen() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Fond mutual</CardTitle>
          <Button className="rounded-2xl">Depune cerere</Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Total disponibil</p>
              <p className="mt-2 text-2xl font-semibold">12.300 DKK</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Cereri active</p>
              <p className="mt-2 text-2xl font-semibold">6</p>
            </div>
            <div className="rounded-2xl border p-4">
              <p className="text-sm text-slate-500">Sprijin acordat luna asta</p>
              <p className="mt-2 text-2xl font-semibold">2.150 DKK</p>
            </div>
          </div>

          <div className="space-y-3">
            {fundRequests.map((r, i) => (
              <div key={i} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{r.member}</p>
                    <p className="text-sm text-slate-500">
                      Nevoie: {r.need} · {r.amount}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-xl">
                      Urgentă: {r.urgency}
                    </Badge>
                    <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                      {r.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Criterii eligibilitate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>• membru înregistrat și activ</p>
            <p>• nevoie reală și documentată minimal</p>
            <p>• lipsa abuzurilor anterioare</p>
            <p>• evaluare proporțională cu fondul disponibil</p>
            <p>• arhivare completă a deciziei</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Flux aprobare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Depunere cerere", "Analiză", "Decizie", "Execuție", "Arhivare"].map(
              (step, i) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-sm font-medium text-white">
                    {i + 1}
                  </div>
                  <p className="text-sm">{step}</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ArchiveScreen() {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Arhivă și memorie comunitară</CardTitle>
          <Button variant="outline" className="rounded-2xl">
            Încarcă document
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {archiveItems.map((item, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500">
                  {item.type} · {item.date}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-2xl">
                  Vezi
                </Button>
                <Button variant="outline" className="rounded-2xl">
                  Hash
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Ce se arhivează</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              "Aderări",
              "Schimburi importante",
              "Decizii",
              "Rapoarte fond",
              "Sancțiuni",
              "Procese verbale",
              "Dovezi timestamp",
              "Reguli actualizate",
            ].map((x) => (
              <div key={x} className="rounded-2xl border p-4 text-sm">
                {x}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Integritate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>• semnătură internă</p>
            <p>• registru versionat</p>
            <p>• hash document</p>
            <p>• timestamp extern</p>
            <p>• trasabilitate decizională</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GovernanceScreen() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Guvernanță vie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            ["Administratori", "gestionare operațională și membri"],
            ["Custode fond", "analiză cereri și raportare"],
            ["Moderatori", "ordine comunitară și mediere"],
            ["Arbitri", "soluționare conflicte și decizii sensibile"],
          ].map(([role, desc]) => (
            <div key={role} className="rounded-2xl border p-4">
              <p className="font-medium">{role}</p>
              <p className="mt-2 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Circuit decizional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            ["Propunere", "un membru sau rol operațional inițiază o decizie"],
            ["Consultare", "membrii relevanți sunt informați și pot comenta"],
            ["Hotărâre", "se aprobă, modifică sau respinge"],
            ["Publicare", "decizia intră în arhivă și devine vizibilă"],
          ].map(([title, desc], i) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-sm font-medium text-white">
                {i + 1}
              </div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsScreen() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Configurări comunitate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>• prag reputație minimă pentru acces la fond</p>
          <p>• categorii de piață și tipuri de schimb</p>
          <p>• roluri active și permisiuni</p>
          <p>• reguli de arhivare și dovadă</p>
          <p>• text public: misiune, principii, aderare</p>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Direcții următoare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>• onboarding complet pentru membri</p>
          <p>• chat intern sau mesagerie directă</p>
          <p>• modul reputație mai detaliat</p>
          <p>• export PDF pentru rapoarte și decizii</p>
          <p>• ancorare externă pentru documente critice</p>
        </CardContent>
      </Card>
    </div>
  )
}

      
