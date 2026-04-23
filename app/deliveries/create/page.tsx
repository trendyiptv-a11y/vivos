"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { vivosTheme } from "@/lib/theme/vivos-theme"

type DeliveryCategory = "document" | "small_package" | "shopping" | "market_item" | "community_help" | "other"
type DeliveryPriority = "normal" | "urgent" | "community_help"
type DeliveryRewardType = "free" | "donation" | "paid" | "barter"
type TransportMode = "walking" | "bike" | "car" | "other"

export default function CreateDeliveryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCourierMode = useMemo(() => searchParams.get("mode") === "courier", [searchParams])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<DeliveryCategory>("small_package")
  const [pickupArea, setPickupArea] = useState("")
  const [dropoffArea, setDropoffArea] = useState("")
  const [pickupNotes, setPickupNotes] = useState("")
  const [dropoffNotes, setDropoffNotes] = useState("")
  const [timeWindowStart, setTimeWindowStart] = useState("")
  const [timeWindowEnd, setTimeWindowEnd] = useState("")
  const [priority, setPriority] = useState<DeliveryPriority>("normal")
  const [rewardType, setRewardType] = useState<DeliveryRewardType>("free")
  const [rewardAmount, setRewardAmount] = useState("")

  const [displayName, setDisplayName] = useState("")
  const [transportMode, setTransportMode] = useState<TransportMode>("walking")
  const [coverageAreas, setCoverageAreas] = useState("")
  const [availabilityNotes, setAvailabilityNotes] = useState("")
  const [maxPackageSize, setMaxPackageSize] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setUserId(session.user.id)

      if (isCourierMode) {
        const { data } = await supabase
          .from("courier_profiles")
          .select("display_name, transport_mode, coverage_areas, availability_notes, max_package_size, is_active")
          .eq("user_id", session.user.id)
          .maybeSingle()

        if (data) {
          setDisplayName(data.display_name ?? "")
          setTransportMode((data.transport_mode as TransportMode) ?? "walking")
          setCoverageAreas(Array.isArray(data.coverage_areas) ? data.coverage_areas.join(", ") : "")
          setAvailabilityNotes(data.availability_notes ?? "")
          setMaxPackageSize(data.max_package_size ?? "")
          setIsActive(!!data.is_active)
        }
      }
    }

    bootstrap()
  }, [isCourierMode, router])

  async function handleCreateDelivery(event: FormEvent) {
    event.preventDefault()
    if (!userId) return

    setLoading(true)
    setMessage("")

    const { data, error } = await supabase
      .from("delivery_requests")
      .insert({
        created_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        category,
        pickup_area: pickupArea.trim(),
        dropoff_area: dropoffArea.trim(),
        pickup_notes: pickupNotes.trim() || null,
        dropoff_notes: dropoffNotes.trim() || null,
        time_window_start: timeWindowStart || null,
        time_window_end: timeWindowEnd || null,
        reward_type: rewardType,
        reward_amount: rewardAmount ? Number(rewardAmount) : null,
        priority,
      })
      .select("id, title, priority")
      .single()

    if (error || !data) {
      setMessage(error?.message || "Nu am putut crea cererea de livrare.")
      setLoading(false)
      return
    }

    await supabase.from("delivery_events").insert({
      delivery_request_id: data.id,
      actor_id: userId,
      event_type: "created",
      payload: {
        title: data.title,
        priority: data.priority,
      },
    })

    router.push(`/deliveries/${data.id}`)
  }

  async function handleSaveCourierProfile(event: FormEvent) {
    event.preventDefault()
    if (!userId) return

    setLoading(true)
    setMessage("")

    const { error } = await supabase.from("courier_profiles").upsert(
      {
        user_id: userId,
        display_name: displayName.trim() || null,
        transport_mode: transportMode,
        coverage_areas: coverageAreas
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        availability_notes: availabilityNotes.trim() || null,
        max_package_size: maxPackageSize.trim() || null,
        is_active: isActive,
      },
      { onConflict: "user_id" }
    )

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.push("/deliveries?tab=courier")
  }

  return (
    <main className="min-h-screen" style={{ background: vivosTheme.gradients.appBackground }}>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isCourierMode ? "Profil de curier" : "Cerere nouă de livrare"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message ? (
              <div className="mb-4 rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : null}

            {isCourierMode ? (
              <form className="space-y-4" onSubmit={handleSaveCourierProfile}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nume afișat</label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex. Alex Curier" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Transport</label>
                    <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={transportMode} onChange={(e) => setTransportMode(e.target.value as TransportMode)}>
                      <option value="walking">Pe jos</option>
                      <option value="bike">Bicicletă</option>
                      <option value="car">Mașină</option>
                      <option value="other">Altceva</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Zone acoperite</label>
                  <Input value={coverageAreas} onChange={(e) => setCoverageAreas(e.target.value)} placeholder="Ex. Aarhus C, Viby, Højbjerg" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Disponibilitate</label>
                  <textarea className="min-h-[110px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={availabilityNotes} onChange={(e) => setAvailabilityNotes(e.target.value)} placeholder="Ex. Seara după 17:00 și în weekend." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Mărime maximă pachet</label>
                  <Input value={maxPackageSize} onChange={(e) => setMaxPackageSize(e.target.value)} placeholder="Ex. pachet mic / 10 kg" />
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Sunt disponibil pentru livrări
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="rounded-2xl" disabled={loading}>
                    {loading ? "Se salvează..." : "Salvează profilul"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={() => router.push("/deliveries?tab=courier") }>
                    Înapoi
                  </Button>
                </div>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleCreateDelivery}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Titlu</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Transport obiect din piață" required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Descriere</label>
                  <textarea className="min-h-[110px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrie pe scurt ce se livrează și ce contează." />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Categorie</label>
                    <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value as DeliveryCategory)}>
                      <option value="document">Document</option>
                      <option value="small_package">Pachet mic</option>
                      <option value="shopping">Cumpărături</option>
                      <option value="market_item">Obiect din piață</option>
                      <option value="community_help">Ajutor comunitar</option>
                      <option value="other">Altceva</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Prioritate</label>
                    <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as DeliveryPriority)}>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="community_help">Ajutor comunitar</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Zonă ridicare</label>
                    <Input value={pickupArea} onChange={(e) => setPickupArea(e.target.value)} placeholder="Ex. Aarhus C" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Zonă predare</label>
                    <Input value={dropoffArea} onChange={(e) => setDropoffArea(e.target.value)} placeholder="Ex. Viby J" required />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Detalii ridicare</label>
                    <Input value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} placeholder="Ex. intrare principală" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Detalii predare</label>
                    <Input value={dropoffNotes} onChange={(e) => setDropoffNotes(e.target.value)} placeholder="Ex. interfon / etaj" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">De la</label>
                    <Input type="datetime-local" value={timeWindowStart} onChange={(e) => setTimeWindowStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Până la</label>
                    <Input type="datetime-local" value={timeWindowEnd} onChange={(e) => setTimeWindowEnd(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tip recompensă</label>
                    <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" value={rewardType} onChange={(e) => setRewardType(e.target.value as DeliveryRewardType)}>
                      <option value="free">Gratuit</option>
                      <option value="donation">Donație</option>
                      <option value="paid">Plătit</option>
                      <option value="barter">Barter</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Valoare</label>
                    <Input type="number" step="0.01" min="0" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} placeholder="Opțional" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="rounded-2xl" disabled={loading}>
                    {loading ? "Se creează..." : "Creează cererea"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={() => router.push("/deliveries") }>
                    Renunță
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
