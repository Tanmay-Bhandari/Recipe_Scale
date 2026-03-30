"use client"

import { useEffect, useMemo, useState, Fragment } from "react"
import { CalendarDays, ChevronDown, ChevronUp, Utensils, Info, CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getTodayKey,
  loadDayMenuFromFirestore,
  saveDayMenuToFirestore,
  type DailyMenuState,
  type MealType,
  type DailyMenuItem,
} from "@/lib/daily-menu-storage"
import type { Recipe } from "@/lib/types"
import { Input } from "@/components/ui/input"

const TITLES: Record<MealType, string> = {
  breakfast: "નાસ્તો",
  lunch: "બપોરે ભોજન",
  dinner: "રાત્રી ભોજન",
}

export function TodayDailyMenu({ recipes = [], isAdmin = false }: { recipes?: Recipe[]; isAdmin?: boolean }) {
  const [dayKey, setDayKey] = useState<string>(getTodayKey())
  const [menu, setMenu] = useState<DailyMenuState | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function refresh(targetDay: string) {
    setIsLoading(true)
    setIsOffline(false)
    try {
      console.log(`Checking API for: ${targetDay}`)
      const cloud = await loadDayMenuFromFirestore(targetDay)

      if (cloud) {
        setMenu(cloud)
        setIsOffline(false)
      } else {
        setMenu(null)
      }
    } catch (err: any) {
      console.error("Refresh failed:", err)
      // Check if it's an offline error
      if (err.message?.includes('offline') || err.code === 'unavailable') {
        setIsOffline(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function updateItemField(mealType: MealType, itemId: string, fieldUpdates: Partial<DailyMenuItem>) {
    if (!menu) return

    // Update local state for immediate feedback
    const updatedMenu = { ...menu }
    const meal = updatedMenu.meals[mealType]
    const itemIdx = meal.items.findIndex(i => i.id === itemId)

    if (itemIdx !== -1) {
      const items = [...meal.items]
      items[itemIdx] = { ...items[itemIdx], ...fieldUpdates }
      updatedMenu.meals[mealType].items = items
      setMenu({ ...updatedMenu })

      // Save to Firestore
      try {
        await saveDayMenuToFirestore(dayKey, updatedMenu)
      } catch (err) {
        console.error("Failed to sync item update:", err)
      }
    }
  }

  async function updateMetricField(mealType: MealType, field: "calories" | "categories" | "maximum" | "totalOverride", newValue: string) {
    if (!menu) return

    // Update local state for immediate feedback
    const updatedMenu = { ...menu }
    const meal = updatedMenu.meals[mealType]

    // Update the specific field
    meal[field] = newValue

    // Calculate totalOverride automatically (based on VIP + STAFF + GUEST)
    const vip = parseInt(meal.calories || "0", 10) || 0
    const staff = parseInt(meal.categories || "0", 10) || 0
    const guest = parseInt(meal.maximum || "0", 10) || 0
    meal.totalOverride = String(vip + staff + guest)

    setMenu({ ...updatedMenu })

    // Save to Firestore
    try {
      await saveDayMenuToFirestore(dayKey, updatedMenu)
    } catch (err) {
      console.error("Failed to sync metric update:", err)
    }
  }

  useEffect(() => {
    refresh(dayKey)
  }, [dayKey])

  const mealOrder: MealType[] = useMemo(() => ["breakfast", "lunch", "dinner"], [])
  const [selectedMeal, setSelectedMeal] = useState<MealType>(mealOrder[0])

  const renderTable = (itemsToRender: DailyMenuItem[], title?: string, color: "orange" | "blue" = "orange") => {
    const isBlue = color === "blue"
    const headerBg = isBlue ? "bg-blue-50/50" : "bg-primary/5"
    const textColor = isBlue ? "text-blue-600" : "text-primary"
    const dotColor = isBlue ? "bg-blue-500" : "bg-primary"
    const borderColor = isBlue ? "border-blue-200/60" : "border-border/60"

    return (
      <div className={`relative overflow-x-auto rounded-xl border border-border bg-background shadow-sm animate-in fade-in transition-all duration-500 ${isBlue ? 'ring-1 ring-blue-100/30' : ''}`}>
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
              <th className="px-4 py-4 text-sm font-bold text-muted-foreground uppercase tracking-wider w-[25%] border-r border-border/50 text-center">વાનગી</th>
              <th className="px-4 py-4 text-sm font-bold text-muted-foreground uppercase tracking-wider w-[35%] border-r border-border/50 text-center">વસ્તુ નામ</th>
              <th className="px-4 py-4 text-sm font-bold text-muted-foreground uppercase tracking-wider w-[20%] border-r border-border/50 text-center">માપ</th>
              <th className="px-4 py-4 text-sm font-bold text-muted-foreground uppercase tracking-wider w-[20%] text-center">વદ-ઘટ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {itemsToRender.map((it) => {
              const isBreakfast = selectedMeal === 'breakfast'
              const typedName = (isBreakfast ? "" : it.value?.trim()) ?? ""
              const hasQty = Number.isFinite(it.quantity) && it.quantity > 0
              const matchingRecipe = recipes.find(r =>
                r.name.toLowerCase() === (isBreakfast ? it.name : typedName).toLowerCase()
              )
              const isExpanded = expandedItems[it.id]

              return (
                <Fragment key={it.id}>
                  <tr className={`group ${isBlue ? 'hover:bg-blue-50/5' : 'hover:bg-muted/5'} transition-colors`}>
                    <td className="p-4 align-top border-r border-border/30 bg-muted/5 min-h-[60px]">
                      <div className="space-y-2">
                        {it.label && (
                          <div className={`text-xs font-extrabold uppercase tracking-widest ${isBlue ? 'text-blue-500/80' : 'text-primary/70'}`}>
                            {it.label}
                          </div>
                        )}
                        <div className="text-lg font-bold text-foreground leading-snug break-words">
                          {it.name || "-"}
                        </div>
                        {isAdmin && matchingRecipe && hasQty && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleItem(it.id, e)}
                            className={`h-7 px-3 gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg ${isBlue ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-primary bg-primary/8 hover:bg-primary/15'}`}
                          >
                            <Utensils className="h-3.5 w-3.5" />
                            રેસીપી
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle border-r border-border/30 text-center">
                      <span className="text-lg font-medium text-foreground break-words text-center block w-full">{it.value || "-"}</span>
                    </td>
                    <td className="p-4 align-middle border-r border-border/30 text-center">
                      {hasQty ? (
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-2xl font-extrabold text-foreground tracking-tight">{it.quantity}</span>
                          <span className="text-sm uppercase font-bold text-muted-foreground">{it.unit}</span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <div className="flex items-center gap-0 w-fit mx-auto bg-background rounded-lg border border-border/50 shadow-sm group focus-within:ring-1 focus-within:ring-primary/30 h-9 overflow-hidden">
                        <Input
                          type="number"
                          value={it.adjustment ?? ""}
                          onChange={(e) => updateItemField(selectedMeal, it.id, { adjustment: e.target.value })}
                          className="w-10 h-full border-none text-center font-bold text-sm p-0 focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                        />
                        <div className="flex flex-col border-l border-border/50 h-full">
                          <button
                            type="button"
                            className="flex-1 px-1.5 hover:bg-muted/50 flex items-center justify-center border-b border-border/30 text-muted-foreground hover:text-foreground transition-all active:bg-muted"
                            onClick={() => {
                              const current = parseInt(it.adjustment || "0", 10) || 0
                              updateItemField(selectedMeal, it.id, { adjustment: String(current + 1) })
                            }}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="flex-1 px-1.5 hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:bg-muted"
                            onClick={() => {
                              const current = parseInt(it.adjustment || "0", 10) || 0
                              updateItemField(selectedMeal, it.id, { adjustment: String(current - 1) })
                            }}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <select
                          value={it.adjustmentUnit || ""}
                          onChange={(e) => updateItemField(selectedMeal, it.id, { adjustmentUnit: e.target.value })}
                          className="h-full border-l border-border/50 bg-background px-1 text-[9px] font-bold focus:ring-0 focus:outline-none hover:bg-muted/30 transition-colors w-[52px] appearance-none text-center outline-none"
                        >
                          <option value="">-</option>
                          {["કુંડી", "ડોલ", "ટબ", "કેરેટ", "કેન", "બોક્સ"].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>

                  {isAdmin && matchingRecipe && hasQty && isExpanded && (
                    <tr className="bg-muted/10">
                      <td colSpan={4} className="p-0 border-b border-border/50">
                        <div className={`overflow-hidden rounded-b-lg border-x ${isBlue ? 'border-blue-100 bg-blue-50/30' : 'border-primary/10 bg-primary/5 shadow-inner'}`}>
                          <div className={`${isBlue ? 'bg-blue-100/50' : 'bg-primary/10'} px-4 py-2 flex items-center gap-2`}>
                            <Info className={`h-4 w-4 ${isBlue ? 'text-blue-600' : 'text-primary'}`} />
                            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                              પરિણામ: {it.quantity}{it.unit} માટે સામગ્રી
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 p-4">
                            {matchingRecipe.ingredients.map((ing) => {
                              const scalingFactor = it.quantity / (matchingRecipe.baseQuantity || 1)
                              const scaledAmount = ing.amount * scalingFactor
                              return (
                                <div key={ing.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0 md:[&:nth-last-child(-n+2)]:border-0 lg:[&:nth-last-child(-n+3)]:border-0">
                                  <span className="text-[12px] font-medium text-foreground">{ing.name}</span>
                                  <span className="text-[12px] font-bold text-primary">
                                    {scaledAmount % 1 === 0 ? scaledAmount : scaledAmount.toFixed(2)}
                                    {ing.unit}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {itemsToRender.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-muted-foreground italic text-sm">
                  આ સેક્શનમાં કોઈ આઈટમ નથી.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl font-bold">
              આજનું દૈનિક મેનુ
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-medium">
                  તમે સેવ કરેલ દૈનિક મેનુ અહીં જોઈ શકો છો.
                </p>
                {isLoading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>

              {isOffline && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold uppercase tracking-wider shadow-sm animate-pulse">
                  <CloudOff className="h-3 w-3" />
                  ઓફલાઇન કેશ જોઈ રહ્યા છો
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="w-full md:w-56">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={dayKey}
                  onChange={(e) => setDayKey(e.target.value)}
                  className="w-full h-10 bg-background border border-input rounded-md pl-10 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
              </div>
            </div>

            {menu && (
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-1">વાર</span>
                  <div className="flex h-10 items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-bold text-primary shadow-sm">
                    {menu.dayOfWeek || "-"}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-1">તિથિ</span>
                  <div className="flex h-10 items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-bold text-primary shadow-sm">
                    {menu.tithiMonth} {menu.tithiPhase} {menu.tithiDay}
                    {!menu.tithiMonth && menu.tithi}
                    {(!menu.tithiMonth && !menu.tithi) && "-"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {!menu ? (
        <section className="rounded-xl border border-border bg-card p-12 text-center">
          <Utensils className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-foreground mb-1">ડેટા મળ્યો નથી</h4>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
            આ તારીખ માટે દૈનિક મેનુ હજી સેવ નથી થયું. પહેલા એડમિન મેનુમાં જઈ વસ્તું સેવ કરો.
          </p>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex gap-2 p-1.5 bg-muted/50 rounded-2xl w-full border border-border/50 shadow-inner">
            {mealOrder.map((mt) => (
              <button
                key={mt}
                onClick={() => setSelectedMeal(mt)}
                className={`flex-1 rounded-xl px-4 py-3 text-base font-bold transition-all duration-200 ${selectedMeal === mt
                    ? "bg-white text-primary shadow-lg ring-1 ring-border/10 translate-y-[-2px]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  }`}
              >
                {TITLES[mt]}
              </button>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
            {/* Meal Metrics Header - INTERACTIVE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border bg-muted/5 border-b border-border">
              <div className="p-4 text-center space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">વી.આઇ.પી.</p>
                <Input
                  type="number"
                  value={menu.meals[selectedMeal].calories || "0"}
                  onChange={(e) => updateMetricField(selectedMeal, "calories", e.target.value)}
                  className="h-10 bg-transparent text-center text-xl font-bold border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="p-4 text-center space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">સ્ટાફ</p>
                <Input
                  type="number"
                  value={menu.meals[selectedMeal].categories || "0"}
                  onChange={(e) => updateMetricField(selectedMeal, "categories", e.target.value)}
                  className="h-10 bg-transparent text-center text-xl font-bold border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="p-4 text-center space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">મહેમાન</p>
                <Input
                  type="number"
                  value={menu.meals[selectedMeal].maximum || "0"}
                  onChange={(e) => updateMetricField(selectedMeal, "maximum", e.target.value)}
                  className="h-10 bg-transparent text-center text-xl font-bold border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="p-4 text-center space-y-1 bg-primary/[0.03]">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">કુલ</p>
                <Input
                  type="number"
                  value={menu.meals[selectedMeal].totalOverride || "0"}
                  onChange={(e) => updateMetricField(selectedMeal, "totalOverride", e.target.value)}
                  className="h-10 bg-transparent text-center text-2xl font-black text-primary border-none shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="p-6 md:p-8 bg-background/50">
              {(() => {
                const meal = menu.meals[selectedMeal]
                const items = meal.items
                const isMainMeal = (selectedMeal === "lunch" || selectedMeal === "dinner")

                if (isMainMeal) {
                  const thakorjiItems = items.filter(it => it.label?.includes("ઠાકોરજી"))
                  const generalItems = items.filter(it => !it.label?.includes("ઠાકોરજી"))

                  return (
                    <div className="space-y-12">
                      {renderTable(thakorjiItems, "ઠાકોરજી માટે", "orange")}
                      {renderTable(generalItems, "જેનરલ", "blue")}
                    </div>
                  )
                }
                return renderTable(items)
              })()}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
