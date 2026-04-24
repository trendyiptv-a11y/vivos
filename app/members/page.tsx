"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type ProfileMember = {
  id: string
  email: string
  name: string | null
  alias: string | null
  role: string | null
  skills: string | null
  offers_summary: string | null
  needs_summary: string | null
}

type MemberRoleRow = {
  user_id: string
  role: "member" | "merchant" | "courier"
  is_active: boolean
}

type MerchantProfileRow = {
  user_id: string
  display_name: string | null
  business_name: string | null
  merchant_category: "local_shop" | "artisan" | "food" | "auto_parts" | "services" | "other"
  delivery_available: boolean
  pickup_available: boolean
  is_active: boolean
}

type MemberFilter = "all" | "offers" | "needs" | "skills" | "merchant" | "courier"

function merchantCategoryLabel(category: MerchantProfileRow["merchant_category"]) {
  if (category === "local_shop") return "Magazin local"
  if (category === "artisan") return "Artizan"
  if (category === "food") return "Food"
  if (category === "auto_parts") return "Piese auto"
  if (category === "services") return "Servicii"
  return "Altceva"
}

export default function MembersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [members, setMembers] = useState<ProfileMember[]>([])
  const [memberRolesMap, setMemberRolesMap] = useState<Record<string, string[]>>({})
  const [merchantProfilesMap, setMerchantProfilesMap] = useState<Record<string, MerchantProfileRow>>({})
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<MemberFilter>("all")

  useEffect(() => {
    async function loadMembers() {
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const [membersResult, rolesResult, merchantResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, name, alias, role, skills, offers_summary, needs_summary")
          .order("created_at", { ascending: false }),
        supabase
          .from("member_roles")
          .select("user_id, role, is_active")
          .eq("is_active", true),
        supabase
          .from("merchant_profiles")
          .select("user_id, display_name, business_name, merchant_category, delivery_available, pickup_available, is_active")
          .eq("is_active", true),
      ])

      if (membersResult.error) {
        setMessage(membersResult.error.message)
        setLoading(false)
        return
      }

      if (rolesResult.error) {
        setMessage(rolesResult.error.message)
        setLoading(false)
        return
      }

      if (merchantResult.error) {
        setMessage(merchantResult.error.message)
        setLoading(false)
        return
      }

      const rolesMap = ((rolesResult.data ?? []) as MemberRoleRow[]).reduce<Record<string, string[]>>((acc, item) => {
        if (!acc[item.user_id]) acc[item.user_id] = []
        acc[item.user_id].push(item.role)
        return acc
      }, {})

      const merchantMap = ((merchantResult.data ?? []) as MerchantProfileRow[]).reduce<Record<string, MerchantProfileRow>>((acc, item) => {
        acc[item.user_id] = item
        return acc
      }, {})

      setMembers((membersResult.data ?? []) as ProfileMember[])
      setMemberRolesMap(rolesMap)
      setMerchantProfilesMap(merchantMap)
      setLoading(false)
    }

    loadMembers()
  }, [router])

  async function handleStartChat(memberId: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      if (session.user.id === memberId) {
        router.push("/messages")
        return
      }

      const { data, error } = await supabase.rpc("find_or_create_direct_conversation", {
        other_member_id: memberId,
      })

      if (error || !data) {
        alert("Nu am putut porni conversația.")
        return
      }

      await supabase
        .from("conversation_hidden_for_users")
        .delete()
        .eq("conversation_id", data)
        .eq("user_id", session.user.id)

      router.push(`/messages/${data}`)
    } catch (error) {
      console.error("Start chat error:", error)
      alert("Nu am putut porni conversația.")
    }
  }

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return members.filter((member) => {
      const roles = memberRolesMap[member.id] || [member.role || "member"]
      const merchantProfile = merchantProfilesMap[member.id] || null
      const haystack = [
        member.name || "",
        member.alias || "",
        member.email || "",
        member.role || "",
        roles.join(" "),
        member.skills || "",
        member.offers_summary || "",
        member.needs_summary || "",
        merchantProfile?.display_name || "",
        merchantProfile?.business_name || "",
      ]
        .join(" ")
        .toLowerCase()

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const hasOffers = !!member.offers_summary?.trim()
      const hasNeeds = !!member.needs_summary?.trim()
      const hasSkills = !!member.skills?.trim()
      const isMerchant = roles.includes("merchant")
      const isCourier = roles.includes("courier")

      const matchesFilter =
        filter === "all" ||
        (filter === "offers" && hasOffers) ||
        (filter === "needs" && hasNeeds) ||
        (filter === "skills" && hasSkills) ||
        (filter === "merchant" && isMerchant) ||
        (filter === "courier" && isCourier)

      return matchesSearch && matchesFilter
    })
  }, [filter, members, memberRolesMap, merchantProfilesMap, search])

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)",
        }}
      >
        <div className="mx-auto flex min-h-[84px] max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] sm:text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>
              Registru comunitar
            </p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl" style={{ color: vivosTheme.colors.white }}>
              Membri
            </h1>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15"
            onClick={() => router.push("/")}
          >
            Înapoi
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">Registrul membrilor</CardTitle>
            <div className="text-sm text-slate-500">{filteredMembers.length} membri</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după nume, alias, email, skill sau profil comercial"
              className="rounded-2xl"
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={filter === "all" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("all")}>Toți</Button>
              <Button type="button" variant={filter === "offers" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("offers")}>Cu oferte</Button>
              <Button type="button" variant={filter === "needs" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("needs")}>Cu nevoi</Button>
              <Button type="button" variant={filter === "skills" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("skills")}>Cu skill-uri</Button>
              <Button type="button" variant={filter === "merchant" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("merchant")}>Comercianți</Button>
              <Button type="button" variant={filter === "courier" ? "default" : "outline"} className="rounded-2xl" onClick={() => setFilter("courier")}>Curieri</Button>
            </div>

            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Se încarcă membrii...</div>
            ) : message ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">Nu există membri care să corespundă căutării sau filtrului selectat.</div>
            ) : (
              filteredMembers.map((member) => {
                const displayName = member.name?.trim() || member.alias?.trim() || member.email?.split("@")[0] || "Membru"
                const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                const skillsList = member.skills ? member.skills.split(",").map((s) => s.trim()).filter(Boolean) : []
                const roles = memberRolesMap[member.id] || [member.role || "member"]
                const merchantProfile = merchantProfilesMap[member.id] || null
                const merchantName = merchantProfile?.display_name?.trim() || merchantProfile?.business_name?.trim() || null

                return (
                  <div key={member.id} className="cursor-pointer rounded-2xl border p-4 transition hover:bg-slate-50" onClick={() => router.push(`/member/${member.id}`)}>
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-3">
                        <Avatar className="h-12 w-12 rounded-2xl">
                          <AvatarFallback className="rounded-2xl bg-slate-900 text-white">{initials || "MB"}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="font-medium">{displayName}</p>
                          <p className="truncate text-sm text-slate-500">{member.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {roles.includes("merchant") ? <Badge className="rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-100">Comerciant</Badge> : null}
                            {roles.includes("courier") ? <Badge className="rounded-xl bg-sky-100 text-sky-900 hover:bg-sky-100">Curier</Badge> : null}
                            {merchantProfile?.delivery_available ? <Badge className="rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Livrare disponibilă</Badge> : null}
                            {(skillsList.length ? skillsList : ["fără competențe completate"]).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="rounded-xl">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {merchantProfile ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <p>
                            Profil comerciant: <span className="font-medium text-slate-900">{merchantName || "Profil comerciant activ"}</span>
                          </p>
                          <p className="mt-1">
                            Categorie: <span className="font-medium text-slate-900">{merchantCategoryLabel(merchantProfile.merchant_category)}</span>
                          </p>
                        </div>
                      ) : null}

                      <div className="grid gap-2 text-sm text-slate-600">
                        <p>
                          Rol principal: <span className="font-medium text-slate-900">{member.role || "member"}</span>
                        </p>
                        <p>
                          Oferă: <span className="font-medium text-slate-900">{member.offers_summary?.trim() || "necompletat"}</span>
                        </p>
                        <p>
                          Caută: <span className="font-medium text-slate-900">{member.needs_summary?.trim() || "necompletat"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
                      <Button variant="outline" className="rounded-2xl" onClick={(e) => { e.stopPropagation(); router.push(`/member/${member.id}`) }}>
                        Vezi profil
                      </Button>
                      <Button variant="outline" className="rounded-2xl" onClick={(e) => { e.stopPropagation(); handleStartChat(member.id) }}>
                        Trimite mesaj
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
