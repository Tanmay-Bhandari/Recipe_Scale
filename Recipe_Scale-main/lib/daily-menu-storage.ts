export type MealType = "breakfast" | "lunch" | "dinner"

export type DailyMenuItem = {
  id: string
  name: string
  quantity: number
  unit: string
  value: string
  note?: string
  itemName?: string
}

export type DailyMenuMeal = {
  calories: string
  categories: string
  maximum: string
  totalOverride: string
  items: DailyMenuItem[]
}

export type DailyMenuState = {
  meals: Record<MealType, DailyMenuMeal>
  dayOfWeek?: string
  tithiMonth?: string
  tithiPhase?: string
  tithiDay?: string
  tithi?: string
}

type StoreShape = {
  days: Record<string, DailyMenuState>
}

export const DAILY_MENU_STORAGE_KEY = "daily-menu-v1"

import { saveDailyMenuToFirestore, fetchDayMenuFromServer } from "./firebaseClient"

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
  const local = store.days[dayKey] ?? null

  // Fire-and-forget: try to fetch authoritative copy from server and update localStorage/UI
  if (typeof window !== 'undefined') {
    ;(async () => {
      try {
        // signal fetch start so UI can show a loading indicator
        try { window.dispatchEvent(new Event('dailyMenuFetchStart')) } catch (e) {}

        const server = await fetchDayMenuFromServer(dayKey)
        if (server) {
          const cur = loadDailyMenuStore()
          const prev = cur.days[dayKey] ?? null
          const prevStr = prev ? JSON.stringify(prev) : null
          const serverStr = JSON.stringify(server)
          let updated = false
          if (prevStr !== serverStr) {
            cur.days[dayKey] = server
            try {
              localStorage.setItem(DAILY_MENU_STORAGE_KEY, JSON.stringify(cur))
              // notify listeners (UI) that a menu was (re)loaded/saved only if it changed
              try { window.dispatchEvent(new Event('dailyMenuSaved')) } catch (e) {}
              updated = true
            } catch (e) {
              // ignore localStorage failures
            }
          }
          try {
            window.dispatchEvent(new CustomEvent('dailyMenuFetchComplete', { detail: { dayKey, updated } }))
          } catch (e) {}
        } else {
          try {
            window.dispatchEvent(new CustomEvent('dailyMenuFetchComplete', { detail: { dayKey, updated: false } }))
          } catch (e) {}
        }
      } catch (e) {
        // ignore fetch errors but still notify completion
        try { window.dispatchEvent(new CustomEvent('dailyMenuFetchComplete', { detail: { dayKey, updated: false } })) } catch (e) {}
      }
    })()
  }

  return local
}

export function saveDayMenu(dayKey: string, state: DailyMenuState): void {
  if (typeof window === "undefined") return
  const store = loadDailyMenuStore()
  store.days[dayKey] = state
  localStorage.setItem(DAILY_MENU_STORAGE_KEY, JSON.stringify(store))
  // NOTE: do not emit a global `dailyMenuSaved` event here to avoid
  // triggering refresh loops. Callers that need to notify the UI should
  // dispatch the event explicitly after calling `saveDayMenu`.
  // Also attempt to persist to Firestore (fire-and-forget).
  ;(async () => {
    try {
      const deviceId = ((): string | null => {
        try {
          if (typeof window === 'undefined') return null
          return window.localStorage.getItem('deviceId')
        } catch (e) {
          return null
        }
      })()

        // Persist to server API which writes to daily_menus/{dayKey}
        await saveDailyMenuToFirestore(dayKey, state)
    } catch (e) {
      // ignore errors; localStorage is primary
    }
  })()
}

