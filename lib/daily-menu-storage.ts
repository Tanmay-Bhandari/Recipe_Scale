import { apiUrl } from './api'

export type MealType = "breakfast" | "lunch" | "dinner"

export type DailyMenuItem = {
  id: string
  name: string
  quantity: number
  unit: string
  value: string
  adjustment?: string
  adjustmentUnit?: string
  label?: string
}

export type DailyMenuMeal = {
  calories?: number
  categories?: string
  maximum?: number
  ajeevan?: number
  chhatralaya?: number
  yuvati?: number
  vip?: number
  staff?: number
  guest?: number
  totalOverride?: number
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

export const DAILY_MENU_STORAGE_KEY = "daily-menu-v1"

export function getTodayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Fetch list of saved daily menu dates from the new API
export async function listSavedDaysApi(): Promise<string[]> {
  try {
    const res = await fetch(apiUrl('/api/daily-menus'))
    if (!res.ok) return []
    const dates = await res.json()
    return Array.isArray(dates) ? dates : []
  } catch (err) {
    console.error("Failed to load saved days from API", err)
    return []
  }
}

export async function saveDayMenuToFirestore(dayKey: string, state: DailyMenuState): Promise<void> {
  try {
    const cleanState = JSON.parse(JSON.stringify(state))
    const res = await fetch(apiUrl(`/api/daily-menus/${dayKey}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanState),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.error || "Save failed")
    }
  } catch (error: any) {
    console.error("Error saving via API:", error)
    throw new Error("Cloud sync failed")
  }
}

export async function loadDayMenuFromFirestore(dayKey: string): Promise<DailyMenuState | null> {
  try {
    const res = await fetch(apiUrl(`/api/daily-menus/${dayKey}`))
    if (res.status === 404) return null
    if (!res.ok) return null
    
    return await res.json() as DailyMenuState
  } catch (error: any) {
    console.error("Error loading via API:", error)
    return null
  }
}
