import { doc, getDoc, setDoc } from 'firebase/firestore'
import { initClientFirestore } from './firebaseClient'

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
  window.dispatchEvent(new CustomEvent("dailyMenuSaved"))
}

export async function saveDayMenuToFirestore(dayKey: string, state: DailyMenuState): Promise<void> {
  try {
    const db = initClientFirestore()
    const docRef = doc(db, "daily-menus", dayKey)
    
    // Firestore doesn't like 'undefined' values.
    // Convert undefined to null or just strip them.
    const cleanState = JSON.parse(JSON.stringify(state))
    
    await setDoc(docRef, cleanState)
  } catch (error: any) {
    console.error("Error saving to Firestore:", error)
    if (error.code === 'permission-denied') {
      throw new Error("Permission denied")
    }
    throw new Error("Cloud sync failed")
  }
}

export async function loadDayMenuFromFirestore(dayKey: string): Promise<DailyMenuState | null> {
  try {
    const db = initClientFirestore()
    const docRef = doc(db, "daily-menus", dayKey)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data() as DailyMenuState
    }
    return null
  } catch (error: any) {
    // Handle the "client is offline" error gracefully
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.warn("Firestore is offline or currently unavailable, using local cache.")
      return null
    }
    console.error("Error loading from Firestore:", error)
    return null
  }
}
