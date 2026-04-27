"use client"

import { useI18n } from "@/lib/i18n/provider"
import type { AppLanguage } from "@/lib/i18n/types"

const languages: AppLanguage[] = ["ro", "da", "en"]

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-[0.16em] text-white/75 sm:inline">
        {t("language.label")}
      </span>
      <div className="flex gap-1 rounded-2xl border border-white/15 bg-white/10 p-1">
        {languages.map((item) => {
          const active = item === language
          return (
            <button
              key={item}
              type="button"
              className={`rounded-xl px-2 py-1 text-[11px] font-semibold transition sm:px-2.5 sm:text-xs ${
                active ? "bg-white text-slate-900" : "text-white/85 hover:bg-white/10"
              }`}
              onClick={() => setLanguage(item)}
              aria-label={t(`language.${item}`)}
            >
              {t(`language.${item}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
