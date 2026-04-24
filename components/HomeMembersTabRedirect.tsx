"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function HomeMembersTabRedirect() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const tab = searchParams.get("tab")

    if (pathname === "/" && tab === "members") {
      router.replace("/members")
    }
  }, [pathname, router, searchParams])

  return null
}
