"use client"

import { CalendarDays, Trash2, Plus, ChevronUp, ChevronDown, Info } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea"
import { RecipeSuggestionInput } from "@/components/recipe-suggestion-input"
import { Label } from "@/components/ui/label"
import { COMMON_SUGGESTIONS } from "@/lib/suggestions"
import type { Recipe } from "@/lib/types"
import {
  getTodayKey,
  listSavedDaysApi,
  saveDayMenuToFirestore,
  loadDayMenuFromFirestore,
  type DailyMenuItem,
  type DailyMenuMeal,
  type MealType,
  type DailyMenuState,
} from "@/lib/daily-menu-storage"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DAYS_OF_WEEK = [
  "સોમવાર",
  "મંગળવાર",
  "બુધવાર",
  "ગુરુવાર",
  "શુક્રવાર",
  "શનિવાર",
  "રવિવાર",
]

const TITHI_MONTHS = [
  "કારતક",
  "માગશર",
  "પોષ",
  "મહા",
  "ફાગણ",
  "ચૈત્ર",
  "વૈશાખ",
  "જેઠ",
  "અષાઢ",
  "શ્રાવણ",
  "ભાદરવો",
  "આસો",
]

const TITHI_PHASES = ["સુદ", "વદ"]

const TITHI_DAYS = [
  "પડવો",
  "બીજ",
  "ત્રીજ",
  "ચોથ",
  "પાંચમ",
  "છઠ",
  "સાતમ",
  "આઠમ",
  "નોમ",
  "દશમ",
  "એકાદશી",
  "બારસ",
  "તેરસ",
  "ચૌદસ",
  "પૂર્ણિમા",
  "અમાસ",
]

interface DailyMenuProps {
  recipes: Recipe[]
}

