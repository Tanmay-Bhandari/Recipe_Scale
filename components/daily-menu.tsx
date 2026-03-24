"use client"

import { CalendarDays, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea"
import { RecipeSuggestionInput } from "@/components/recipe-suggestion-input"
import { Label } from "@/components/ui/label"
import type { Recipe } from "@/lib/types"
import {
  getTodayKey,
  listSavedDays,
  loadDayMenu,
  saveDayMenu,
  type DailyMenuItem,
  type DailyMenuMeal,
  type MealType,
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
  const [editingDay, setEditingDay] = useState<string | null>(getTodayKey())
  const [breakfastNewName, setBreakfastNewName] = useState<string>("")
  const [breakfastNewQuantity, setBreakfastNewQuantity] = useState<number>(0)
  const [breakfastNewUnit, setBreakfastNewUnit] = useState<string>("kg")

  const [extraItemForm, setExtraItemForm] = useState<
    Record<"lunch" | "dinner", { name: string; quantity: number; unit: string }>
  >({
    lunch: { name: "", quantity: 0, unit: "kg" },
    dinner: { name: "", quantity: 0, unit: "kg" },
  })
  const [dayOfWeek, setDayOfWeek] = useState("")
  const [tithiMonth, setTithiMonth] = useState("")
  const [tithiPhase, setTithiPhase] = useState("")
  const [tithiDay, setTithiDay] = useState("")
  const [saveNotice, setSaveNotice] = useState<string>("")
  const saveNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const emptyItem = (): DailyMenuItem => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "",
    quantity: 0,
    unit: "kg",
    value: "",
  })

  const namedItem = (name: string): DailyMenuItem => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    quantity: 0,
    unit: "g",
    value: "",
  })

  const LUNCH_DEFAULT_ITEMS = [
    "ઠાકોરજી મિષ્ટાન્ન",
    "જનરલ મિષ્ટા",
    "ઠાકોરજી રોટલી",
    "જનરલ રોટલી",
    "ઠાકોરજી તુવેરદાળ",
    "જનરલ તુવેરદાળ",
    "ઠાકોરજી ભાત",
    "જનરલ ભાત",
    "ઠાકોરજી શાક",
    "જનરલ શાક",
    "ઠાકોરજી કઠોળ",
    "જનરલ કઠોળ",
    "ઠાકોરજી ફરસાણ",
    "જનરલ ફરસાણ",
    "સલાડ",
  ]

  const DINNER_DEFAULT_ITEMS = [
    "ઠાકોરજી શાક",
    "જનરલ શાક",
    "ઠાકોરજી ભાખરી",
    "જનરલ ભાખરી",
    "ઠાકોરજી રોટલા",
    "જનરલ રોટલા",
    "ઠાકોરજી ખીચડી",
    "જનરલ ખીચડી",
    "ઠાકોરજી કઢી",
    "જનરલ કઢી",
  ]

  const [meals, setMeals] = useState<Record<MealType, DailyMenuMeal>>({
    breakfast: { calories: "", categories: "", maximum: "", totalOverride: "0", items: [] },
    lunch: {
      calories: "",
      categories: "",
      maximum: "",
      totalOverride: "0",
      items: LUNCH_DEFAULT_ITEMS.map((name) => namedItem(name)),
    },
    dinner: {
      calories: "",
      categories: "",
      maximum: "",
      totalOverride: "0",
      items: DINNER_DEFAULT_ITEMS.map((name) => namedItem(name)),
    },
  })

  useEffect(() => {
    const days = listSavedDays()
    setSavedDays(days)
    const current = loadDayMenu(selectedDay)
    if (current) {
      setMeals(current.meals)
      setDayOfWeek(current.dayOfWeek ?? "")
      setTithiMonth(current.tithiMonth ?? "")
      setTithiPhase(current.tithiPhase ?? "")
      setTithiDay(current.tithiDay ?? "")
      setEditingDay(selectedDay)
    }
  }, [])

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
        items: prev.breakfast.items.map((it) => ({ ...it, unit: "kg" })),
      },
      lunch: {
        ...prev.lunch,
        items: prev.lunch.items.map((it) => ({ ...it, unit: "kg" })),
      },
      dinner: {
        ...prev.dinner,
        items: prev.dinner.items.map((it) => ({ ...it, unit: "kg" })),
      },
    }))
    setBreakfastNewUnit("kg")
    setExtraItemForm({
      lunch: { name: "", quantity: 0, unit: "kg" },
      dinner: { name: "", quantity: 0, unit: "kg" },
    })
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
    field: "calories" | "categories" | "maximum",
    value: string
  ) {
    setMeals((prev) => {
      const nextMeal = { ...prev[mealType], [field]: value }
      const total =
        (parseFloat(nextMeal.calories) || 0) +
        (parseFloat(nextMeal.categories) || 0) +
        (parseFloat(nextMeal.maximum) || 0)
      return {
        ...prev,
        [mealType]: {
          ...nextMeal,
          totalOverride: String(total),
        },
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
    if (!confirm("Do you want to delete this field?")) return
    setMeals((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: prev[mealType].items.filter((it) => it.id !== itemId),
      },
    }))
  }

  function addBreakfastItem() {
    const name = breakfastNewName.trim()
    if (!name) return
    const newItem: DailyMenuItem = {
      ...emptyItem(),
      name,
      quantity: Number.isFinite(breakfastNewQuantity) ? breakfastNewQuantity : 0,
      unit: breakfastNewUnit,
      value: "",
    }
    setMeals((prev) => ({
      ...prev,
      breakfast: { ...prev.breakfast, items: [...prev.breakfast.items, newItem] },
    }))
    setBreakfastNewName("")
    setBreakfastNewQuantity(0)
    setBreakfastNewUnit("kg")
  }

  function addExtraItem(mealType: "lunch" | "dinner") {
    const form = extraItemForm[mealType]
    const name = form.name.trim()
    if (!name) return
    const newItem: DailyMenuItem = {
      ...emptyItem(),
      name,
      quantity: Number.isFinite(form.quantity) ? form.quantity : 0,
      unit: form.unit,
      value: "",
    }
    setMeals((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: [...prev[mealType].items, newItem],
      },
    }))
    setExtraItemForm((prev) => ({
      ...prev,
      [mealType]: { name: "", quantity: 0, unit: "kg" },
    }))
  }

  function saveDay() {
    const day = selectedDay.trim()
    if (!day) return

    // Combine for backward compatibility or simple display
    const fullTithi = [tithiMonth, tithiPhase, tithiDay].filter(Boolean).join(" ")

    saveDayMenu(day, {
      meals,
      dayOfWeek,
      tithiMonth,
      tithiPhase,
      tithiDay,
      tithi: fullTithi,
    })
    setSavedDays((prev) => (prev.includes(day) ? prev : [day, ...prev]))
    setEditingDay(day)
    window.dispatchEvent(new Event("dailyMenuSaved"))
    setSaveNotice("સેવ સફળ!")
    if (saveNoticeTimerRef.current) clearTimeout(saveNoticeTimerRef.current)
    saveNoticeTimerRef.current = setTimeout(() => setSaveNotice(""), 3000)
  }

  function editDay(day: string) {
    setSelectedDay(day)
    setEditingDay(day)
    const data = loadDayMenu(day)
    if (data) {
      setMeals(data.meals)
      setDayOfWeek(data.dayOfWeek ?? "")
      setTithiMonth(data.tithiMonth ?? "")
      setTithiPhase(data.tithiPhase ?? "")
      setTithiDay(data.tithiDay ?? "")
    }
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
              Super Admin — Add/Edit Daily Menu
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
                Saved Days
              </Label>
              {/* <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDay("")}>
                સાફ કરો
              </Button> */}
            </div>

            <div className="mt-3 space-y-2">
              {savedDays.map((d) => (
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
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
              {savedDays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved days yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Meals stacked view: Breakfast -> Lunch -> Dinner */}
      <section className="space-y-4">
        {(Object.keys(MEAL_TITLES) as MealType[]).map((mealType) => {
          const meal = meals[mealType]
          const totalValue = meal.totalOverride
          return (
            <div key={mealType} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <Label className="block text-sm font-semibold text-foreground">
                {MEAL_TITLES[mealType]}
              </Label>

              {/* Macro/target row */}
              {mealType !== "breakfast" ? (
                <div className="mt-4 rounded-xl border border-border bg-background/50 p-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">વી.આઇ.પી.</p>
                      <Input
                        type="number"
                        value={meal.calories}
                        onChange={(e) =>
                          updateMetricField(mealType, "calories", e.target.value)
                        }
                        className="mt-1 h-8 bg-background text-center"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">સ્ટાર્ચ</p>
                      <Input
                        type="number"
                        value={meal.categories}
                        onChange={(e) =>
                          updateMetricField(mealType, "categories", e.target.value)
                        }
                        className="mt-1 h-8 bg-background text-center"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">મહેમાન</p>
                      <Input
                        type="number"
                        value={meal.maximum}
                        onChange={(e) =>
                          updateMetricField(mealType, "maximum", e.target.value)
                        }
                        className="mt-1 h-8 bg-background text-center"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">કુલ:</span>
                    <Input
                      type="number"
                      value={totalValue}
                      onChange={(e) =>
                        updateMeal(mealType, { totalOverride: e.target.value })
                      }
                      className="h-8 w-20 bg-background text-center text-xs font-semibold text-primary"
                    />
                  </div>
                </div>
              ) : null}

              {/* Items */}
              {mealType === "breakfast" ? (
                <div className="mt-4 space-y-4">
                  {/* Breakfast top metrics (as requested) */}
                  <div className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground">વી.આઇ.પી.</p>
                        <Input
                          type="number"
                          value={meal.calories}
                          onChange={(e) =>
                            updateMetricField(mealType, "calories", e.target.value)
                          }
                          className="mt-1 h-8 bg-background text-center"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground">સ્ટાર્ચ</p>
                        <Input
                          type="number"
                          value={meal.categories}
                          onChange={(e) =>
                            updateMetricField(mealType, "categories", e.target.value)
                          }
                          className="mt-1 h-8 bg-background text-center"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground">મહેમાન</p>
                        <Input
                          type="number"
                          value={meal.maximum}
                          onChange={(e) =>
                            updateMetricField(mealType, "maximum", e.target.value)
                          }
                          className="mt-1 h-8 bg-background text-center"
                        />
                      </div>
                    </div>

                  <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">કુલ:</span>
                    <Input
                      type="number"
                      value={totalValue}
                      onChange={(e) =>
                        updateMeal(mealType, { totalOverride: e.target.value })
                      }
                      className="h-8 w-20 bg-background text-center text-xs font-semibold text-primary"
                    />
                    </div>
                  </div>

                  {/* Add breakfast item: name + quantity + unit */}
                  <div className="space-y-4">
                    <Label className="text-xs font-medium text-foreground">
                      Add Item (નાસ્તો નામ)
                    </Label>
                    <div className="space-y-3">
                      <div>
                        <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                          નામ
                        </Label>
                        <RecipeSuggestionInput
                          value={breakfastNewName}
                          onChange={(v) => setBreakfastNewName(v)}
                          recipes={recipes}
                          placeholder="નાસ્તો લખો..."
                          className="bg-background"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            જથ્થો
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={breakfastNewQuantity}
                            onChange={(e) =>
                              setBreakfastNewQuantity(
                                parseFloat(e.target.value || "0")
                              )
                            }
                            className="bg-background"
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            યુનિટ
                          </Label>
                          <select
                            value={breakfastNewUnit}
                            onChange={(e) => setBreakfastNewUnit(e.target.value)}
                            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" onClick={addBreakfastItem} className="gap-2">
                          ઉમેરો
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {meal.items.map((it) => (
                      <div
                        key={it.id}
                        className="rounded-xl border border-border bg-background/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <RecipeSuggestionInput
                              value={it.name}
                              onChange={(v) => updateItem(mealType, it.id, { name: v })}
                              recipes={recipes}
                              placeholder="નાસ્તો લખો..."
                              className="h-auto border-none bg-transparent p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeItem(mealType, it.id)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                              જથ્થો
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={Number.isFinite(it.quantity) ? it.quantity : 0}
                              onChange={(e) =>
                                updateItem(mealType, it.id, {
                                  quantity: parseFloat(e.target.value || "0"),
                                })
                              }
                              className="bg-background"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                              યુનિટ
                            </Label>
                            <select
                              value={it.unit}
                              onChange={(e) =>
                                updateItem(mealType, it.id, { unit: e.target.value })
                              }
                              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                            >
                              {UNIT_OPTIONS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {meal.items.map((it) => (
                    <div
                      key={it.id}
                      draggable
                      onDragStart={(e) => onDragStart(mealType, it.id, e)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDrop(mealType, it.id, e)}
                      className="rounded-xl border border-border bg-background/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-semibold text-foreground">{it.name}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(mealType, it.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2">
                        <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                          નામ
                        </Label>
                        <RecipeSuggestionInput
                          value={it.value}
                          onChange={(v) => updateItem(mealType, it.id, { value: v })}
                          recipes={recipes}
                          placeholder="નામ લખો..."
                          className="bg-background"
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                            જથ્થો
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={Number.isFinite(it.quantity) ? it.quantity : 0}
                            onChange={(e) =>
                              updateItem(mealType, it.id, {
                                quantity: parseFloat(e.target.value || "0"),
                              })
                            }
                            className="bg-background"
                          />
                        </div>
                        <div className="col-span-1">
                          <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                            યુનિટ
                          </Label>
                          <select
                            value={it.unit}
                            onChange={(e) =>
                              updateItem(mealType, it.id, { unit: e.target.value })
                            }
                            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-xl border border-border bg-background/50 p-3">
                    <Label className="mb-1.5 block text-sm font-semibold text-foreground">
                      નવું ફીલ્ડ
                    </Label>
                    <div>
                      <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                        નામ
                      </Label>
                      <RecipeSuggestionInput
                        value={extraItemForm[mealType as "lunch" | "dinner"].name}
                        onChange={(v) =>
                          setExtraItemForm((prev) => ({
                            ...prev,
                            [mealType]: { ...prev[mealType as "lunch" | "dinner"], name: v },
                          }))
                        }
                        recipes={recipes}
                        placeholder=""
                        className="bg-background"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                          જથ્થો
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={extraItemForm[mealType as "lunch" | "dinner"].quantity}
                          onChange={(e) =>
                            setExtraItemForm((prev) => ({
                              ...prev,
                              [mealType]: {
                                ...prev[mealType as "lunch" | "dinner"],
                                quantity: parseFloat(e.target.value || "0"),
                              },
                            }))
                          }
                          className="bg-background"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                          યુનિટ
                        </Label>
                        <select
                          value={extraItemForm[mealType as "lunch" | "dinner"].unit}
                          onChange={(e) =>
                            setExtraItemForm((prev) => ({
                              ...prev,
                              [mealType]: { ...prev[mealType as "lunch" | "dinner"], unit: e.target.value },
                            }))
                          }
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => addExtraItem(mealType as "lunch" | "dinner")}
                      >
                        ઉમેરો
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
          <Button type="button" variant="outline" onClick={() => setEditingDay(null)}>
            Cancel
          </Button>
          <Button type="button" onClick={saveDay} className="gap-2">
            <CalendarDays className="h-4 w-4" />
            સેવ કરો
          </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

