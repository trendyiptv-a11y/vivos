"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"

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

function statusLabel(status: MarketPost["status"]) {
  if (status === "in_progress") return "În lucru"
  if (status === "closed") return "Închis"
  return "Activ"
}

function typeLabel(type: MarketPost["post_type"]) {
  return type === "offer" ? "Ofertă" : "Cerere"
}

export default function MarketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<MarketPost[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadPosts() {
      setLoading(true)
      setMessage("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("market_posts")
        .select("id, author_id, post_type, title, category, description, value_text, location, status, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        setMessage(error.message)
        setPosts([])
        setLoading(false)
        return
      }

      setPosts((data ?? []) as MarketPost[])
      setLoading(false)
    }

    loadPosts()
  }, [router])

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Piață comunitară</p>
            <h1 className="text-3xl font-semibold">Oferte și cereri reale</h1>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/")}>
              Înapoi
            </Button>
            <Button className="rounded-2xl" onClick={() => router.push("/market/new")}>
              Publică
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">Listă postări</CardTitle>
            <div className="text-sm text-slate-500">{posts.length} postări</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">
                Se încarcă postările...
              </div>
            ) : message ? (
              <div className="rounded-2xl border p-4 text-sm text-slate-600">{message}</div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border p-6">
                <h3 className="text-lg font-semibold">Încă nu există postări</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Fii primul care publică o ofertă sau o cerere în comunitate.
                </p>
                <div className="mt-4">
                  <Button className="rounded-2xl" onClick={() => router.push("/market/new")}>
                    Creează prima postare
                  </Button>
                </div>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="rounded-2xl border p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-xl">
                      {typeLabel(post.post_type)}
                    </Badge>
                    <Badge variant="outline" className="rounded-xl">
                      {post.category || "General"}
                    </Badge>
                    <Badge className="rounded-xl bg-slate-900 text-white hover:bg-slate-900">
                      {statusLabel(post.status)}
                    </Badge>
                  </div>

                  <p className="text-lg font-semibold">{post.title}</p>

                  <p className="mt-2 text-sm text-slate-600">
                    {post.description?.trim() || "Fără descriere"}
                  </p>

                  <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                    <p>Locație: {post.location?.trim() || "Necompletat"}</p>
                    <p>Valoare: {post.value_text?.trim() || "Necompletat"}</p>
                    <p>Creat la: {new Date(post.created_at).toLocaleString("ro-RO")}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
