"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronUp, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getTodayKey,
  loadDayMenu,
  type DailyMenuState,
  type MealType,
} from "@/lib/daily-menu-storage"
import type { Recipe } from "@/lib/types"

const TITLES: Record<MealType, string> = {
  breakfast: "નાસ્તો",
  lunch: "બપોરે ભોજન",
  dinner: "રાત્રી ભોજન",
}

export function TodayDailyMenu({ recipes = [] }: { recipes?: Recipe[] }) {
  const [dayKey, setDayKey] = useState<string>(getTodayKey())
  const [menu, setMenu] = useState<DailyMenuState | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function refresh(targetDay: string) {
    setMenu(loadDayMenu(targetDay))
  }

  useEffect(() => {
    refresh(dayKey)
    const onSaved = () => refresh(dayKey)
    window.addEventListener("dailyMenuSaved", onSaved)
    return () => window.removeEventListener("dailyMenuSaved", onSaved)
  }, [dayKey])

  const mealOrder: MealType[] = useMemo(() => ["breakfast", "lunch", "dinner"], [])

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl">
              આજનું દૈનિક મેનુ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              દૈનિક મેનુમાં સેવ કરેલ દિવસની માહિતી અહીં દેખાશે.
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="w-full md:w-56">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                તારીખ પસંદ કરો
              </Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={dayKey}
                  onChange={(e) => setDayKey(e.target.value)}
                  className="bg-background pl-9"
                />
              </div>
            </div>

            {menu && (
              <div className="grid grid-cols-2 gap-4 w-full">
                {menu.dayOfWeek && (
                  <div className="col-span-1">
                    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      વાર
                    </Label>
                    <div className="flex h-10 items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-semibold text-primary">
                      {menu.dayOfWeek}
                    </div>
                  </div>
                )}
                {(menu.tithi || (menu.tithiMonth && menu.tithiDay)) && (
                  <div className="col-span-1">
                    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      તિથિ
                    </Label>
                    <div className="flex h-10 items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-semibold text-primary">
                      {menu.tithiMonth} {menu.tithiPhase} {menu.tithiDay}
                      {!menu.tithiMonth && menu.tithi}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {!menu ? (
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            આ તારીખ માટે દૈનિક મેનુ સેવ નથી. પહેલા `દૈનિક મેનુ` tab માં સેવ કરો.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {mealOrder.map((mealType) => {
            const meal = menu.meals[mealType]
            return (
              <div key={mealType} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="font-serif text-lg text-foreground">{TITLES[mealType]}</h3>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    વી.આઇ.પી.: {meal.calories || "-"}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    સ્ટાર્ચ: {meal.categories || "-"}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    મહેમાન: {meal.maximum || "-"}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    કુલ: {meal.totalOverride || "0"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 grid-cols-1 md:grid-cols-2 items-start">
                  {meal.items.map((it) => {
                    const isBreakfast = mealType === 'breakfast'
                    const typedName = (isBreakfast ? "" : it.value?.trim()) ?? ""
                    const hasQty = Number.isFinite(it.quantity) && it.quantity > 0
                    
                    // Match with recipe
                    const matchingRecipe = recipes.find(r => 
                      r.name.toLowerCase() === (isBreakfast ? it.name : typedName).toLowerCase()
                    )
                    const isExpanded = expandedItems[it.id]

                    return (
                      <div key={it.id} className="rounded-lg border border-border bg-background/60 p-3 h-auto">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                             <p className="text-sm font-bold text-foreground break-all leading-tight">
                               {it.name}
                             </p>
                             {(() => {
                               if (!typedName && !hasQty) return null

                               return (
                                 <div className="mt-1 space-y-0.5">
                                   {typedName && (
                                     <p className="text-xs text-muted-foreground break-all italic leading-relaxed">
                                       {typedName}
                                     </p>
                                   )}
                                   {hasQty && (
                                     <p className="text-[10px] font-bold text-primary/80">
                                       {it.quantity}{it.unit}
                                     </p>
                                   )}
                                 </div>
                               )
                             })()}
                          </div>

                          {matchingRecipe && hasQty && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleItem(it.id)}
                              className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/5"
                            >
                              <Utensils className="h-3.5 w-3.5" />
                              Recipes
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>

                        {matchingRecipe && hasQty && isExpanded && (
                          <div className="mt-3 overflow-hidden rounded-md border border-primary/10 bg-primary/5">
                            <div className="bg-primary/10 px-3 py-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                Scaled Ingredients for {it.quantity}{it.unit}
                              </p>
                            </div>
                            <div className="divide-y divide-primary/5 px-3 py-1">
                              {matchingRecipe.ingredients.map((ing) => {
                                const scalingFactor = it.quantity / (matchingRecipe.baseQuantity || 1)
                                const scaledAmount = ing.amount * scalingFactor
                                return (
                                  <div key={ing.id} className="flex items-center justify-between py-1.5">
                                    <span className="text-[11px] font-medium text-foreground">{ing.name}</span>
                                    <span className="text-[11px] font-bold text-primary">
                                      {scaledAmount % 1 === 0 ? scaledAmount : scaledAmount.toFixed(2)}
                                      {ing.unit}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

