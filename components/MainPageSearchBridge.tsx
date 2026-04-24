"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

export default function MainPageSearchBridge() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname !== "/") return

    const input = document.querySelector<HTMLInputElement>('input[placeholder="Caută membri, decizii, schimburi..."]')
    if (!input) return

    input.placeholder = "Caută membri, comercianți, curieri..."

    const container = input.parentElement
    const iconButton = container?.querySelector("svg")?.parentElement as HTMLElement | null

    const submitSearch = () => {
      const trimmed = input.value.trim()
      if (!trimmed) {
        router.push("/members")
        return
      }
      router.push(`/members?query=${encodeURIComponent(trimmed)}`)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault()
        submitSearch()
      }
    }

    const handleFocus = () => {
      input.removeAttribute("readonly")
    }

    const handleClick = () => {
      submitSearch()
    }

    input.addEventListener("keydown", handleKeyDown)
    input.addEventListener("focus", handleFocus)
    iconButton?.addEventListener("click", handleClick)
    iconButton?.setAttribute("role", "button")
    iconButton?.setAttribute("aria-label", "Caută în registrul membrilor")
    iconButton && (iconButton.style.cursor = "pointer")

    return () => {
      input.removeEventListener("keydown", handleKeyDown)
      input.removeEventListener("focus", handleFocus)
      iconButton?.removeEventListener("click", handleClick)
    }
  }, [pathname, router])

  return null
}
