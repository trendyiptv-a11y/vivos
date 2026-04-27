import { da } from "./messages/da"
import { en } from "./messages/en"
import { ro } from "./messages/ro"
import type { AppLanguage } from "./types"

export const dictionaries = { ro, da, en }

export function getDictionary(language: AppLanguage) {
  return dictionaries[language] || dictionaries.ro
}

export function getNestedValue(source: unknown, path: string): string {
  const result = path.split(".").reduce<any>((acc, key) => acc?.[key], source)
  return typeof result === "string" ? result : path
}