export function DailyMenu({ recipes }: DailyMenuProps) {
  const [selectedDay, setSelectedDay] = useState<string>(getTodayKey())
  const [savedDays, setSavedDays] = useState<string[]>([])
  const [editingDay, setEditingDay] = useState<string>("")
  const [dayOfWeek, setDayOfWeek] = useState("")
  const [tithiMonth, setTithiMonth] = useState("")
  const [tithiPhase, setTithiPhase] = useState("")
  const [tithiDay, setTithiDay] = useState("")
  const [saveNotice, setSaveNotice] = useState<string>("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const saveNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const emptyItem = (label?: string): DailyMenuItem => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "",
    label: label || "",
    quantity: 0,
    unit: "kg",
    value: "",
    adjustment: "",
  })

  // Combine Firestore recipes with predefined common names
  const allSuggestions = useMemo(() => {
    const fromRecipes = recipes.map(r => ({ name: r.name }))
    const fromCommon = COMMON_SUGGESTIONS.map(name => ({ name }))

    // Also include ingredients from all recipes
    const fromIngredients: Array<{ name: string }> = []
    recipes.forEach(r => {
      r.ingredients.forEach(ing => {
        if (ing.name) fromIngredients.push({ name: ing.name })
      })
    })

    // Combined list: Dish Names + Common Suggestions + Ingredient Names
    const combined = [...fromRecipes, ...fromCommon, ...fromIngredients]

    // Sort and remove duplicates
    const unique = Array.from(new Map(combined.map(item => [item.name, item])).values())
    return unique.sort((a, b) => a.name.localeCompare(b.name, 'gu'))
  }, [recipes])

  const namedItem = (label: string): DailyMenuItem => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: label,
    name: "",
    quantity: 0,
    unit: "kg",
    value: "",
    adjustment: "",
    adjustmentUnit: "",
  })

  const LUNCH_DEFAULT_ITEMS = [
    "ઠાકોરજી મિષ્ટાન્ન - ૧",
    "ઠાકોરજી ફરસાણ - ૧",
    "ઠાકોરજી રોટલી",
    "ઠાકોરજી શાક - ૧",
    "ઠાકોરજી શાક - ૨",
    "ઠાકોરજી શાક - ૩",
    "ઠાકોરજી શાક - ૪",
    "ઠાકોરજી કઠોળ",
    "ઠાકોરજી ભાત",
    "ઠાકોરજી દાળ",
    "ઠાકોરજી સલાડ",
    "જેનરલ મિષ્ટાન્ન",
    "જેનરલ ફરસાણ",
    "જેનરલ રોટલી",
    "જેનરલ શાક - ૧",
    "જેનરલ શાક - ૨",
    "જેનરલ ભાત",
    "જેનરલ દાળ",
    "જેનરલ સલાડ",
    "જેનરલ પાપડ/પાપડી",
    "જેનરલ છાશ",
  ]

  const BREAKFAST_DEFAULT_ITEMS = [
    "ઠાકોરજી નાસ્તો - ૧",
    "ઠાકોરજી નાસ્તો - ૨",
    "ઠાકોરજી નાસ્તો - ૩",
    "ઠાકોરજી નાસ્તો - ૪",
    "ઠાકોરજી સૂપ",
    "જેનરલ નાસ્તો - ૧",
    "જેનરલ નાસ્તો - ૨",
    "જેનરલ નાસ્તો - ૩",
    "જેનરલ બેકરી - ૧",
    "જેનરલ સૂકો નાસ્તો - ૧",
    "ચા",
    "ઉકાળો",
  ]

  const DINNER_DEFAULT_ITEMS = [
    "ઠાકોરજી વિશેષ વાનગી",
    "ઠાકોરજી થેપલા/પરોઠા",
    "ઠાકોરજી ભાખરી",
    "ઠાકોરજી રોટલી",
    "ઠાકોરજી શાક - ૧",
    "ઠાકોરજી શાક - ૨",
    "ઠાકોરજી શાક - ૩",
    "ઠાકોરજી શાક - ૪",
    "ઠાકોરજી ખીચડી",
    "ઠાકોરજી કઢી",
    "જેનરલ વિશેષ વાનગી",
    "જેનરલ ભાખરી/થેપલા",
    "જેનરલ શાક - ૧",
    "જેનરલ ખીચડી",
    "જેનરલ દાળ/કઢી",
    "જેનરલ પાપડ/પાપડી",
    "જેનરલ છાશ",
  ]

  const [meals, setMeals] = useState<Record<MealType, DailyMenuMeal>>({
    breakfast: {
      vip: 0,
      staff: 0,
      guest: 0,
      ajeevan: 0,
      chhatralaya: 0,
      yuvati: 0,
      totalOverride: 0,
      items: BREAKFAST_DEFAULT_ITEMS.map((name) => namedItem(name)),
    },
    lunch: {
      vip: 0,
      staff: 0,
      guest: 0,
      ajeevan: 0,
      chhatralaya: 0,
      yuvati: 0,
      totalOverride: 0,
      items: LUNCH_DEFAULT_ITEMS.map((name) => namedItem(name)),
    },
    dinner: {
      vip: 0,
      staff: 0,
      guest: 0,
      ajeevan: 0,
      chhatralaya: 0,
      yuvati: 0,
      totalOverride: 0,
      items: DINNER_DEFAULT_ITEMS.map((name) => namedItem(name)),
    },
  })

  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast")

  const loadData = useCallback(async (day: string) => {
    // Use helper to apply state safely
    const applyMenuState = (current: DailyMenuState | null) => {
      if (current) {
        const migratedMeals = { ...current.meals }
        const migrateItems = (items: DailyMenuItem[]) =>
          items.map(it => {
            if (!it.label && it.name) {
              return { ...it, label: it.name, name: "" }
            }
            return it
          })

        migratedMeals.lunch = { ...migratedMeals.lunch, items: migrateItems(migratedMeals.lunch.items) }
        migratedMeals.dinner = { ...migratedMeals.dinner, items: migrateItems(migratedMeals.dinner.items) }

        setMeals(migratedMeals)
        setDayOfWeek(current.dayOfWeek ?? "")
        setTithiMonth(current.tithiMonth ?? "")
        setTithiPhase(current.tithiPhase ?? "")
        setTithiDay(current.tithiDay ?? "")
        setEditingDay(day)
      } else {
        setMeals({
          breakfast: { vip: 0, staff: 0, guest: 0, ajeevan: 0, chhatralaya: 0, yuvati: 0, totalOverride: 0, items: BREAKFAST_DEFAULT_ITEMS.map((name) => namedItem(name)) },
          lunch: { vip: 0, staff: 0, guest: 0, ajeevan: 0, chhatralaya: 0, yuvati: 0, totalOverride: 0, items: LUNCH_DEFAULT_ITEMS.map((name) => namedItem(name)) },
          dinner: { vip: 0, staff: 0, guest: 0, ajeevan: 0, chhatralaya: 0, yuvati: 0, totalOverride: 0, items: DINNER_DEFAULT_ITEMS.map((name) => namedItem(name)) },
        })
        setDayOfWeek("")
        setTithiMonth("")
        setTithiPhase("")
        setTithiDay("")
        setEditingDay(day)
      }
    }

    // Fetch from API for cloud source of truth
    setErrorMsg(null)
    try {
      const cloud = await loadDayMenuFromFirestore(day)
      if (cloud) {
        applyMenuState(cloud)
      } else {
        applyMenuState(null)
      }
    } catch (err: any) {
      console.error("Error loading daily menu from server:", err)
      setErrorMsg(err.message || "Cloud sync error")
    }
  }, [BREAKFAST_DEFAULT_ITEMS, LUNCH_DEFAULT_ITEMS, DINNER_DEFAULT_ITEMS])

  useEffect(() => {
    const fetchDays = async () => {
      try {
        const days = await listSavedDaysApi()
        setSavedDays(days)
      } catch (err) {
        console.error("Failed to load saved days list", err)
      }
    }
    fetchDays()

    void loadData(selectedDay)
  }, [selectedDay, loadData])

  // Auto-calculate Day of Week when date changes
  useEffect(() => {
    if (!selectedDay) return
    const date = new Date(selectedDay)
    if (isNaN(date.getTime())) return

    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    // Our DAYS_OF_WEEK: 0-Som, 1-Mangal, 2-Budh, 3-Guru, 4-Shukra, 5-Shani, 6-Ravi
    // Date.getDay(): 0-Ravi, 1-Som, 2-Mangal, 3-Budh, 4-Guru, 5-Shukra, 6-Shani
    const dayIndex = date.getDay()
    const gujaratiDayMap = ["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"]
    const newDay = gujaratiDayMap[dayIndex]

    setDayOfWeek(newDay)
  }, [selectedDay])

  useEffect(() => {
    // Ensure all unit selectors start with kg for existing/default rows.
    setMeals((prev) => ({
      breakfast: {
        ...prev.breakfast,
        items: prev.breakfast.items.map((it) => ({ ...it, unit: it.unit || "kg" })),
      },
      lunch: {
        ...prev.lunch,
        items: prev.lunch.items.map((it) => ({ ...it, unit: it.unit || "kg" })),
      },
      dinner: {
        ...prev.dinner,
        items: prev.dinner.items.map((it) => ({ ...it, unit: it.unit || "kg" })),
      },
    }))
  }, [])

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current) clearTimeout(saveNoticeTimerRef.current)
    }
  }, [])

  const MEAL_TITLES: Record<MealType, string> = {
    breakfast: "નાસ્તો",
    lunch: "બપોરે ભોજન",
    dinner: "રાત્રી ભોજન",
  }

  const UNIT_OPTIONS = useMemo(() => ["kg", "g", "L", "ml", "pieces"], [])

  const totalItemsCount = useMemo(() => {
    const all = Object.values(meals).flatMap((m) => m.items)
    return all.length
  }, [meals])

  function updateMeal(mealType: MealType, patch: Partial<DailyMenuMeal>) {
    setMeals((prev) => ({ ...prev, [mealType]: { ...prev[mealType], ...patch } }))
  }

  function updateMetricField(
    mealType: MealType,
    field: keyof DailyMenuMeal,
    value: string
  ) {
    setMeals((prev) => {
      const nextMeal = { ...prev[mealType] }
      const numValue = parseInt(value, 10) || 0
      
      if (field !== 'items' && field !== 'categories') {
        (nextMeal as any)[field] = numValue
      } else if (field === 'categories') {
        nextMeal[field] = value
      }

      // ONLY calculate totalOverride automatically if we are NOT manually setting it
      if (field !== 'totalOverride') {
        const vip = Number(nextMeal.vip) || 0
        const staff = Number(nextMeal.staff) || 0
        const guest = Number(nextMeal.guest) || 0
        const aaj = Number(nextMeal.ajeevan) || 0
        const chhat = Number(nextMeal.chhatralaya) || 0
        const yuvati = Number(nextMeal.yuvati) || 0
        nextMeal.totalOverride = vip + staff + guest + aaj + chhat + yuvati
      }

      return {
        ...prev,
        [mealType]: nextMeal,
      }
    })
  }

  function updateItem(mealType: MealType, itemId: string, patch: Partial<DailyMenuItem>) {
    setMeals((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: prev[mealType].items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      },
    }))
  }

  function removeItem(mealType: MealType, itemId: string) {
    if (!confirm("શું તમે આ વસ્તુ ડીલીટ કરવા માંગો છો?")) return
    setMeals((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: prev[mealType].items.filter((it) => it.id !== itemId),
      },
    }))
  }

  function addItem(mealType: MealType, afterId?: string, itemToClone?: DailyMenuItem, defaultLabel?: string) {
    setMeals((prev) => {
      const currentItems = [...prev[mealType].items]
      let newItem: DailyMenuItem

      if (itemToClone) {
        // Clone the item but give it a fresh ID
        newItem = {
          ...itemToClone,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        }
      } else {
        const nextNum = currentItems.length + 1
        const label = defaultLabel || `${MEAL_TITLES[mealType]} - ${nextNum}`
        newItem = emptyItem(label)
      }

      if (afterId) {
        const index = currentItems.findIndex(it => it.id === afterId)
        if (index !== -1) {
          currentItems.splice(index + 1, 0, newItem)
        } else {
          currentItems.push(newItem)
        }
      } else {
        currentItems.push(newItem)
      }
      return {
        ...prev,
        [mealType]: { ...prev[mealType], items: currentItems },
      }
    })
  }

  async function saveDay() {
    const day = selectedDay.trim()
    if (!day) return

    // Combine for backward compatibility or simple display
    const fullTithi = [tithiMonth, tithiPhase, tithiDay].filter(Boolean).join(" ")
    const menuState: DailyMenuState = {
      meals,
      dayOfWeek,
      tithiMonth,
      tithiPhase,
      tithiDay,
      tithi: fullTithi,
    }

    // 1. Sync to API
    setIsSyncing(true)
    try {
      await saveDayMenuToFirestore(day, menuState)
      setSaveNotice("સેવ સફળ! ✅")
      // Update saved days list locally
      setSavedDays((prev) => (prev.includes(day) ? prev : [day, ...prev]))
      setEditingDay(day)
    } catch (err: any) {
      console.error("Server sync failed:", err)
      setSaveNotice(`⚠️ સેવ કરવામાં નિષ્ફળ`)
    } finally {
      setIsSyncing(false)
      if (saveNoticeTimerRef.current) clearTimeout(saveNoticeTimerRef.current)
      saveNoticeTimerRef.current = setTimeout(() => setSaveNotice(""), 5000)
    }
  }

  function editDay(day: string) {
    setSelectedDay(day)
    setEditingDay(day)
  }

  const draggablePayload = useRef<{ mealType: MealType; itemId: string } | null>(null)

  function onDragStart(mealType: MealType, itemId: string, e: DragEvent) {
    draggablePayload.current = { mealType, itemId }
    e.dataTransfer.effectAllowed = "move"
  }

  function onDrop(mealType: MealType, targetItemId: string, e: DragEvent) {
    e.preventDefault()
    const payload = draggablePayload.current
    if (!payload || payload.mealType !== mealType) return

    setMeals((prev) => {
      const list = prev[mealType].items
      const fromIndex = list.findIndex((it) => it.id === payload.itemId)
      const toIndex = list.findIndex((it) => it.id === targetItemId)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev
      const next = [...list]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return { ...prev, [mealType]: { ...prev[mealType], items: next } }
    })
    draggablePayload.current = null
  }

  return (
    <div className="space-y-6">
      {/* Top admin card */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-lg text-foreground md:text-xl">
              સુપર એડમિન — દૈનિક મેનુ ઉમેરો/એડિટ કરો
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              દિવસ પસંદ કરો, નાસ્તો/બપોરે ભોજન/રાત્રી ભોજન માટે આઇટમ ઉમેરો અને સેવ કરો.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end">
            {/* <CalendarDays className="h-4 w-4 text-primary" /> */}

          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {/* Day picker */}
          <div className="rounded-xl border border-border bg-background/50 p-4 lg:col-span-1">
            <Label className="mb-1.5 block text-sm font-medium text-foreground">
              દિવસ પસંદ કરો
            </Label>
            <Input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-4 lg:col-span-1">
            <Label className="mb-1.5 block text-sm font-medium text-foreground">
              વાર
            </Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="વાર પસંદ કરો..." />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-4 lg:col-span-2">
            <Label className="mb-1.5 block text-sm font-medium text-foreground">
              તિથિ
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={tithiMonth} onValueChange={setTithiMonth}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="માસ" />
                </SelectTrigger>
                <SelectContent>
                  {TITHI_MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tithiPhase} onValueChange={setTithiPhase}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="પક્ષ" />
                </SelectTrigger>
                <SelectContent>
                  {TITHI_PHASES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tithiDay} onValueChange={setTithiDay}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="તિથિ" />
                </SelectTrigger>
                <SelectContent>
                  {TITHI_DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Saved days */}
          <div className="rounded-xl border border-border bg-background/50 p-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="block text-sm font-medium text-foreground">
                સેવ કરેલા દિવસો
              </Label>
              {/* <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDay("")}>
                સાફ કરો
              </Button> */}
            </div>

            <div className="mt-3 space-y-2">
              {savedDays.slice(0, 3).map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground">{d}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editDay(d)}
                      className="h-7"
                    >
                      એડિટ
                    </Button>
                  </div>
                </div>
              ))}
              {savedDays.length > 3 && (
                <p className="text-[10px] text-center text-muted-foreground italic">
                  વધુ દિવસો જોવા માટે તારીખ પસંદ કરો.
                </p>
              )}
              {savedDays.length === 0 ? (
                <p className="text-sm text-muted-foreground">હજી સુધી કોઈ દિવસો સેવ નથી થયા.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      
      {errorMsg && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-center gap-2 text-destructive mb-1">
            <Info className="h-5 w-5" />
            <h4 className="font-bold">ડેટા લોડ કરવામાં ભૂલ</h4>
          </div>
          <p className="text-sm text-destructive/80 font-medium whitespace-pre-wrap">
            {errorMsg}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-8 text-xs font-bold hover:bg-destructive/10 text-destructive"
            onClick={() => void loadData(selectedDay)}
          >
            ફરી પ્રયત્ન કરો
          </Button>
        </div>
      )}

      {/* Meals: tabs + single-meal editor */}
      <section className="space-y-4">
        <div className="flex gap-2 p-1.5 bg-muted/30 rounded-2xl w-full border border-border/50 shadow-inner">
          {(Object.keys(MEAL_TITLES) as MealType[]).map((mt) => (
            <button
              key={mt}
              onClick={() => setSelectedMeal(mt)}
              className={`flex-1 rounded-xl px-4 py-3 text-base font-bold transition-all duration-200 ${selectedMeal === mt
                ? "bg-white text-primary shadow-lg ring-1 ring-border/10 translate-y-[-2px]"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
            >
              {MEAL_TITLES[mt]}
            </button>
          ))}
        </div>

        {(() => {
          const mealType = selectedMeal
          const meal = meals[mealType]
          const totalValue = meal.totalOverride
          return (
            <div key={mealType} className="rounded-xl border border-border bg-card p-4 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <Label className="block text-sm font-bold text-foreground">
                  {MEAL_TITLES[mealType]}
                </Label>
              </div>

              {/* Metrics Card */}
              <div className="mb-6 rounded-xl border border-border bg-background/30 p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-0 gap-y-0 divide-x divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
                  <div className="p-4 bg-background/50">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block text-center mb-1">આજીવન</Label>
                    <Input
                      type="number"
                      value={meal.ajeevan || ""}
                      onChange={(e) => updateMetricField(mealType, "ajeevan", e.target.value)}
                      className="h-12 bg-transparent text-center font-black text-2xl border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="p-4 bg-background/50">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block text-center mb-1">વી.આઇ.પી.</Label>
                    <Input
                      type="number"
                      value={meal.vip || ""}
                      onChange={(e) => updateMetricField(mealType, "vip", e.target.value)}
                      className="h-12 bg-transparent text-center font-black text-2xl border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="p-4 bg-background/50">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block text-center mb-1">છાત્રાલય</Label>
                    <Input
                      type="number"
                      value={meal.chhatralaya || ""}
                      onChange={(e) => updateMetricField(mealType, "chhatralaya", e.target.value)}
                      className="h-12 bg-transparent text-center font-black text-2xl border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="row-span-2 p-4 flex flex-col items-center justify-center bg-primary/5">
                    <Label className="text-sm font-black text-primary uppercase tracking-widest block text-center mb-2">કુલ</Label>
                    <Input
                      type="number"
                      value={meal.totalOverride || "0"}
                      onChange={(e) => updateMetricField(mealType, "totalOverride", e.target.value)}
                      className="h-20 bg-transparent text-center text-5xl font-black text-primary border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  
                  <div className="p-4 bg-background/50">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block text-center mb-1">સ્ટાફ</Label>
                    <Input
                      type="number"
                      value={meal.staff || ""}
                      onChange={(e) => updateMetricField(mealType, "staff", e.target.value)}
                      className="h-12 bg-transparent text-center font-black text-2xl border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="p-4 bg-background/50">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block text-center mb-1">મહેમાન</Label>
                    <Input
                      type="number"
                      value={meal.guest || ""}
                      onChange={(e) => updateMetricField(mealType, "guest", e.target.value)}
                      className="h-12 bg-transparent text-center font-black text-2xl border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="p-4 bg-background/50">
                    <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block text-center mb-1">યુવતી</Label>
                    <Input
                      type="number"
                      value={meal.yuvati || ""}
                      onChange={(e) => updateMetricField(mealType, "yuvati", e.target.value)}
                      className="h-12 bg-transparent text-center font-black text-2xl border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              {/* Tables Editor */}
              <div className="space-y-8">
                {(() => {
                  const items = meal.items

                  // Helper to filter items for splitting into Thakorji and General groups
                  // For breakfast, lunch, and dinner, we show split tables.
                  const isMainMeal = (mealType === "breakfast" || mealType === "lunch" || mealType === "dinner")

                  const renderTable = (itemsToRender: DailyMenuItem[], title?: string, color: "orange" | "blue" = "orange") => {
                    const isBlue = color === "blue"
                    const headerBg = isBlue ? "bg-blue-50/50" : "bg-primary/5"
                    const textColor = isBlue ? "text-blue-600" : "text-primary"
                    const dotColor = isBlue ? "bg-blue-500" : "bg-primary"
                    const borderColor = isBlue ? "border-blue-200/60" : "border-border/60"

                    return (
                      <div className={`relative overflow-x-auto rounded-xl border border-border bg-background/20 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ${isBlue ? 'ring-1 ring-blue-100/50' : ''}`}>
                        {title && (
                          <div className={`${headerBg} px-5 py-3 border-b ${borderColor}`}>
                            <h4 className={`text-xl font-bold ${textColor} flex items-center gap-2.5`}>
                              <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm`} />
                              {title}
                            </h4>
                          </div>
                        )}
                        <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
                          <thead>
                            <tr className={`border-b border-border ${isBlue ? 'bg-blue-50/20' : 'bg-muted/30'}`}>
                              <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[25%] border-r border-border/50">વિગત / વાનગી</th>
                              <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[35%] border-r border-border/50">વસ્તુનું નામ</th>
                              <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[20%] border-r border-border/50">માપ</th>
                              <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[15%] border-r border-border/50">વદ-ઘટ</th>
                              <th className="px-2 py-3 text-xs text-center w-[50px]"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {itemsToRender.map((it, idx) => (
                              <tr key={it.id} className={`group ${isBlue ? 'hover:bg-blue-50/10' : 'hover:bg-muted/10'} transition-colors`}>
                                <td className="p-2 align-top border-r border-border/40">
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      value={it.label || `${MEAL_TITLES[mealType]} - ${idx + 1}`}
                                      onChange={(e) => updateItem(mealType, it.id, { label: e.target.value })}
                                      className={`h-auto border-none bg-transparent p-0 px-2 text-base font-bold ${isBlue ? 'text-blue-600/70' : 'text-primary/70'} shadow-none focus-visible:ring-0`}
                                    />
                                    <RecipeSuggestionInput
                                      value={it.name}
                                      onChange={(v) => updateItem(mealType, it.id, { name: v })}
                                      recipes={allSuggestions}
                                      placeholder="નવી વાનગી..."
                                      className={`w-full bg-background border border-border/60 rounded-md shadow-none focus-visible:ring-1 ${isBlue ? 'focus-visible:ring-blue-400/30' : 'focus-visible:ring-primary/30'} text-sm font-medium px-2`}
                                    />
                                  </div>
                                </td>
                                <td className="p-2 align-top border-r border-border/40">
                                  <RecipeSuggestionInput
                                    value={it.value}
                                    onChange={(v) => updateItem(mealType, it.id, { value: v })}
                                    recipes={allSuggestions}
                                    placeholder="વસ્તુનું નામ લખો..."
                                    className={`bg-background border border-border/60 rounded-md shadow-none focus-visible:ring-1 ${isBlue ? 'focus-visible:ring-blue-400/30' : 'focus-visible:ring-primary/30'} text-sm`}
                                  />
                                </td>
                                <td className="p-2 align-top border-r border-border/40">
                                  <div className="flex items-center gap-1.5 px-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={Number.isFinite(it.quantity) ? it.quantity : 0}
                                      onChange={(e) => updateItem(mealType, it.id, { quantity: parseFloat(e.target.value || "0") })}
                                      className="h-9 flex-1 bg-background/50 text-center text-sm border-border/60"
                                    />
                                    <select
                                      value={it.unit}
                                      onChange={(e) => updateItem(mealType, it.id, { unit: e.target.value })}
                                      className="h-9 w-20 rounded-md border border-border/60 bg-background/50 px-2 text-xs focus:border-primary/50 outline-none"
                                    >
                                      {UNIT_OPTIONS.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="p-2 align-top border-r border-border/40">
                                  <div className="flex items-center gap-0 w-fit mx-auto bg-background rounded-lg border border-border shadow-sm group focus-within:ring-1 focus-within:ring-primary/30 h-9 overflow-hidden">
                                    <Input
                                      type="number"
                                      value={it.adjustment ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateItem(mealType, it.id, { adjustment: val });
                                      }}
                                      className="w-10 h-full border-none text-center font-bold text-sm p-0 focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="flex flex-col border-l border-border h-full">
                                      <button
                                        type="button"
                                        className="flex-1 px-1.5 hover:bg-muted flex items-center justify-center border-b border-border/50 text-muted-foreground hover:text-foreground transition-all active:bg-muted/80"
                                        onClick={() => {
                                          const current = parseInt(it.adjustment || "0", 10) || 0
                                          updateItem(mealType, it.id, { adjustment: String(current + 1) })
                                        }}
                                      >
                                        <ChevronUp className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        className="flex-1 px-1.5 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:bg-muted/80"
                                        onClick={() => {
                                          const current = parseInt(it.adjustment || "0", 10) || 0
                                          updateItem(mealType, it.id, { adjustment: String(current - 1) })
                                        }}
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <select
                                      value={it.adjustmentUnit || ""}
                                      onChange={(e) => updateItem(mealType, it.id, { adjustmentUnit: e.target.value })}
                                      className="h-full border-l border-border bg-background px-1 text-[9px] font-bold focus:ring-0 focus:outline-none hover:bg-muted/30 transition-colors w-[52px] appearance-none text-center outline-none"
                                    >
                                      <option value="">-</option>
                                      {["કુંડી", "ડોલ", "ટબ", "કેરેટ", "કેન", "બોક્સ"].map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="p-2 align-middle text-center">
                                  <div className="flex flex-col gap-1 items-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={`h-7 w-7 rounded-sm ${isBlue ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-primary/10 text-primary hover:bg-primary/20'} transition-all shadow-sm`}
                                      onClick={() => addItem(mealType, it.id, it)}
                                    >
                                      <span className="text-lg font-bold leading-none">+</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={`h-7 w-7 rounded-sm text-destructive hover:bg-destructive/10 transition-all`}
                                      onClick={() => removeItem(mealType, it.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {itemsToRender.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground italic text-xs">
                                  આ સેક્શનમાં કોઈ આઈટમ નથી.
                                </td>
                              </tr>
                            )}

                            {/* Dedicated Add New Item Row - Placed right after the last content row */}
                            <tr
                              className={`cursor-pointer transition-colors ${isBlue ? 'hover:bg-blue-50/30' : 'hover:bg-primary/5'}`}
                              onClick={() => {
                                const lastId = itemsToRender.length > 0 ? itemsToRender[itemsToRender.length - 1].id : undefined
                                addItem(mealType, lastId, undefined, title)
                              }}
                            >
                              <td colSpan={5} className="p-3">
                                <div className={`flex items-center justify-center gap-2 py-2 border-2 border-dashed rounded-lg ${isBlue ? 'border-blue-200 text-blue-600' : 'border-primary/20 text-primary'} font-semibold text-sm`}>
                                  <Plus className="h-4 w-4" />
                                  નવી આઈટમ ઉમેરો {title ? `(${title})` : ""}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  if (isMainMeal) {
                    const thakorjiItems = items.filter(it => it.label?.includes("ઠાકોરજી"))
                    const generalItems = items.filter(it => !it.label?.includes("ઠાકોરજી"))

                    return (
                      <div className="space-y-10">
                        {renderTable(thakorjiItems, "ઠાકોરજી માટે", "orange")}
                        {renderTable(generalItems, "જેનરલ", "blue")}
                      </div>
                    )
                  }

                  return renderTable(items)
                })()}
              </div>

              {meal.items.length === 0 && (
                <div className="mt-4 flex justify-center">
                  <Button type="button" onClick={() => addItem(mealType)} className="gap-2 bg-primary hover:bg-primary/90">
                    + આઈટમ ઉમેરો
                  </Button>
                </div>
              )}
            </div>
          )
        })()}
      </section>

      <section className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <p className="text-xs text-muted-foreground">
          {editingDay ? `Editing: ${editingDay}` : "New day"} · {totalItemsCount} items
        </p>
        <div className="flex flex-col items-end gap-2">
          {saveNotice ? (
            <p className="text-sm font-medium text-primary">{saveNotice}</p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setEditingDay("")}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={saveDay} 
              className="gap-2" 
              disabled={isSyncing}
            >
              {isSyncing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              {isSyncing ? "સેવ થઈ રહ્યું છે..." : "સેવ કરો"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

