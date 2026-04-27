import type { AppLanguage } from "./types"

export type TranslateFn = (key: string) => string

export type MemberRole = "member" | "merchant" | "courier"
export type MerchantCategory = "local_shop" | "artisan" | "food" | "auto_parts" | "services" | "other"
export type HomeTabId =
  | "dashboard"
  | "members"
  | "messages"
  | "market"
  | "about"
  | "wallet"
  | "fund"
  | "archive"
  | "governance"
  | "settings"

export function getRoleLabel(role: MemberRole, t: TranslateFn) {
  return t(`roles.${role}`)
}

export function getMerchantCategoryLabel(category: MerchantCategory, t: TranslateFn) {
  return t(`merchantCategories.${category}`)
}

export function getHomeTabLabel(tabId: HomeTabId, t: TranslateFn) {
  return t(`nav.${tabId}`)
}

export function getLanguageShortLabel(language: AppLanguage, t: TranslateFn) {
  return t(`language.${language}`)
}
