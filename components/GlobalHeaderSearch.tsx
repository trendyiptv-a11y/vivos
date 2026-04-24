"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function GlobalHeaderSearch() {
  const router = useRouter()
  const [value, setValue] = useState("")

  function submitSearch() {
    const trimmed = value.trim()
    if (!trimmed) {
      router.push("/members")
      return
    }

    router.push(`/members?query=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="hidden items-center gap-2 rounded-2xl border px-3 py-2 md:flex"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <button
        type="button"
        onClick={submitSearch}
        className="flex items-center justify-center"
        aria-label="Caută în registrul membrilor"
      >
        <Search className="h-4 w-4" style={{ color: "rgba(255,255,255,0.68)" }} />
      </button>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            submitSearch()
          }
        }}
        className="h-auto w-48 border-0 bg-transparent p-0 text-white placeholder:text-white/45 shadow-none focus-visible:ring-0"
        placeholder="Caută membri, comercianți, curieri..."
      />
    </div>
  )
}
