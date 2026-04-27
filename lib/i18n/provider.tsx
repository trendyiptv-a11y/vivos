"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { getDictionary, getNestedValue } from "./index"
import type { AppLanguage } from "./types"

type I18nContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("ro")

  useEffect(() => {
    const stored = window.localStorage.getItem("vivos_language") as AppLanguage | null
    if (stored === "ro" || stored === "da" || stored === "en") {
      setLanguageState(stored)
      return
    }

    const browserLanguage = navigator.language.toLowerCase()
    if (browserLanguage.startsWith("da")) {
      setLanguageState("da")
      return
    }
    if (browserLanguage.startsWith("en")) {
      setLanguageState("en")
      return
    }
    setLanguageState("ro")
  }, [])

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)
    window.localStorage.setItem("vivos_language", nextLanguage)
  }

  const value = useMemo(() => {
    const dictionary = getDictionary(language)
    return {
      language,
      setLanguage,
      t: (key: string) => getNestedValue(dictionary, key),
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider")
  }
  return context
}
