"use client"

import { Search, Trash2, CalendarDays, Utensils, Save, Download, Copy, Printer } from "lucide-react"
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
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast")
  const [editingDay, setEditingDay] = useState<string | null>(getTodayKey())
  const [breakfastNewName, setBreakfastNewName] = useState<string>("નાસ્તો - 1")
  const [breakfastNewQuantity, setBreakfastNewQuantity] = useState<number>(0)
  const [breakfastNewUnit, setBreakfastNewUnit] = useState<string>("kg")
  const [breakfastNewValue, setBreakfastNewValue] = useState<string>("")
  const [breakfastNewItemName, setBreakfastNewItemName] = useState<string>("")
  const [breakfastNewNote, setBreakfastNewNote] = useState<string>("")

  const [extraItemForm, setExtraItemForm] = useState<
    Record<"lunch" | "dinner", { name: string; quantity: number; unit: string; itemName: string; note: string }>
  >({
    lunch: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
    dinner: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
  })
  const [thakorjiExtraItemForm, setThakorjiExtraItemForm] = useState<
    Record<"lunch" | "dinner", { name: string; quantity: number; unit: string; itemName: string; note: string }>
  >({
    lunch: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
    dinner: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
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
    "જનરલ મિષ્ટાન્ન",
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
    "ઠાકોરજી સલાડ",
    "જનરલ સલાડ",
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

  // When the selected date changes, load saved data if present — otherwise clear everything
  useEffect(() => {
    const current = loadDayMenu(selectedDay)
    if (current) {
      setMeals(current.meals)
      setDayOfWeek(current.dayOfWeek ?? "")
      setTithiMonth(current.tithiMonth ?? "")
      setTithiPhase(current.tithiPhase ?? "")
      setTithiDay(current.tithiDay ?? "")
      setEditingDay(selectedDay)
    } else {
      setMeals({
        breakfast: { calories: "", categories: "", maximum: "", totalOverride: "0", items: [] },
        lunch: { calories: "", categories: "", maximum: "", totalOverride: "0", items: [] },
        dinner: { calories: "", categories: "", maximum: "", totalOverride: "0", items: [] },
      })
      setDayOfWeek("")
      setTithiMonth("")
      setTithiPhase("")
      setTithiDay("")
      setEditingDay(null)
    }

    // keep saved days list up to date
    setSavedDays(listSavedDays())
  }, [selectedDay])

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
      lunch: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
      dinner: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
    })
    setThakorjiExtraItemForm({
      lunch: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
      dinner: { name: "", quantity: 0, unit: "kg", itemName: "", note: "" },
    })
  }, [])

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current) clearTimeout(saveNoticeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const used = new Set<number>()
    const valMap: Record<string, string> = { "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4", "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9" }
    for (const it of meals.breakfast.items) {
      const match = it.name.match(/નાસ્તો\s*-\s*([0-9૦-૯]+)/)
      if (match) {
        let numStr = match[1]
        let engStr = numStr.split("").map((c) => valMap[c] !== undefined ? valMap[c] : c).join("")
        let num = parseInt(engStr, 10)
        if (!isNaN(num)) used.add(num)
      }
    }
    let nextNum = 1
    while (used.has(nextNum)) {
      nextNum++
    }
    setBreakfastNewName(`નાસ્તો - ${nextNum}`)
  }, [meals.breakfast.items])

  const MEAL_TITLES: Record<MealType, string> = {
    breakfast: "નાસ્તો",
    lunch: "બપોરે ભોજન",
    dinner: "રાત્રી ભોજન",
  }

  const UNIT_OPTIONS = useMemo(() => ["kg", "g", "L", "ml", "pieces"], [])
  const VAD_GHAT_OPTIONS = ["", "કુંડી", "ડોલ", "ટબ", "બોક્સ", "કેરેટ", "કેન"]

  const parseNote = (note: string) => {
    const trimmed = (note || "").trim();
    if (!trimmed) return { value: 0, unit: "" };
    const parts = trimmed.split(" ");
    if (parts.length >= 2) {
      const val = parseFloat(parts[0]);
      if (!isNaN(val)) {
        return { value: val, unit: parts.slice(1).join(" ") };
      }
    }
    const val = parseFloat(trimmed);
    if (!isNaN(val) && trimmed === val.toString()) {
      return { value: val, unit: "" };
    }
    return { value: 0, unit: trimmed };
  };

  const formatNote = (value: number, unit: string) => {
    const valStr = value > 0 ? value.toString() : "";
    if (!valStr && !unit) return "";
    if (!valStr) return unit;
    if (!unit) return valStr;
    return `${valStr} ${unit}`;
  };

  const updateNoteValue = (itemId: string, mealType: string, newValue: string) => {
    const item = meals[mealType as MealType].items.find(i => i.id === itemId);
    const { unit } = parseNote(item?.note || "");
    updateItem(mealType as MealType, itemId, { note: formatNote(parseFloat(newValue || "0"), unit) });
  };

  const updateNoteUnit = (itemId: string, mealType: string, newUnit: string) => {
    const item = meals[mealType as MealType].items.find(i => i.id === itemId);
    const { value } = parseNote(item?.note || "");
    updateItem(mealType as MealType, itemId, { note: formatNote(value, newUnit) });
  };

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
    const val = breakfastNewValue.trim()
    const name = breakfastNewName.trim() || "નાસ્તો"
    if (!val && !breakfastNewName.trim()) return
    const newItem: DailyMenuItem = {
      ...emptyItem(),
      name,
      quantity: Number.isFinite(breakfastNewQuantity) ? breakfastNewQuantity : 0,
      unit: breakfastNewUnit,
      value: val,
      note: breakfastNewNote.trim(),
      itemName: breakfastNewItemName.trim(),
    }
    setMeals((prev) => ({
      ...prev,
      breakfast: { ...prev.breakfast, items: [...prev.breakfast.items, newItem] },
    }))

    setBreakfastNewQuantity(0)
    setBreakfastNewUnit("kg")
    setBreakfastNewValue("")
    setBreakfastNewItemName("")
    setBreakfastNewNote("")
  }

  function addExtraItem(mealType: "lunch" | "dinner") {
    const form = extraItemForm[mealType]
    let name = form.name.trim()
    if (!name) return
    if (!name.startsWith("જનરલ")) {
      name = "જનરલ " + name
    }
    const newItem: DailyMenuItem = {
      ...emptyItem(),
      name,
      quantity: Number.isFinite(form.quantity) ? form.quantity : 0,
      unit: form.unit,
      value: "",
      itemName: form.itemName.trim(),
      note: form.note.trim(),
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
      [mealType]: { name: "", quantity: 0, unit: "kg", itemName: "" },
    }))
  }

  function addThakorjiItem(mealType: "lunch" | "dinner") {
    const form = thakorjiExtraItemForm[mealType]
    let name = form.name.trim()
    if (!name) return
    if (!name.startsWith("ઠાકોરજી")) {
      name = "ઠાકોરજી " + name
    }
    const newItem: DailyMenuItem = {
      ...emptyItem(),
      name,
      quantity: Number.isFinite(form.quantity) ? form.quantity : 0,
      unit: form.unit,
      value: "",
      itemName: form.itemName.trim(),
      note: form.note.trim(),
    }
    setMeals((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        items: [...prev[mealType].items, newItem],
      },
    }))
    setThakorjiExtraItemForm((prev) => ({
      ...prev,
      [mealType]: { name: "", quantity: 0, unit: "kg", itemName: "" },
    }))
  }

  function insertItemAfter(mealType: MealType, itemId: string) {
    setMeals((prev) => {
      const list = prev[mealType].items
      const idx = list.findIndex((it) => it.id === itemId)
      if (idx === -1) return prev
      const currentItem = list[idx]
      const newItem: DailyMenuItem = {
        ...emptyItem(),
        name: currentItem.name,
        quantity: 0,
        unit: "kg",
        value: "",
      }
      const next = [...list]
      next.splice(idx + 1, 0, newItem)
      return { ...prev, [mealType]: { ...prev[mealType], items: next } }
    })
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

      {/* Meals Tab Navigation */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(MEAL_TITLES) as MealType[]).map((mealType) => (
          <button
            key={mealType}
            type="button"
            onClick={() => setActiveMeal(mealType)}
            className={`w-full h-12 text-base font-bold rounded-xl border transition-all ${activeMeal === mealType
                ? "bg-primary border-primary text-primary-foreground shadow-md scale-[1.02]"
                : "border-border bg-background text-muted-foreground hover:bg-primary/5 hover:text-foreground active:scale-95"
              }`}
          >
            {MEAL_TITLES[mealType]}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        {(Object.keys(MEAL_TITLES) as MealType[]).map((mealType) => {
          if (mealType !== activeMeal) return null;

          const meal = meals[mealType]
          const totalValue = meal.totalOverride
          return (
            <div key={mealType} className="rounded-xl border border-border bg-card p-4 shadow-sm">

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
                      <p className="text-[11px] font-medium text-muted-foreground">સ્ટાફ</p>
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
                <div className="mt-4 space-y-3">
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
                        <p className="text-[11px] font-medium text-muted-foreground">સ્ટાફ</p>
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

                  {/* Breakfast Items Table */}
                  <div className="overflow-x-auto rounded-xl border border-zinc-300 bg-background/50 dark:border-zinc-700">
                    <table className="w-full text-sm">
                      <thead className="border-b border-zinc-300 bg-muted/50 text-muted-foreground dark:border-zinc-700">
                        <tr>
                          <th className="p-3 font-medium text-left">વિગત / વાનગી</th>
                          <th className="p-3 font-medium text-left md:border-l md:border-zinc-300 md:pl-3 dark:md:border-zinc-700">વસ્તુનું નામ</th>
                          <th className="p-3 font-medium text-left w-[180px] md:border-l md:border-zinc-300 md:pl-3 dark:md:border-zinc-700">માપ</th>
                          <th className="p-3 font-medium text-left md:border-l md:border-zinc-300 md:pl-3 dark:md:border-zinc-700">વદ-ઘટ</th>
                          <th className="p-3 w-12 md:border-l md:border-zinc-300 md:pl-2 dark:md:border-zinc-700"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-300 dark:divide-zinc-700">
                        {meal.items.map((it) => (
                          <tr key={it.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 align-top">
                              <AutoResizeTextarea
                                value={it.name}
                                onChange={(e) => updateItem(mealType, it.id, { name: e.target.value })}
                                placeholder="વિગત (દા.ત. નાસ્તો - ૧)"
                                className="mb-1 border-none bg-transparent px-0 text-base font-semibold focus-visible:ring-0 shadow-none text-foreground placeholder:text-muted-foreground/50 min-h-0 py-0"
                              />
                              <RecipeSuggestionInput
                                value={it.value}
                                onChange={(v) => updateItem(mealType, it.id, { value: v })}
                                recipes={recipes}
                                placeholder="વાનગી લખો..."
                                className="bg-background text-sm"
                              />
                            </td>
                            <td className="p-3 align-top md:border-l md:border-zinc-300 md:pl-3 dark:md:border-zinc-700">
                              <div className="h-8 mb-1"></div>
                              <AutoResizeTextarea
                                value={it.itemName || ""}
                                onChange={(e) => updateItem(mealType, it.id, { itemName: e.target.value })}
                                placeholder="વસ્તુનું નામ લખો..."
                                className="bg-background text-sm border-zinc-300 dark:border-zinc-700 min-h-0 py-2"
                              />
                            </td>
                            <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                              <div className="h-8 mb-1"></div>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={Number.isFinite(it.quantity) ? it.quantity : ""}
                                  onChange={(e) =>
                                    updateItem(mealType, it.id, {
                                      quantity: parseFloat(e.target.value || "0"),
                                    })
                                  }
                                  className="h-9 bg-background w-[80px]"
                                />
                                <select
                                  value={it.unit}
                                  onChange={(e) =>
                                    updateItem(mealType, it.id, { unit: e.target.value })
                                  }
                                  className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                                >
                                  {UNIT_OPTIONS.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                              <div className="h-8 mb-1"></div>
                              <div className="flex gap-1 items-center">
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="0"
                                  value={parseNote(it.note || "").value || ""}
                                  onChange={(e) => updateNoteValue(it.id, mealType, e.target.value)}
                                  className="h-9 w-16 bg-background px-1 text-center"
                                />
                                <select
                                  value={parseNote(it.note || "").unit}
                                  onChange={(e) => updateNoteUnit(it.id, mealType, e.target.value)}
                                  className="h-9 flex-1 rounded-md border border-border bg-background px-1 text-xs"
                                >
                                  {VAD_GHAT_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt || "પસંદ કરો..."}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-3 align-top md:border-l md:border-border md:pl-2">
                              <div className="h-8 mb-1"></div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-foreground hover:bg-accent/5"
                                  onClick={() => insertItemAfter(mealType, it.id)}
                                  aria-label="Insert new recipe after this"
                                >
                                  +
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => removeItem(mealType, it.id)}
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-muted/5">
                          <td className="p-3 align-top">
                            <AutoResizeTextarea
                              value={breakfastNewName}
                              onChange={(e) => setBreakfastNewName(e.target.value)}
                              placeholder="વિગત (દા.ત. નાસ્તો - ૧)"
                              className="mb-1 border-none bg-transparent px-0 text-base font-semibold focus-visible:ring-0 shadow-none text-foreground placeholder:text-muted-foreground/50 min-h-0 py-0"
                            />
                            <RecipeSuggestionInput
                              value={breakfastNewValue}
                              onChange={setBreakfastNewValue}
                              recipes={recipes}
                              placeholder="નવી વાનગી..."
                              className="bg-background text-sm"
                            />
                          </td>
                          <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                            <div className="h-8 mb-1"></div>
                            <AutoResizeTextarea
                              value={breakfastNewItemName}
                              onChange={(e) => setBreakfastNewItemName(e.target.value)}
                              placeholder="વસ્તુનું નામ લખો..."
                              className="bg-background text-sm min-h-0 py-2"
                            />
                          </td>
                          <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                            <div className="h-8 mb-1"></div>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={breakfastNewQuantity || ""}
                                onChange={(e) =>
                                  setBreakfastNewQuantity(parseFloat(e.target.value || "0"))
                                }
                                className="h-9 bg-background w-[80px]"
                              />
                              <select
                                value={breakfastNewUnit}
                                onChange={(e) => setBreakfastNewUnit(e.target.value)}
                                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                            <div className="h-8 mb-1"></div>
                            <div className="flex gap-1 items-center">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0"
                                value={parseNote(breakfastNewNote).value || ""}
                                onChange={(e) => {
                                  const { unit } = parseNote(breakfastNewNote);
                                  setBreakfastNewNote(formatNote(parseFloat(e.target.value || "0"), unit));
                                }}
                                className="h-9 w-16 bg-background px-1 text-center"
                              />
                              <select
                                value={parseNote(breakfastNewNote).unit}
                                onChange={(e) => {
                                  const { value } = parseNote(breakfastNewNote);
                                  setBreakfastNewNote(formatNote(value, e.target.value));
                                }}
                                className="h-9 flex-1 rounded-md border border-border bg-background px-1 text-xs"
                              >
                                {VAD_GHAT_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt || "પસંદ કરો..."}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="p-3 align-top text-right md:border-l md:border-border md:pl-2">
                            <div className="h-8 mb-1"></div>
                            <Button
                              type="button"
                              onClick={addBreakfastItem}
                              className="h-9 w-9 p-0 bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              +
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-8">
                  {/* Thakorji Items Table Card */}
                  <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-4 shadow-sm dark:border-orange-900/30 dark:bg-orange-950/10">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-orange-700 dark:text-orange-400">
                      <span className="bg-orange-100 px-3 py-1 rounded-lg dark:bg-orange-900/40">ઠાકોરજી માટે</span>
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-orange-200 bg-background/50 dark:border-orange-900/40">
                      <table className="w-full text-sm">
                        <thead className="border-b border-orange-200 bg-orange-50/50 text-orange-800/70 dark:border-orange-900/30 dark:bg-orange-900/20 dark:text-orange-300/70">
                          <tr>
                            <th className="p-3 font-medium text-left">વિગત / વાનગી</th>
                            <th className="p-3 font-medium text-left md:border-l md:border-orange-200 md:pl-3 dark:md:border-orange-900/30">વસ્તુનું નામ</th>
                            <th className="p-3 font-medium text-left w-[180px] md:border-l md:border-orange-200 md:pl-3 dark:md:border-orange-900/30">માપ</th>
                            <th className="p-3 font-medium text-left md:border-l md:border-orange-200 md:pl-3 dark:md:border-orange-900/30">વદ-ઘટ</th>
                            <th className="p-3 w-12 md:border-l md:border-orange-200 md:pl-2 dark:md:border-orange-900/30"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-200 dark:divide-orange-900/30">
                          {meal.items.filter(it => it.name.startsWith("ઠાકોરજી")).length > 0 ? (
                            meal.items.filter(it => it.name.startsWith("ઠાકોરજી")).map((it) => (
                              <tr key={it.id} className="hover:bg-orange-50/50 transition-colors dark:hover:bg-orange-900/10">
                                <td className="p-3 align-top">
                                  <Input
                                    value={it.name}
                                    onChange={(e) => updateItem(mealType, it.id, { name: e.target.value })}
                                    className="h-8 mb-1 border-none bg-transparent px-0 text-base font-semibold focus-visible:ring-0 shadow-none text-foreground"
                                  />
                                  <RecipeSuggestionInput
                                    value={it.value}
                                    onChange={(v) => updateItem(mealType, it.id, { value: v })}
                                    recipes={recipes}
                                    placeholder="વાનગી લખો..."
                                    className="h-9 bg-background text-sm border-orange-200 dark:border-orange-900/40"
                                  />
                                </td>
                                <td className="p-3 align-top md:border-l md:border-orange-200 md:pl-3 dark:md:border-orange-900/30">
                                  <div className="h-8 mb-1"></div>
                                  <AutoResizeTextarea
                                    value={it.itemName || ""}
                                    onChange={(e) => updateItem(mealType, it.id, { itemName: e.target.value })}
                                    placeholder="વસ્તુનું નામ લખો..."
                                    className="bg-background text-sm border-orange-200 dark:border-orange-900/40 min-h-0 py-2"
                                  />
                                </td>
                                <td className="p-3 align-top md:border-l md:border-orange-200 md:pl-3 dark:md:border-orange-900/30">
                                  <div className="h-8 mb-1"></div>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={Number.isFinite(it.quantity) ? it.quantity : ""}
                                      onChange={(e) =>
                                        updateItem(mealType, it.id, {
                                          quantity: parseFloat(e.target.value || "0"),
                                        })
                                      }
                                      className="h-9 bg-background w-[80px] border-orange-200 dark:border-orange-900/40"
                                    />
                                    <select
                                      value={it.unit}
                                      onChange={(e) => updateItem(mealType, it.id, { unit: e.target.value })}
                                      className="h-9 flex-1 rounded-md border border-orange-200 bg-background px-2 text-sm dark:border-orange-900/40"
                                    >
                                      {UNIT_OPTIONS.map((u) => (
                                        <option key={u} value={u}>
                                          {u}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="p-3 align-top md:border-l md:border-orange-200 md:pl-3 dark:md:border-orange-900/30">
                                  <div className="h-8 mb-1"></div>
                                  <div className="flex gap-1 items-center">
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="0"
                                      value={parseNote(it.note || "").value || ""}
                                      onChange={(e) => updateNoteValue(it.id, mealType, e.target.value)}
                                      className="h-9 w-16 bg-background px-1 text-center border-orange-200 dark:border-orange-900/40"
                                    />
                                    <select
                                      value={parseNote(it.note || "").unit}
                                      onChange={(e) => updateNoteUnit(it.id, mealType, e.target.value)}
                                      className="h-9 flex-1 rounded-md border border-orange-200 bg-background px-1 text-xs dark:border-orange-900/40"
                                    >
                                      {VAD_GHAT_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt || "પસંદ કરો..."}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="p-3 align-top md:border-l md:border-orange-200 md:pl-2 dark:md:border-orange-900/30">
                                  <div className="h-8 mb-1"></div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 text-orange-600 hover:bg-orange-100/50 dark:text-orange-400 dark:hover:bg-orange-900/40"
                                      onClick={() => insertItemAfter(mealType as MealType, it.id)}
                                      aria-label="Duplicate item"
                                    >
                                      +
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => removeItem(mealType, it.id)}
                                      aria-label="Remove item"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                                કોઈ ઠાકોરજી આઇટમ નથી.
                              </td>
                            </tr>
                          )}

                          <tr className="bg-orange-50/20 dark:bg-orange-900/5">
                            <td className="p-3 align-top">
                              <RecipeSuggestionInput
                                value={thakorjiExtraItemForm[mealType as "lunch" | "dinner"].name}
                                onChange={(v) =>
                                  setThakorjiExtraItemForm((prev) => ({
                                    ...prev,
                                    [mealType]: { ...prev[mealType as "lunch" | "dinner"], name: v },
                                  }))
                                }
                                recipes={recipes}
                                placeholder="નવી વાનગી..."
                                className="bg-background text-sm border-orange-100/50 dark:border-orange-900/30"
                              />
                            </td>
                            <td className="p-3 align-top md:border-l md:border-orange-100/50 md:pl-3 dark:md:border-orange-900/20">
                              <div className="h-8 mb-1"></div>
                              <AutoResizeTextarea
                                value={thakorjiExtraItemForm[mealType as "lunch" | "dinner"].itemName || ""}
                                onChange={(e) =>
                                  setThakorjiExtraItemForm((prev) => ({
                                    ...prev,
                                    [mealType]: { ...prev[mealType as "lunch" | "dinner"], itemName: e.target.value },
                                  }))
                                }
                                placeholder="વસ્તુનું નામ લખો..."
                                className="bg-background text-sm border-orange-100/50 dark:border-orange-900/30 min-h-0 py-2"
                              />
                            </td>
                            <td className="p-3 align-top md:border-l md:border-orange-100/50 md:pl-3 dark:md:border-orange-900/20">
                              <div className="h-8 mb-1"></div>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={thakorjiExtraItemForm[mealType as "lunch" | "dinner"].quantity || ""}
                                  onChange={(e) =>
                                    setThakorjiExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: {
                                        ...prev[mealType as "lunch" | "dinner"],
                                        quantity: parseFloat(e.target.value || "0"),
                                      },
                                    }))
                                  }
                                  className="h-9 bg-background w-[80px] border-orange-100/50 dark:border-orange-900/30"
                                />
                                <select
                                  value={thakorjiExtraItemForm[mealType as "lunch" | "dinner"].unit}
                                  onChange={(e) =>
                                    setThakorjiExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: { ...prev[mealType as "lunch" | "dinner"], unit: e.target.value },
                                    }))
                                  }
                                  className="h-9 flex-1 rounded-md border border-orange-100/50 bg-background px-2 text-sm dark:border-orange-900/30"
                                >
                                  {UNIT_OPTIONS.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-3 align-top md:border-l md:border-orange-100/50 md:pl-3 dark:md:border-orange-900/20">
                              <div className="h-8 mb-1"></div>
                              <div className="flex gap-1 items-center">
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="0"
                                  value={parseNote(thakorjiExtraItemForm[mealType as "lunch" | "dinner"].note).value || ""}
                                  onChange={(e) => {
                                    const { unit } = parseNote(thakorjiExtraItemForm[mealType as "lunch" | "dinner"].note);
                                    setThakorjiExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: {
                                        ...prev[mealType as "lunch" | "dinner"],
                                        note: formatNote(parseFloat(e.target.value || "0"), unit)
                                      },
                                    }));
                                  }}
                                  className="h-9 w-16 bg-background px-1 text-center border-orange-100/50 dark:border-orange-900/30"
                                />
                                <select
                                  value={parseNote(thakorjiExtraItemForm[mealType as "lunch" | "dinner"].note).unit}
                                  onChange={(e) => {
                                    const { value } = parseNote(thakorjiExtraItemForm[mealType as "lunch" | "dinner"].note);
                                    setThakorjiExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: {
                                        ...prev[mealType as "lunch" | "dinner"],
                                        note: formatNote(value, e.target.value)
                                      },
                                    }));
                                  }}
                                  className="h-9 flex-1 rounded-md border border-orange-100/50 bg-background px-1 text-xs dark:border-orange-900/30"
                                >
                                  {VAD_GHAT_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt || "પસંદ કરો..."}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-3 align-top md:border-l md:border-orange-100/50 md:pl-2 dark:md:border-orange-900/20 text-right">
                              <div className="h-8 mb-1"></div>
                              <Button
                                type="button"
                                onClick={() => addThakorjiItem(mealType as "lunch" | "dinner")}
                                className="h-9 w-9 p-0 bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                              >
                                +
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* General Items Table Card */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm dark:border-blue-900/30 dark:bg-blue-950/10">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-700 dark:text-blue-400">
                      <span className="bg-blue-100 px-3 py-1 rounded-lg dark:bg-blue-900/40">જનરલ</span>
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-blue-200 bg-background/50 dark:border-blue-900/40">
                      <table className="w-full text-sm">
                        <thead className="border-b border-blue-200 bg-blue-50/50 text-blue-800/70 dark:border-blue-300/70 dark:bg-blue-900/20">
                          <tr>
                            <th className="p-3 font-medium text-left">વિગત / વાનગી</th>
                            <th className="p-3 font-medium text-left md:border-l md:border-blue-200 md:pl-3 dark:md:border-blue-900/30">વસ્તુનું નામ</th>
                            <th className="p-3 font-medium text-left w-[180px] md:border-l md:border-blue-200 md:pl-3 dark:md:border-blue-900/30">માપ</th>
                            <th className="p-3 font-medium text-left md:border-l md:border-blue-200 md:pl-3 dark:md:border-blue-900/30">વદ-ઘટ</th>
                            <th className="p-3 w-12 md:border-l md:border-blue-200 md:pl-2 dark:md:border-blue-900/30"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-200 dark:divide-blue-900/30">
                          {meal.items.filter(it => !it.name.startsWith("ઠાકોરજી")).map((it) => (
                            <tr key={it.id} className="hover:bg-blue-50/50 transition-colors dark:hover:bg-blue-900/10">
                              <td className="p-3 align-top">
                                <AutoResizeTextarea
                                  value={it.name}
                                  onChange={(e) => updateItem(mealType, it.id, { name: e.target.value })}
                                  className="mb-1 border-none bg-transparent px-0 text-base font-semibold focus-visible:ring-0 shadow-none text-foreground min-h-0 py-0"
                                />
                                <RecipeSuggestionInput
                                  value={it.value}
                                  onChange={(v) => updateItem(mealType, it.id, { value: v })}
                                  recipes={recipes}
                                  placeholder="વાનગી લખો..."
                                  className="bg-background text-sm border-blue-200 dark:border-blue-900/40"
                                />
                              </td>
                              <td className="p-3 align-top md:border-l md:border-blue-200 md:pl-3 dark:md:border-blue-900/30">
                                <div className="h-8 mb-1"></div>
                                <AutoResizeTextarea
                                  value={it.itemName || ""}
                                  onChange={(e) => updateItem(mealType, it.id, { itemName: e.target.value })}
                                  placeholder="વસ્તુનું નામ લખો..."
                                  className="bg-background text-sm border-blue-200 dark:border-blue-900/40 min-h-0 py-2"
                                />
                              </td>
                              <td className="p-3 align-top md:border-l md:border-blue-200 md:pl-3 dark:md:border-blue-900/30">
                                <div className="h-8 mb-1"></div>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={Number.isFinite(it.quantity) ? it.quantity : ""}
                                    onChange={(e) =>
                                      updateItem(mealType, it.id, {
                                        quantity: parseFloat(e.target.value || "0"),
                                      })
                                    }
                                    className="h-9 bg-background w-[80px] border-blue-200 dark:border-blue-900/40"
                                  />
                                  <select
                                    value={it.unit}
                                    onChange={(e) => updateItem(mealType, it.id, { unit: e.target.value })}
                                    className="h-9 flex-1 rounded-md border border-blue-200 bg-background px-2 text-sm dark:border-blue-900/40"
                                  >
                                    {UNIT_OPTIONS.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="p-3 align-top md:border-l md:border-blue-200 md:pl-3 dark:md:border-blue-900/30">
                                <div className="h-8 mb-1"></div>
                                <div className="flex gap-1 items-center">
                                  <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="0"
                                    value={parseNote(it.note || "").value || ""}
                                    onChange={(e) => updateNoteValue(it.id, mealType, e.target.value)}
                                    className="h-9 w-16 bg-background px-1 text-center border-blue-200 dark:border-blue-900/40"
                                  />
                                  <select
                                    value={parseNote(it.note || "").unit}
                                    onChange={(e) => updateNoteUnit(it.id, mealType, e.target.value)}
                                    className="h-9 flex-1 rounded-md border border-blue-200 bg-background px-1 text-xs dark:border-blue-900/40"
                                  >
                                    {VAD_GHAT_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt || "પસંદ કરો..."}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="p-3 align-top md:border-l md:border-blue-200 md:pl-2 dark:md:border-blue-900/30">
                                <div className="h-8 mb-1"></div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-blue-600 hover:bg-blue-100/50 dark:text-blue-400 dark:hover:bg-blue-900/40"
                                    onClick={() => insertItemAfter(mealType as MealType, it.id)}
                                    aria-label="Duplicate item"
                                  >
                                    +
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => removeItem(mealType, it.id)}
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          <tr className="bg-blue-50/20 dark:bg-blue-900/5">
                            <td className="p-3 align-top">
                              <RecipeSuggestionInput
                                value={extraItemForm[mealType as "lunch" | "dinner"].name}
                                onChange={(v) =>
                                  setExtraItemForm((prev) => ({
                                    ...prev,
                                    [mealType]: { ...prev[mealType as "lunch" | "dinner"], name: v },
                                  }))
                                }
                                recipes={recipes}
                                placeholder="નવી વાનગી..."
                                className="bg-background text-sm border-blue-100/50 dark:border-blue-900/30"
                              />
                            </td>
                            <td className="p-3 align-top md:border-l md:border-blue-100/50 md:pl-3 dark:md:border-blue-900/20">
                              <div className="h-8 mb-1"></div>
                              <Input
                                value={extraItemForm[mealType as "lunch" | "dinner"].itemName || ""}
                                onChange={(e) =>
                                  setExtraItemForm((prev) => ({
                                    ...prev,
                                    [mealType]: { ...prev[mealType as "lunch" | "dinner"], itemName: e.target.value },
                                  }))
                                }
                                placeholder="વસ્તુનું નામ લખો..."
                                className="h-9 bg-background text-sm border-blue-100/50 dark:border-blue-900/30"
                              />
                            </td>
                            <td className="p-3 align-top md:border-l md:border-blue-100/50 md:pl-3 dark:md:border-blue-900/20">
                              <div className="h-8 mb-1"></div>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={extraItemForm[mealType as "lunch" | "dinner"].quantity || ""}
                                  onChange={(e) =>
                                    setExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: {
                                        ...prev[mealType as "lunch" | "dinner"],
                                        quantity: parseFloat(e.target.value || "0"),
                                      },
                                    }))
                                  }
                                  className="h-9 bg-background w-[80px] border-blue-100/50 dark:border-blue-900/30"
                                />
                                <select
                                  value={extraItemForm[mealType as "lunch" | "dinner"].unit}
                                  onChange={(e) =>
                                    setExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: { ...prev[mealType as "lunch" | "dinner"], unit: e.target.value },
                                    }))
                                  }
                                  className="h-9 flex-1 rounded-md border border-blue-100/50 bg-background px-2 text-sm dark:border-blue-900/30"
                                >
                                  {UNIT_OPTIONS.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-3 align-top md:border-l md:border-blue-100/50 md:pl-3 dark:md:border-blue-900/20">
                              <div className="h-8 mb-1"></div>
                              <div className="flex gap-1 items-center">
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="0"
                                  value={parseNote(extraItemForm[mealType as "lunch" | "dinner"].note).value || ""}
                                  onChange={(e) => {
                                    const { unit } = parseNote(extraItemForm[mealType as "lunch" | "dinner"].note);
                                    setExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: {
                                        ...prev[mealType as "lunch" | "dinner"],
                                        note: formatNote(parseFloat(e.target.value || "0"), unit)
                                      },
                                    }));
                                  }}
                                  className="h-9 w-16 bg-background px-1 text-center border-blue-100/50 dark:border-blue-900/30"
                                />
                                <select
                                  value={parseNote(extraItemForm[mealType as "lunch" | "dinner"].note).unit}
                                  onChange={(e) => {
                                    const { value } = parseNote(extraItemForm[mealType as "lunch" | "dinner"].note);
                                    setExtraItemForm((prev) => ({
                                      ...prev,
                                      [mealType]: {
                                        ...prev[mealType as "lunch" | "dinner"],
                                        note: formatNote(value, e.target.value)
                                      },
                                    }));
                                  }}
                                  className="h-9 flex-1 rounded-md border border-blue-100/50 bg-background px-1 text-xs dark:border-blue-900/30"
                                >
                                  {VAD_GHAT_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt || "પસંદ કરો..."}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-3 align-top md:border-l md:border-blue-100/50 md:pl-2 dark:md:border-blue-900/20 text-right">
                              <div className="h-8 mb-1"></div>
                              <Button
                                type="button"
                                onClick={() => addExtraItem(mealType as "lunch" | "dinner")}
                                className="h-9 w-9 p-0 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                              >
                                +
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
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
              રદ કરો
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

