"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronUp, Utensils } from "lucide-react"
import t from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getTodayKey,
  loadDayMenu,
  saveDayMenu,
  type DailyMenuState,
  type DailyMenuMeal,
  type DailyMenuItem,
  type MealType,
} from "@/lib/daily-menu-storage"
import type { Recipe } from "@/lib/types"

const TITLES: Record<MealType, string> = {
  breakfast: "નાસ્તો",
  lunch: "બપોરે ભોજન",
  dinner: "રાત્રી ભોજન",
}

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

export function TodayDailyMenu({ recipes = [] }: { recipes?: Recipe[] }) {
  const [dayKey, setDayKey] = useState<string>(getTodayKey())
  const [menu, setMenu] = useState<DailyMenuState | null>(null)
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast")
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const updateNoteValue = (itemId: string, mealType: string, newValue: string) => {
    if (!menu) return
    const nextMenu = { ...menu }
    const items = nextMenu.meals[mealType as MealType].items
    const item = items.find(i => i.id === itemId)
    if (item) {
      const { unit } = parseNote(item.note || "")
      item.note = formatNote(parseFloat(newValue || "0"), unit)
      setMenu(nextMenu)
      saveDayMenu(dayKey, nextMenu)
    }
  }

  const updateNoteUnit = (itemId: string, mealType: string, newUnit: string) => {
    if (!menu) return
    const nextMenu = { ...menu }
    const items = nextMenu.meals[mealType as MealType].items
    const item = items.find(i => i.id === itemId)
    if (item) {
      const { value } = parseNote(item.note || "")
      item.note = formatNote(value, newUnit)
      setMenu(nextMenu)
      saveDayMenu(dayKey, nextMenu)
    }
  }

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
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl">
              {t("today_menu")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("saved_menu_notice")}
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="w-full md:w-56">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("select_date")}
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
                          {t("day_of_week")}
                        </Label>
                    <div className="flex h-10 items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-semibold text-primary">
                      {menu.dayOfWeek}
                    </div>
                  </div>
                )}
                {(menu.tithi || (menu.tithiMonth && menu.tithiDay)) && (
                  <div className="col-span-1">
                    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {t("tithi")}
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

        {menu && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
            {mealOrder.map((m) => (
              <Button
                key={m}
                variant={activeMeal === m ? "default" : "outline"}
                onClick={() => setActiveMeal(m)}
                className={`w-full h-12 text-base font-bold rounded-xl transition-all ${
                  activeMeal === m
                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                    : "hover:bg-primary/5 active:scale-95"
                }`}
              >
                {TITLES[m]}
              </Button>
            ))}
          </div>
        )}
      </section>

      {!menu ? (
        <section className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            આ તારીખ માટે દૈનિક મેનુ સેવ નથી. પહેલા `દૈનિક મેનુ` tab માં સેવ કરો.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {mealOrder.filter(m => m === activeMeal).map((mealType) => {
              const meal = menu.meals[mealType]

              return (
                <div key={mealType} className="space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-serif text-2xl text-foreground flex items-center gap-3">
                      <Utensils className="h-5 w-5 text-primary" />
                      {TITLES[mealType]}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-muted-foreground font-medium">
                        VIP: <span className="text-foreground">{meal.calories || "-"}</span>
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        Staff: <span className="text-foreground">{meal.categories || "-"}</span>
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        Guest: <span className="text-foreground">{meal.maximum || "-"}</span>
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        Total: {meal.totalOverride || "0"}
                      </span>
                    </div>
                  </div>

                  {mealType === 'breakfast' ? (
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                            <tr>
                              <th className="p-3 font-medium text-left">વિગત / વાનગી</th>
                              <th className="p-3 font-medium text-left md:border-l md:border-border md:pl-3">વસ્તુનું નામ</th>
                              <th className="p-3 font-medium text-left w-[180px] md:border-l md:border-border md:pl-3">માપ</th>
                              <th className="p-3 font-medium text-left md:border-l md:border-border md:pl-3">વદ-ઘટ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {meal.items.map((it) => (
                              <tr key={it.id} className="hover:bg-muted/5 transition-colors">
                                <td className="p-3 align-top">
                                  <div className="font-semibold text-foreground text-base leading-tight">
                                    {it.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-0.5">{it.value}</div>
                                </td>
                                <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                                  <div className="text-sm">{it.itemName || "-"}</div>
                                </td>
                                <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                                  <div className="text-sm font-medium">
                                    {it.quantity > 0 ? `${it.quantity} ${it.unit}` : "-"}
                                  </div>
                                </td>
                                <td className="p-3 align-top md:border-l md:border-border md:pl-3">
                                  <div className="flex gap-1 items-center">
                                    <Input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="0"
                                      value={parseNote(it.note || "").value || ""}
                                      onChange={(e) => updateNoteValue(it.id, mealType, e.target.value)}
                                      className="h-9 w-16 bg-background px-1 text-center border-border/60"
                                    />
                                    <select
                                      value={parseNote(it.note || "").unit}
                                      onChange={(e) => updateNoteUnit(it.id, mealType, e.target.value)}
                                      className="h-9 flex-1 rounded-md border border-border/60 bg-background px-1 text-xs"
                                    >
                                      {VAD_GHAT_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt || "-"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-8">
                      {/* Thakorji Table */}
                      <div className="rounded-xl border border-orange-200 bg-orange-50/20 shadow-sm overflow-hidden dark:border-orange-900/30">
                        <div className="bg-orange-100/50 px-4 py-2 border-b border-orange-200 dark:bg-orange-900/30 dark:border-orange-900/50">
                          <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wider">ઠાકોરજી માટે</h4>
                        </div>
                        <div className="overflow-x-auto bg-background/50">
                          <table className="w-full text-sm">
                            <thead className="bg-orange-50/50 text-orange-800/70 border-b border-orange-100 dark:bg-orange-900/20 dark:text-orange-300">
                              <tr>
                                <th className="p-3 font-medium text-left">વિગત / વાનગી</th>
                                <th className="p-3 font-medium text-left md:border-l md:border-orange-100/50 md:pl-3">વસ્તુનું નામ</th>
                                <th className="p-3 font-medium text-left w-[180px] md:border-l md:border-orange-100/50 md:pl-3">માપ</th>
                                <th className="p-3 font-medium text-left md:border-l md:border-orange-100/50 md:pl-3">વદ-ઘટ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100 dark:divide-orange-900/30">
                              {meal.items.filter(it => it.name.startsWith("ઠાકોરજી")).map((it) => (
                                <tr key={it.id} className="hover:bg-orange-50/30 transition-colors">
                                  <td className="p-3 align-top">
                                    <div className="font-semibold text-foreground text-base leading-tight">
                                      {it.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-0.5">{it.value}</div>
                                  </td>
                                  <td className="p-3 align-top md:border-l md:border-orange-100/50 md:pl-3">
                                    <div className="text-sm">{it.itemName || "-"}</div>
                                  </td>
                                  <td className="p-3 align-top md:border-l md:border-orange-100/50 md:pl-3">
                                    <div className="text-sm font-medium">
                                      {it.quantity > 0 ? `${it.quantity} ${it.unit}` : "-"}
                                    </div>
                                  </td>
                                  <td className="p-3 align-top md:border-l md:border-orange-100/50 md:pl-3">
                                    <div className="flex gap-1 items-center">
                                      <Input
                                        type="number"
                                        step="any"
                                        min="0"
                                        placeholder="0"
                                        value={parseNote(it.note || "").value || ""}
                                        onChange={(e) => updateNoteValue(it.id, mealType, e.target.value)}
                                        className="h-9 w-16 bg-background px-1 text-center border-orange-200/60"
                                      />
                                      <select
                                        value={parseNote(it.note || "").unit}
                                        onChange={(e) => updateNoteUnit(it.id, mealType, e.target.value)}
                                        className="h-9 flex-1 rounded-md border border-orange-200/60 bg-background px-1 text-xs"
                                      >
                                        {VAD_GHAT_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt || "-"}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* General Table */}
                      <div className="rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm overflow-hidden dark:border-blue-900/30">
                        <div className="bg-blue-100/50 px-4 py-2 border-b border-blue-200 dark:bg-blue-900/30 dark:border-blue-900/50">
                          <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">જનરલ</h4>
                        </div>
                        <div className="overflow-x-auto bg-background/50">
                          <table className="w-full text-sm">
                            <thead className="bg-blue-50/50 text-blue-800/70 border-b border-blue-100 dark:bg-blue-900/20 dark:text-blue-300">
                              <tr>
                                <th className="p-3 font-medium text-left">વિગત / વાનગી</th>
                                <th className="p-3 font-medium text-left md:border-l md:border-blue-100/50 md:pl-3">વસ્તુનું નામ</th>
                                <th className="p-3 font-medium text-left w-[180px] md:border-l md:border-blue-100/50 md:pl-3">માપ</th>
                                <th className="p-3 font-medium text-left md:border-l md:border-blue-100/50 md:pl-3">વદ-ઘટ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100 dark:divide-blue-900/30">
                              {meal.items.filter(it => !it.name.startsWith("ઠાકોરજી")).map((it) => (
                                <tr key={it.id} className="hover:bg-blue-50/30 transition-colors">
                                  <td className="p-3 align-top">
                                    <div className="font-semibold text-foreground text-base leading-tight">
                                      {it.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-0.5">{it.value}</div>
                                  </td>
                                  <td className="p-3 align-top md:border-l md:border-blue-100/50 md:pl-3">
                                    <div className="text-sm">{it.itemName || "-"}</div>
                                  </td>
                                  <td className="p-3 align-top md:border-l md:border-blue-100/50 md:pl-3">
                                    <div className="text-sm font-medium">
                                      {it.quantity > 0 ? `${it.quantity} ${it.unit}` : "-"}
                                    </div>
                                  </td>
                                  <td className="p-3 align-top md:border-l md:border-blue-100/50 md:pl-3">
                                    <div className="flex gap-1 items-center">
                                      <Input
                                        type="number"
                                        step="any"
                                        min="0"
                                        placeholder="0"
                                        value={parseNote(it.note || "").value || ""}
                                        onChange={(e) => updateNoteValue(it.id, mealType, e.target.value)}
                                        className="h-9 w-16 bg-background px-1 text-center border-blue-200/60"
                                      />
                                      <select
                                        value={parseNote(it.note || "").unit}
                                        onChange={(e) => updateNoteUnit(it.id, mealType, e.target.value)}
                                        className="h-9 flex-1 rounded-md border border-blue-200/60 bg-background px-1 text-xs"
                                      >
                                        {VAD_GHAT_OPTIONS.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt || "-"}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                </tr>
                              ))}
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
        </div>
      )}
    </div>
  )
}

