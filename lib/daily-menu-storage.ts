export type MealType = "breakfast" | "lunch" | "dinner"

export type DailyMenuItem = {
  id: string
  name: string
  quantity: number
  unit: string
  value: string
}

export type DailyMenuMeal = {
  calories: string
  categories: string
  maximum: string
  totalOverride: string
  items: DailyMenuItem[]
}

export type DailyMenuState = Record<MealType, DailyMenuMeal>

type StoreShape = {
  days: Record<string, DailyMenuState>
}

export const DAILY_MENU_STORAGE_KEY = "daily-menu-v1"

export function getTodayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function loadDailyMenuStore(): StoreShape {
  if (typeof window === "undefined") return { days: {} }
  try {
    const raw = localStorage.getItem(DAILY_MENU_STORAGE_KEY)
    if (!raw) return { days: {} }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return { days: {} }
    if (!parsed.days || typeof parsed.days !== "object") return { days: {} }
    return { days: parsed.days as Record<string, DailyMenuState> }
  } catch {
    return { days: {} }
  }
}

export function listSavedDays(): string[] {
  const store = loadDailyMenuStore()
  return Object.keys(store.days).sort((a, b) => (a < b ? 1 : -1))
}

export function loadDayMenu(dayKey: string): DailyMenuState | null {
  const store = loadDailyMenuStore()
  return store.days[dayKey] ?? null
}

export function saveDayMenu(dayKey: string, state: DailyMenuState): void {
  if (typeof window === "undefined") return
  const store = loadDailyMenuStore()
  store.days[dayKey] = state
  localStorage.setItem(DAILY_MENU_STORAGE_KEY, JSON.stringify(store))
}

