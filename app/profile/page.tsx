"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type ProfileRow = {
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
  role: "member" | "merchant" | "courier"
  is_active: boolean
}

type MerchantProfileRow = {
  id: string
  user_id: string
  display_name: string | null
  business_name: string | null
  merchant_category: "local_shop" | "artisan" | "food" | "auto_parts" | "services" | "other"
  description: string | null
  pickup_address: string | null
  pickup_area: string | null
  phone: string | null
  email_public: string | null
  opening_hours: string | null
  delivery_available: boolean
  pickup_available: boolean
  is_active: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [alias, setAlias] = useState("")
  const [role, setRole] = useState("member")
  const [skills, setSkills] = useState("")
  const [offersSummary, setOffersSummary] = useState("")
  const [needsSummary, setNeedsSummary] = useState("")

  const [memberRoles, setMemberRoles] = useState<string[]>(["member"])
  const [merchantEnabled, setMerchantEnabled] = useState(false)
  const [courierEnabled, setCourierEnabled] = useState(false)

  const [merchantDisplayName, setMerchantDisplayName] = useState("")
  const [merchantBusinessName, setMerchantBusinessName] = useState("")
  const [merchantCategory, setMerchantCategory] = useState<MerchantProfileRow["merchant_category"]>("other")
  const [merchantDescription, setMerchantDescription] = useState("")
  const [merchantPickupAddress, setMerchantPickupAddress] = useState("")
  const [merchantPickupArea, setMerchantPickupArea] = useState("")
  const [merchantPhone, setMerchantPhone] = useState("")
  const [merchantEmailPublic, setMerchantEmailPublic] = useState("")
  const [merchantOpeningHours, setMerchantOpeningHours] = useState("")
  const [merchantDeliveryAvailable, setMerchantDeliveryAvailable] = useState(false)
  const [merchantPickupAvailable, setMerchantPickupAvailable] = useState(true)
  const [merchantActive, setMerchantActive] = useState(true)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")

  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setUserId(session.user.id)
      setEmail(session.user.email ?? "")

      const [profileResult, rolesResult, merchantResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, name, alias, role, skills, offers_summary, needs_summary")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("member_roles")
          .select("role, is_active")
          .eq("user_id", session.user.id),
        supabase
          .from("merchant_profiles")
          .select("id, user_id, display_name, business_name, merchant_category, description, pickup_address, pickup_area, phone, email_public, opening_hours, delivery_available, pickup_available, is_active")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ])

      if (profileResult.error) {
        setMessage(profileResult.error.message)
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

      const profile = profileResult.data as ProfileRow | null
      const roles = (rolesResult.data ?? []) as MemberRoleRow[]
      const merchantProfile = merchantResult.data as MerchantProfileRow | null

      if (profile) {
        setName(profile.name ?? "")
        setAlias(profile.alias ?? "")
        setRole(profile.role ?? "member")
        setSkills(profile.skills ?? "")
        setOffersSummary(profile.offers_summary ?? "")
        setNeedsSummary(profile.needs_summary ?? "")
      }

      const activeRoles = roles.filter((item) => item.is_active).map((item) => item.role)
      setMemberRoles(activeRoles.length ? activeRoles : ["member"])
      setMerchantEnabled(activeRoles.includes("merchant"))
      setCourierEnabled(activeRoles.includes("courier"))

      if (merchantProfile) {
        setMerchantDisplayName(merchantProfile.display_name ?? "")
        setMerchantBusinessName(merchantProfile.business_name ?? "")
        setMerchantCategory(merchantProfile.merchant_category ?? "other")
        setMerchantDescription(merchantProfile.description ?? "")
        setMerchantPickupAddress(merchantProfile.pickup_address ?? "")
        setMerchantPickupArea(merchantProfile.pickup_area ?? "")
        setMerchantPhone(merchantProfile.phone ?? "")
        setMerchantEmailPublic(merchantProfile.email_public ?? "")
        setMerchantOpeningHours(merchantProfile.opening_hours ?? "")
        setMerchantDeliveryAvailable(merchantProfile.delivery_available ?? false)
        setMerchantPickupAvailable(merchantProfile.pickup_available ?? true)
        setMerchantActive(merchantProfile.is_active ?? true)
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!userId) return

    setSaving(true)
    setMessage("")

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      name,
      alias,
      role,
      skills,
      offers_summary: offersSummary,
      needs_summary: needsSummary,
    })

    if (profileError) {
      setMessage(profileError.message)
      setSaving(false)
      return
    }

    const roleUpserts = [
      { user_id: userId, role: "member", is_active: true },
      { user_id: userId, role: "merchant", is_active: merchantEnabled },
      { user_id: userId, role: "courier", is_active: courierEnabled },
    ]

    const { error: rolesError } = await supabase.from("member_roles").upsert(roleUpserts, {
      onConflict: "user_id,role",
    })

    if (rolesError) {
      setMessage(rolesError.message)
      setSaving(false)
      return
    }

    if (merchantEnabled) {
      const { error: merchantError } = await supabase.from("merchant_profiles").upsert(
        {
          user_id: userId,
          display_name: merchantDisplayName || null,
          business_name: merchantBusinessName || null,
          merchant_category: merchantCategory,
          description: merchantDescription || null,
          pickup_address: merchantPickupAddress || null,
          pickup_area: merchantPickupArea || null,
          phone: merchantPhone || null,
          email_public: merchantEmailPublic || null,
          opening_hours: merchantOpeningHours || null,
          delivery_available: merchantDeliveryAvailable,
          pickup_available: merchantPickupAvailable,
          is_active: merchantActive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

      if (merchantError) {
        setMessage(merchantError.message)
        setSaving(false)
        return
      }
    }

    const refreshedRoles = [
      "member",
      ...(merchantEnabled ? ["merchant"] : []),
      ...(courierEnabled ? ["courier"] : []),
    ]
    setMemberRoles(refreshedRoles)
    setMessage("Profilul și rolurile au fost salvate.")
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMessage("")

    if (password.length < 6) {
      setPasswordMessage("Parola trebuie să aibă cel puțin 6 caractere.")
      return
    }

    if (password !== confirmPassword) {
      setPasswordMessage("Parolele nu coincid.")
      return
    }

    setPasswordSaving(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setPasswordMessage(error.message)
      setPasswordSaving(false)
      return
    }

    setPassword("")
    setConfirmPassword("")
    setPasswordMessage("Parola a fost schimbată cu succes.")
    setPasswordSaving(false)
  }

  async function handleDeleteAccount() {
    setDeleteMessage("")

    const confirmed = window.confirm(
      "Sigur vrei să-ți ștergi contul? Acțiunea este permanentă și îți va elimina profilul, mesajele și datele asociate."
    )

    if (!confirmed) return

    const confirmedAgain = window.confirm(
      "Confirmi definitiv ștergerea contului tău VIVOS?"
    )

    if (!confirmedAgain) return

    try {
      setDeletingAccount(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setDeleteMessage("Sesiunea nu este validă. Reautentifică-te.")
        setDeletingAccount(false)
        return
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setDeleteMessage(result?.error || "Contul nu a putut fi șters.")
        setDeletingAccount(false)
        return
      }

      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (error: any) {
      console.error("Delete account error:", error)
      setDeleteMessage(error?.message || "Contul nu a putut fi șters.")
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-6"
        style={{ background: vivosTheme.gradients.appBackground }}
      >
        <Card className="w-full max-w-2xl rounded-3xl border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Se încarcă profilul...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: vivosTheme.gradients.appBackground }}
    >
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-xl"
        style={{
          background: vivosTheme.styles.bottomNav.background,
          borderColor: vivosTheme.styles.bottomNav.borderColor,
          boxShadow: "0 8px 24px rgba(8, 20, 40, 0.16)",
        }}
      >
        <div className="mx-auto flex min-h-[84px] max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase tracking-[0.22em] sm:text-xs"
              style={{ color: "rgba(255,255,255,0.68)" }}
            >
              Membru autentificat
            </p>
            <h1
              className="truncate text-lg font-semibold sm:text-2xl"
              style={{ color: vivosTheme.colors.white }}
            >
              Profil VIVOS
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

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-4 sm:px-6 sm:py-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Actualizează profilul</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {memberRoles.map((item) => (
                  <Badge key={item} variant="outline" className="rounded-xl">
                    {item === "member" ? "Membru" : item === "merchant" ? "Comerciant" : "Curier"}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={email} readOnly className="rounded-2xl bg-slate-100" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol principal</label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="rounded-2xl"
                    placeholder="member"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nume</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Numele tău"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Alias</label>
                  <Input
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Alias comunitar"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Competențe</label>
                <textarea
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="ex: electrician, logistică, design, traduceri"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ce oferi</label>
                <textarea
                  value={offersSummary}
                  onChange={(e) => setOffersSummary(e.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Servicii, bunuri, timp, ajutor pe care îl poți oferi"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ce cauți</label>
                <textarea
                  value={needsSummary}
                  onChange={(e) => setNeedsSummary(e.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder="Sprijin, colaborări, resurse, nevoi curente"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <p className="text-base font-semibold text-slate-900">Roluri comunitare</p>
                <p className="mt-1 text-sm text-slate-600">
                  Activează capabilitățile suplimentare pe același cont VIVOS.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-2xl border p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={merchantEnabled}
                      onChange={(e) => setMerchantEnabled(e.target.checked)}
                    />
                    <div>
                      <p className="font-medium text-slate-900">Comerciant</p>
                      <p className="text-sm text-slate-600">Poți avea profil comercial, prezență în Market și comenzi cu livrare.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={courierEnabled}
                      onChange={(e) => setCourierEnabled(e.target.checked)}
                    />
                    <div>
                      <p className="font-medium text-slate-900">Curier</p>
                      <p className="text-sm text-slate-600">Poți accepta livrări și apărea ca membru disponibil pentru transport local.</p>
                    </div>
                  </label>
                </div>
              </div>

              {merchantEnabled ? (
                <div className="rounded-2xl border p-4">
                  <div className="mb-4">
                    <p className="text-base font-semibold text-slate-900">Profil comerciant</p>
                    <p className="mt-1 text-sm text-slate-600">Aceste date vor fi baza pentru profilul tău Merchant în comunitate.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nume afișat</label>
                      <Input value={merchantDisplayName} onChange={(e) => setMerchantDisplayName(e.target.value)} className="rounded-2xl" placeholder="ex: AutoRapid Aarhus" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nume comercial</label>
                      <Input value={merchantBusinessName} onChange={(e) => setMerchantBusinessName(e.target.value)} className="rounded-2xl" placeholder="Numele firmei sau atelierului" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categorie</label>
                      <select className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={merchantCategory} onChange={(e) => setMerchantCategory(e.target.value as MerchantProfileRow["merchant_category"])}>
                        <option value="local_shop">Magazin local</option>
                        <option value="artisan">Artizan</option>
                        <option value="food">Food</option>
                        <option value="auto_parts">Piese auto</option>
                        <option value="services">Servicii</option>
                        <option value="other">Altceva</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Zonă de pickup</label>
                      <Input value={merchantPickupArea} onChange={(e) => setMerchantPickupArea(e.target.value)} className="rounded-2xl" placeholder="ex: Aarhus C" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">Descriere</label>
                    <textarea
                      value={merchantDescription}
                      onChange={(e) => setMerchantDescription(e.target.value)}
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      placeholder="Ce vinzi sau ce tip de activitate ai"
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">Adresă pickup</label>
                    <Input value={merchantPickupAddress} onChange={(e) => setMerchantPickupAddress(e.target.value)} className="rounded-2xl" placeholder="Adresă completă sau punct de ridicare" />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Telefon</label>
                      <Input value={merchantPhone} onChange={(e) => setMerchantPhone(e.target.value)} className="rounded-2xl" placeholder="Telefon contact" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email public</label>
                      <Input value={merchantEmailPublic} onChange={(e) => setMerchantEmailPublic(e.target.value)} className="rounded-2xl" placeholder="Email vizibil public" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">Program</label>
                    <Input value={merchantOpeningHours} onChange={(e) => setMerchantOpeningHours(e.target.value)} className="rounded-2xl" placeholder="ex: L-V 09:00-17:00" />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="flex items-center gap-3 rounded-2xl border p-3">
                      <input type="checkbox" checked={merchantDeliveryAvailable} onChange={(e) => setMerchantDeliveryAvailable(e.target.checked)} />
                      <span className="text-sm text-slate-700">Livrare disponibilă</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border p-3">
                      <input type="checkbox" checked={merchantPickupAvailable} onChange={(e) => setMerchantPickupAvailable(e.target.checked)} />
                      <span className="text-sm text-slate-700">Ridicare disponibilă</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border p-3">
                      <input type="checkbox" checked={merchantActive} onChange={(e) => setMerchantActive(e.target.checked)} />
                      <span className="text-sm text-slate-700">Profil activ</span>
                    </label>
                  </div>
                </div>
              ) : null}

              {message && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="rounded-2xl" disabled={saving}>
                  {saving ? "Se salvează..." : "Salvează profilul"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => router.push("/")}
                >
                  Anulează
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Schimbă parola</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parolă nouă</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Introdu parola nouă"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmă parola</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-2xl"
                    placeholder="Reintrodu parola"
                    required
                  />
                </div>
              </div>

              {passwordMessage && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  {passwordMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="rounded-2xl" disabled={passwordSaving}>
                  {passwordSaving ? "Se actualizează..." : "Actualizează parola"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-red-200 bg-red-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-red-700">Ștergere cont</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-700">
              Această acțiune este permanentă. Contul tău, profilul și datele asociate vor fi
              șterse definitiv din platformă.
            </p>

            {deleteMessage && (
              <div className="rounded-2xl border border-red-200 bg-white p-3 text-sm text-red-700">
                {deleteMessage}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-red-300 text-red-700 hover:bg-red-100"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? "Se șterge contul..." : "Șterge contul meu"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
