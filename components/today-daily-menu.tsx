"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getTodayKey,
  loadDayMenu,
  type DailyMenuState,
  type MealType,
} from "@/lib/daily-menu-storage"

const TITLES: Record<MealType, string> = {
  breakfast: "નાસ્તો",
  lunch: "બપોરે ભોજન",
  dinner: "રાત્રી ભોજન",
}

export function TodayDailyMenu() {
  const [dayKey, setDayKey] = useState<string>(getTodayKey())
  const [menu, setMenu] = useState<DailyMenuState | null>(null)

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
          <div className="w-full md:w-64">
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
            const meal = menu[mealType]
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

                <div className="mt-4 grid gap-3 grid-cols-1 md:grid-cols-2">
                  {meal.items.map((it) => (
                    <div key={it.id} className="rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-sm font-semibold text-foreground">{it.name}</p>
                      {(() => {
                        const typedName = it.value?.trim() ?? ""
                        const hasQty = Number.isFinite(it.quantity) && it.quantity > 0
                        if (!typedName && !hasQty) return null

                        if (typedName && hasQty) {
                          return (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {typedName} {" - "} {it.quantity}
                              {it.unit}
                            </p>
                          )
                        }

                        if (typedName) {
                          return <p className="mt-1 text-xs text-muted-foreground">{typedName}</p>
                        }

                        return (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {it.quantity}
                            {it.unit}
                          </p>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

