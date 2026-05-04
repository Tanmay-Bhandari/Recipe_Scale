"use client"

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react"
import { CalendarDays, ChevronDown, ChevronUp, Utensils, Info, CloudOff, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getTodayKey,
  loadDayMenuFromFirestore,
  saveDayMenuToFirestore,
  type DailyMenuState,
  type MealType,
  type DailyMenuItem,
  type DailyMenuMeal,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef<{ dayKey: string; menu: DailyMenuState } | null>(null)

  const mealOrder: MealType[] = useMemo(() => ["breakfast", "lunch", "dinner"], [])
  const [selectedMeal, setSelectedMeal] = useState<MealType>(mealOrder[0])

  const toggleItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const refresh = async (targetDay: string) => {
    setIsLoading(true)
    setErrorMsg(null)
    setIsOffline(false)
    try {
      const data = await loadDayMenuFromFirestore(targetDay)
      if (data) {
        setMenu(data)
      } else {
        setMenu(null)
      }
    } catch (err: any) {
      console.error("Refresh failed:", err)
      setErrorMsg(err.message || "Cloud sync error")
      if (err.message?.includes('offline') || err.code === 'unavailable') {
        setIsOffline(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced save — waits 600ms after last change before persisting to Firestore
  const scheduleSave = useCallback((targetDayKey: string, updatedMenu: DailyMenuState) => {
    pendingSaveRef.current = { dayKey: targetDayKey, menu: updatedMenu }
    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const snapshot = pendingSaveRef.current
      if (!snapshot) return
      try {
        await saveDayMenuToFirestore(snapshot.dayKey, snapshot.menu)
        setSaveStatus('saved')
        // Auto-clear "saved" message after 3s
        setTimeout(() => setSaveStatus('idle'), 3000)
      } catch (err) {
        console.error("Debounced save failed:", err)
        setSaveStatus('error')
      }
    }, 600)
  }, [])

  async function updateItemField(mealType: MealType, itemId: string, fieldUpdates: Partial<DailyMenuItem>) {
    if (!menu) return

    const updatedMenu = {
      ...menu,
      meals: {
        ...(menu.meals || {}),
        [mealType]: {
          ...(menu.meals?.[mealType] || ({} as any)),
          items: (menu.meals?.[mealType]?.items || []).map(i =>
            i.id === itemId ? { ...i, ...fieldUpdates } : i
          ),
        },
      },
    }
    setMenu(updatedMenu)
    scheduleSave(dayKey, updatedMenu)
  }

  function updateMetricField(mealType: MealType, field: keyof DailyMenuMeal, newValue: string) {
    if (!menu) return

    const meal = { ...(menu.meals?.[mealType] || ({} as any)) }
    const numValue = parseInt(newValue, 10) || 0
    if (field !== 'items' && field !== 'categories') {
      (meal as any)[field] = numValue
    } else if (field === 'categories') {
      meal[field] = newValue
    }

    if (field !== 'totalOverride') {
      const vip = Number(meal.vip) || 0
      const staff = Number(meal.staff) || 0
      const guest = Number(meal.guest) || 0
      const aaj = Number(meal.ajeevan) || 0
      const chhat = Number(meal.chhatralaya) || 0
      const yuvati = Number(meal.yuvati) || 0
      meal.totalOverride = vip + staff + guest + aaj + chhat + yuvati
    }

    const updatedMenu = { ...menu, meals: { ...(menu.meals || {}), [mealType]: meal } }
    setMenu(updatedMenu)
    scheduleSave(dayKey, updatedMenu)
  }

  useEffect(() => {
    refresh(dayKey)
    // Clear any pending saves when day changes
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [dayKey])

  const handleDownloadPDF = async () => {
    if (!menu) return
    setIsGeneratingPDF(true)

    const newWin = window.open('', '_blank')
    if (!newWin) {
      setIsGeneratingPDF(false)
      return
    }

    const style = `
      body{font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:40px;color:#0f172a;line-height:1.5}
      h1,h2,h3,h4{color:#0f172a;margin-top:0}
      .page-break{break-after:page}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:2px solid #f1f5f9;padding-bottom:20px}
      .date-info{font-size:18px;font-weight:bold}
      .tithi-info{font-size:14px;color:#64748b;margin-top:4px}
      .metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:30px;background:#f8fafc;padding:20px;border-radius:12px;border:1px solid #e2e8f0}
      .metric-box{text-align:center;padding:12px;background:white;border-radius:8px;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(0,0,0,0.05)}
      .metric-label{font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase;margin-bottom:4px}
      .metric-value{font-size:24px;font-weight:900;color:#0f172a}
      .metric-total{grid-column:span 1;display:flex;flex-direction:column;justify-content:center;background:#0f172a;color:white;border:none}
      .metric-total .metric-label{color:rgba(255,255,255,0.7)}
      .metric-total .metric-value{color:white;font-size:32px}
      .meal-title{font-size:28px;font-weight:900;margin-bottom:20px;color:#0f172a;display:flex;align-items:center;gap:12px}
      .meal-dot{width:12px;height:12px;border-radius:50%;background:#0f172a}
      .table-container{margin-bottom:30px}
      .table-header{font-size:18px;font-weight:800;margin-bottom:12px;padding-left:12px;border-left:4px solid #0f172a}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th,td{border:1px solid #e2e8f0;padding:12px;text-align:left}
      th{background:#f8fafc;color:#64748b;font-size:12px;font-weight:bold;text-transform:uppercase;text-align:center}
      .dish-cell{width:25%;font-weight:bold}
      .item-cell{width:40%;color:#0f172a;white-space:pre-wrap}
      .qty-cell{width:15%;text-align:center;font-weight:900;font-size:18px}
      .adj-cell{width:20%;text-align:center}
      .no-items{text-align:center;padding:40px;color:#64748b;font-style:italic}
    `

    const TITLES: Record<string, string> = { breakfast: "નાસ્તો", lunch: "બપોરે ભોજન", dinner: "રાત્રી ભોજન" }

    const generateMealHtml = (mealType: MealType, index: number) => {
      const meal = menu.meals?.[mealType] || ({} as any)
      const items = meal?.items || []
      const isMainMeal = true // We want all to show split if they have items
      
      const thakorjiItems = items.filter(it => it.label?.includes("ઠાકોરજી"))
      const generalItems = items.filter(it => !it.label?.includes("ઠાકોરજી"))

      const renderTableHtml = (itemsList: DailyMenuItem[], title: string) => {
        if (itemsList.length === 0) return ""
        return `
          <div class="table-container">
            <h4 class="table-header">${title}</h4>
            <table>
              <thead>
                <tr>
                  <th>વાનગી</th>
                  <th>વસ્તુ નામ</th>
                  <th>માપ</th>
                  <th>વદ-ઘટ</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList.map(it => `
                  <tr>
                    <td class="dish-cell">
                      ${it.label ? `<div style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.01em">${it.label}</div>` : ""}
                      <div style="font-size:12px">${it.name || "-"}</div>
                    </td>
                    <td class="item-cell">${it.value || "-"}</td>
                    <td class="qty-cell">${it.quantity ? `${it.quantity}${it.unit}` : "-"}</td>
                    <td class="adj-cell">${it.adjustment || "-"} ${it.adjustmentUnit || ""}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `
      }

      return `
        <div class="${index < 2 ? 'page-break' : ''}">
          <div class="header">
            <div>
              <div class="date-info">${dayKey} — ${menu.dayOfWeek}</div>
              <div class="tithi-info">${menu.tithiMonth} ${menu.tithiPhase} ${menu.tithiDay} ${!menu.tithiMonth && menu.tithi ? menu.tithi : ""}</div>
            </div>
            <div style="font-size:24px;font-weight:900;color:#0f172a">દૈનિક મેનુ</div>
          </div>

          <h3 class="meal-title"><span class="meal-dot"></span>${TITLES[mealType]}</h3>

          <div class="metrics-grid">
            <div class="metric-box"><div class="metric-label">આજીવન</div><div class="metric-value">${meal.ajeevan || 0}</div></div>
            <div class="metric-box"><div class="metric-label">વી.આઇ.પી.</div><div class="metric-value">${meal.vip || 0}</div></div>
            <div class="metric-box"><div class="metric-label">છાત્રાલય</div><div class="metric-value">${meal.chhatralaya || 0}</div></div>
            <div class="metric-total"><div class="metric-label">કુલ</div><div class="metric-value">${meal.totalOverride || 0}</div></div>
            <div class="metric-box"><div class="metric-label">સ્ટાફ</div><div class="metric-value">${meal.staff || 0}</div></div>
            <div class="metric-box"><div class="metric-label">મહેમાન</div><div class="metric-value">${meal.guest || 0}</div></div>
            <div class="metric-box"><div class="metric-label">યુવતી</div><div class="metric-value">${meal.yuvati || 0}</div></div>
          </div>

          ${thakorjiItems.length > 0 ? renderTableHtml(thakorjiItems, "ઠાકોરજી માટે") : ""}
          ${generalItems.length > 0 ? renderTableHtml(generalItems, "જનરલ") : ""}
          ${items.length === 0 ? '<div class="no-items">કોઈ આઈટમ સેવ કરેલી નથી.</div>' : ""}
        </div>
      `
    }

    const doc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>દૈનિક મેનુ — ${dayKey}</title>
          <style>${style}</style>
        </head>
        <body>
          ${generateMealHtml("breakfast", 0)}
          ${generateMealHtml("lunch", 1)}
          ${generateMealHtml("dinner", 2)}
          <script>
            setTimeout(() => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }, 500);
          </script>
        </body>
      </html>
    `

    newWin.document.open()
    newWin.document.write(doc)
    newWin.document.close()
    setIsGeneratingPDF(false)
  }

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
              const hasQty = Number.isFinite(it.quantity) && it.quantity > 0
              const recipeName = (it.name || "").trim()
              const matchingRecipe = recipeName
                ? recipes.find(r => r.name.toLowerCase() === recipeName.toLowerCase())
                : undefined
              const isExpanded = expandedItems[it.id]

              return (
                <Fragment key={it.id}>
                  <tr className={`group ${isBlue ? 'hover:bg-blue-50/5' : 'hover:bg-muted/5'} transition-colors`}>
                    <td className="p-4 align-top border-r border-border/30 bg-muted/5 min-h-[60px]">
                      <div className="space-y-2">
                        {it.label && (
                          <div className={`text-base font-extrabold uppercase tracking-tight mb-0.5 ${isBlue ? 'text-blue-600' : 'text-primary'}`}>
                            {it.label}
                          </div>
                        )}
                        <div className="text-lg font-bold text-foreground leading-snug break-words whitespace-pre-wrap">
                          {it.name || "-"}
                        </div>
                        {matchingRecipe && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleItem(it.id, e)}
                            className={`h-7 px-3 gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border ${isBlue ? 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100' : 'text-primary bg-primary/8 border-primary/10 hover:bg-primary/15'}`}
                          >
                            <Utensils className="h-3.5 w-3.5" />
                            રેસીપી
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle border-r border-border/30 text-center">
                      <span className="text-lg font-medium text-foreground break-words text-center block w-full whitespace-pre-wrap">{it.value || "-"}</span>
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

                  {matchingRecipe && isExpanded && (
                    <tr className="bg-muted/10">
                      <td colSpan={4} className="p-0 border-b border-border/50">
                        <div className={`overflow-hidden rounded-b-lg border-x ${isBlue ? 'border-blue-100 bg-blue-50/30' : 'border-primary/10 bg-primary/5 shadow-inner'}`}>
                          <div className={`${isBlue ? 'bg-blue-100/50' : 'bg-primary/10'} px-4 py-3 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                              <Info className={`h-4 w-4 ${isBlue ? 'text-blue-600' : 'text-primary'}`} />
                              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                                {!isAdmin ? "રેસીપી વિગતો" : `પરિણામ: ${it.quantity}${it.unit} માટે સામગ્રી`}
                              </p>
                            </div>
                            {!hasQty && isAdmin && (
                              <p className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">માપ દાખલ કરો</p>
                            )}
                          </div>
                          
                          {isAdmin ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 p-4">
                              {matchingRecipe.ingredients.map((ing) => {
                                // If quantity is 0 or missing, show base amounts (as if qty=1kg or 1pc) but with a note
                                const scalingFactor = hasQty ? (it.quantity / (matchingRecipe.baseQuantity || 1)) : 0
                                const scaledAmount = hasQty ? (ing.amount * scalingFactor) : ing.amount
                                
                                return (
                                  <div key={ing.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0 md:[&:nth-last-child(-n+2)]:border-0 lg:[&:nth-last-child(-n+3)]:border-0">
                                    <span className="text-[12px] font-medium text-foreground">{ing.name}</span>
                                    <span className={`text-[12px] font-bold ${hasQty ? 'text-primary' : 'text-muted-foreground italic'}`}>
                                      {scaledAmount % 1 === 0 ? scaledAmount : scaledAmount.toFixed(2)}
                                      {ing.unit}
                                      {!hasQty && ` (Base)`}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="p-8 text-center bg-background/50">
                              <p className="text-sm font-bold text-muted-foreground">
                                આ રેસીપી જોવા માટે કૃપા કરીને એડમિન તરીકે લોગીન કરો.
                              </p>
                            </div>
                          )}
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
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 font-bold bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF || !menu}
                  >
                    <Package className={`h-4 w-4 ${isGeneratingPDF ? 'animate-spin' : ''}`} />
                    {isGeneratingPDF ? "PDF બની રહ્યું છે..." : "PDF ડાઉનલોડ કરો"}
                  </Button>
                </div>
                {isLoading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                {/* Debounced save status */}
                {saveStatus === 'saving' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <div className="h-2 w-2 animate-spin rounded-full border border-amber-500 border-t-transparent" />
                    સેવ થઈ રહ્યું છે...
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    ✅ સેવ સફળ
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    ⚠️ સેવ નિષ્ફળ
                  </div>
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

      {errorMsg ? (
        <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center animate-in fade-in duration-500">
          <Info className="h-10 w-10 text-destructive/40 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-destructive mb-1">કનેક્શન નિષ્ફળ</h4>
          <p className="text-sm text-destructive/80 max-w-sm mx-auto font-medium whitespace-pre-wrap mb-4">
            ડેટાબેઝ સાથે કનેક્ટ થવામાં સમસ્યા આવી રહી છે. (Error: {errorMsg})
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => refresh(dayKey)}
          >
            ફરી પ્રયત્ન કરો (Retry)
          </Button>
        </section>
      ) : !menu ? (
        <section className="rounded-xl border border-border bg-card p-12 text-center animate-in fade-in duration-500">
          <Utensils className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-foreground mb-1">ડેટા મળ્યો નથી</h4>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
            આ તારીખ માટે દૈનિક મેનુ હજી સેવ નથી થયું. પહેલા એડમિન મેનુમાં જઈ વસ્તુ સેવ કરો.
          </p>
        </section>
      ) : (
        <section className="space-y-6 animate-in fade-in duration-500">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border bg-muted/5 border-b border-border">
              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">આજીવન</p>
                <Input
                  type="number"
                  value={menu?.meals?.[selectedMeal]?.ajeevan ?? ""}
                  onChange={(e) => updateMetricField(selectedMeal, "ajeevan", e.target.value)}
                  className="h-12 bg-transparent text-center text-3xl font-black border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">વી.આઇ.પી.</p>
                <Input
                  type="number"
                  value={menu?.meals?.[selectedMeal]?.vip ?? ""}
                  onChange={(e) => updateMetricField(selectedMeal, "vip", e.target.value)}
                  className="h-12 bg-transparent text-center text-3xl font-black border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">છાત્રાલય</p>
                <Input
                  type="number"
                  value={menu?.meals?.[selectedMeal]?.chhatralaya ?? ""}
                  onChange={(e) => updateMetricField(selectedMeal, "chhatralaya", e.target.value)}
                  className="h-12 bg-transparent text-center text-3xl font-black border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="row-span-2 p-5 text-center flex flex-col justify-center items-center bg-primary/[0.05]">
                <p className="text-sm font-black uppercase tracking-widest text-primary mb-3">કુલ</p>
                <Input
                  type="number"
                  value={menu?.meals?.[selectedMeal]?.totalOverride ?? ""}
                  onChange={(e) => updateMetricField(selectedMeal, "totalOverride", e.target.value)}
                  className="h-20 bg-transparent text-center text-6xl font-black text-primary border-none shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">સ્ટાફ</p>
                <Input
                  type="number"
                  value={menu?.meals?.[selectedMeal]?.staff ?? ""}
                  onChange={(e) => updateMetricField(selectedMeal, "staff", e.target.value)}
                  className="h-12 bg-transparent text-center text-3xl font-black border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">મહેમાન</p>
                <Input
                  type="number"
                  value={menu?.meals?.[selectedMeal]?.guest ?? ""}
                  onChange={(e) => updateMetricField(selectedMeal, "guest", e.target.value)}
                  className="h-12 bg-transparent text-center text-3xl font-black border-none shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">યુવતી</p>
                <Input
                  type="number"
                  value={menu?.meals?.[selectedMeal]?.yuvati ?? ""}
                  onChange={(e) => updateMetricField(selectedMeal, "yuvati", e.target.value)}
                  className="h-12 bg-transparent text-center text-3xl font-black border-none shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="p-6 md:p-8 bg-background/50">
              {(() => {
                const meal = menu.meals?.[selectedMeal] || ({} as any)
                const items = meal?.items || []
                const isMainMeal = (selectedMeal === "breakfast" || selectedMeal === "lunch" || selectedMeal === "dinner")

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

export default TodayDailyMenu;
