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
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || data?.details || "Failed to list available dates")
    }
    const dates = await res.json()
    return Array.isArray(dates) ? dates : []
  } catch (err: any) {
    console.error("Failed to load saved days from API:", err)
    throw err
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
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || data?.details || `Failed to load menu for ${dayKey}`)
    }
    
    const data = await res.json() as DailyMenuState
    
    // DATA MIGRATION & NORMALIZATION
    if (data) {
      if (!data.meals) data.meals = {} as any
      
      const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"]
      mealTypes.forEach(mt => {
        if (!data.meals[mt]) {
          data.meals[mt] = { items: [] } as DailyMenuMeal
        }
        
        const meal = data.meals[mt]
        
        // Ensure all numeric fields are actually parsed as numbers
        const toNum = (val: any) => {
          if (typeof val === 'number') return val
          if (typeof val === 'string') return parseInt(val, 10) || 0
          return 0
        }

        // Map old calories -> vip
        if (meal.vip === undefined && (meal as any).calories !== undefined) {
          meal.vip = toNum((meal as any).calories)
        }
        // Map old categories -> staff (if numeric)
        if (meal.staff === undefined && (meal as any).categories !== undefined) {
          const cat = (meal as any).categories
          if (!isNaN(parseInt(cat, 10))) {
            meal.staff = toNum(cat)
          }
        }
        // Map old maximum -> guest
        if (meal.guest === undefined && (meal as any).maximum !== undefined) {
          meal.guest = toNum((meal as any).maximum)
        }

        // Normalize all metrics to number (or 0)
        meal.ajeevan = toNum(meal.ajeevan)
        meal.chhatralaya = toNum(meal.chhatralaya)
        meal.yuvati = toNum(meal.yuvati)
        meal.vip = toNum(meal.vip)
        meal.staff = toNum(meal.staff)
        meal.guest = toNum(meal.guest)
        meal.totalOverride = toNum(meal.totalOverride)
        if (!meal.items) meal.items = []
      })
    }

    return data
  } catch (error: any) {
    console.error("Error loading via API:", error)
    throw error
  }
}
