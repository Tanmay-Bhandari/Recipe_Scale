"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Package,
  Trash2,
  Calculator,
  ChevronDown,
  ArrowRight,
  Search,
  Check,
  X,
} from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatSmart, convert, unitsFor } from "@/lib/unit-converter"
import type { Recipe, PacketRecipeItem, AggregatedIngredient } from "@/lib/types"

interface FoodPacketCalculatorProps {
  recipes: Recipe[]
}

export function FoodPacketCalculator({ recipes }: FoodPacketCalculatorProps) {
  const STORAGE_KEY = "food-packet-state-v1"

  const [packetItems, setPacketItems] = useState<PacketRecipeItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed.packetItems) ? parsed.packetItems : []
    } catch (e) {
      return []
    }
  })

  const [packetCount, setPacketCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return 1
      const parsed = JSON.parse(raw)
      return typeof parsed.packetCount === "number" ? parsed.packetCount : 1
    } catch (e) {
      return 1
    }
  })

  const [showResults, setShowResults] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return !!parsed.showResults
    } catch (e) {
      return false
    }
  })
  const [recipeSearch, setRecipeSearch] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const availableRecipes = recipes.filter(
    (r) => !packetItems.find((item) => item.recipeId === r.id)
  )

  const filteredAvailable = useMemo(() => {
    if (!recipeSearch.trim()) return availableRecipes
    const q = recipeSearch.toLowerCase()
    return availableRecipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [availableRecipes, recipeSearch])

  function addRecipeToPacket(recipeId: string) {
    if (packetItems.find((item) => item.recipeId === recipeId)) return
    const recipe = recipes.find((r) => r.id === recipeId)
    const unit = recipe ? recipe.baseUnit : undefined
    // store quantity in the recipe's base unit (quantity = 1 by default)
    setPacketItems((prev) => [...prev, { recipeId, quantity: 1, unit }])
    setShowResults(false)
    setRecipeSearch("")
    setDropdownOpen(false)
  }

  function removeRecipeFromPacket(recipeId: string) {
    setPacketItems((prev) => prev.filter((item) => item.recipeId !== recipeId))
    setShowResults(false)
  }

  function updateItemQuantity(recipeId: string, quantity: number) {
    setPacketItems((prev) =>
      prev.map((item) =>
        item.recipeId === recipeId ? { ...item, quantity } : item
      )
    )
    setShowResults(false)
  }

  function updateItemUnit(recipeId: string, unit: string) {
    setPacketItems((prev) =>
      prev.map((item) =>
        item.recipeId === recipeId ? { ...item, unit } : item
      )
    )
    setShowResults(false)
  }

  const aggregatedIngredients = useMemo<AggregatedIngredient[]>(() => {
    // Combine ingredients by name (case-insensitive) and convert differing units into
    // a canonical unit for that ingredient family before summing.
    const map = new Map<string, AggregatedIngredient>()

    for (const item of packetItems) {
      const recipe = recipes.find((r) => r.id === item.recipeId)
      if (!recipe) continue

      const scaleFactor = item.quantity / recipe.baseQuantity
      const yieldScaleFactor = recipe.packetYield ? (packetCount / recipe.packetYield) : null

      for (const ing of recipe.ingredients) {
        const nameKey = ing.name.toLowerCase()
        const rawAmount = yieldScaleFactor 
          ? ing.amount * yieldScaleFactor 
          : ing.amount * scaleFactor * packetCount

        // choose a canonical unit for this ingredient's family (smallest unit available)
        const familyUnits = unitsFor(ing.unit)
        const canonicalUnit = familyUnits[0] || ing.unit

        // convert the amount into the canonical unit before aggregating
        const amountInCanonical = convert(rawAmount, ing.unit, canonicalUnit)

        if (map.has(nameKey)) {
          const existing = map.get(nameKey)!
          // if existing unit differs from canonical (shouldn't), convert existing total
          if (existing.unit !== canonicalUnit) {
            // convert existing total to canonical then update stored unit
            const convertedExisting = convert(existing.totalAmount, existing.unit, canonicalUnit)
            existing.totalAmount = convertedExisting + amountInCanonical
            existing.unit = canonicalUnit
            existing.breakdown.push({ recipeName: recipe.name, amount: amountInCanonical })
          } else {
            existing.totalAmount += amountInCanonical
            existing.breakdown.push({ recipeName: recipe.name, amount: amountInCanonical })
          }
        } else {
          map.set(nameKey, {
            name: ing.name,
            unit: canonicalUnit,
            totalAmount: amountInCanonical,
            breakdown: [
              { recipeName: recipe.name, amount: amountInCanonical },
            ],
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [packetItems, recipes, packetCount])

  const recipeBreakdowns = useMemo(() => {
    return packetItems
      .map((item) => {
        const recipe = recipes.find((r) => r.id === item.recipeId)
        if (!recipe) return null
        const scaleFactor = item.quantity / recipe.baseQuantity
        const yieldScaleFactor = recipe.packetYield ? (packetCount / recipe.packetYield) : null

        return {
          recipe,
          perPacketQuantity: item.quantity,
          totalQuantity: item.quantity * packetCount,
          scaleFactor,
          yieldScaleFactor,
          ingredients: recipe.ingredients.map((ing) => ({
            ...ing,
            perPacket: ing.amount * scaleFactor,
            total: ing.amount * scaleFactor * packetCount,
            totalByYield: yieldScaleFactor ? (ing.amount * yieldScaleFactor) : null,
          })),
        }
      })
      .filter(Boolean)
  }, [packetItems, recipes, packetCount])

  const canCalculate = packetItems.length > 0 && packetCount > 0

  // Persist packet state so switching tabs doesn't reset it
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ packetItems, packetCount, showResults })
      )
    } catch (e) {
      // ignore
    }
  }, [packetItems, packetCount, showResults])

  function formatPerPacket(amount: number, unit: string) {
    let currentAmount = amount;
    let currentUnit = unit;

    if (currentUnit === 'kg' && currentAmount < 1) {
      currentAmount = convert(currentAmount, 'kg', 'g');
      currentUnit = 'g';
    } else if (currentUnit === 'L' && currentAmount < 1) {
      currentAmount = convert(currentAmount, 'L', 'ml');
      currentUnit = 'ml';
    } else if (currentUnit === 'lb' && currentAmount < 1) {
      currentAmount = convert(currentAmount, 'lb', 'oz');
      currentUnit = 'oz';
    } else if (currentUnit === 'tbsp' && currentAmount < 1) {
      currentAmount = convert(currentAmount, 'tbsp', 'tsp');
      currentUnit = 'tsp';
    }

    return formatSmart(currentAmount, currentUnit);
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-serif text-lg text-foreground">
          કોઈ રેસીપી ઉપલબ્ધ નથી
        </h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          પહેલા રેસીપી ટેબમાં જઈ રેસીપી ઉમેરો, પછી ફૂડ પેકેટ બનાવવા અહીં આવો.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select recipes for packet */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-bold text-primary">1</span>
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground">
              તમારું ફૂડ પેકેટ બનાવો
            </h3>
            <p className="text-sm text-muted-foreground">
              વાનગી શોધો અને આખી પેકેટમાં કેટલી આઈટમ રાખવી છે તે નક્કી કરો
            </p>
          </div>
        </div>

        {packetItems.length > 0 && (
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!confirm('શું તમે આ પેકેટમાંથી બધી પસંદ કરેલી રેસીપી દૂર કરવા માંગો છો?')) return
                setPacketItems([])
                setShowResults(false)
                setRecipeSearch("")
                setDropdownOpen(false)
              }}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              બધું સાફ કરો
            </Button>
          </div>
        )}

        {/* Search-based recipe selector */}
        {availableRecipes.length > 0 && (
          <div className="relative mb-5" ref={dropdownRef}>
            <Label className="mb-1.5 block text-sm font-medium text-foreground">
              વાનગી શોધો અને ઉમેરો
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="વાનગી શોધવા માટે લખો..."
                value={recipeSearch}
                onChange={(e) => {
                  setRecipeSearch(e.target.value)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                className="bg-background pl-9"
              />
              {recipeSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipeSearch("")
                    setDropdownOpen(false)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown results */}
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {filteredAvailable.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    કોઈ સરખી વાનગી મળી નથી
                  </div>
                ) : (
                  filteredAvailable.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => addRecipeToPacket(recipe.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {recipe.image ? (
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border">
                          <Image
                            src={recipe.image}
                            alt={recipe.name}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-xs font-bold text-accent-foreground">
                          {recipe.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {recipe.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {recipe.baseQuantity} {recipe.baseUnit} &middot;{" "}
                          {recipe.ingredients.length} સામગ્રી
                        </span>
                      </div>
                      <Check className="h-4 w-4 shrink-0 text-primary opacity-0 group-hover:opacity-100" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {availableRecipes.length === 0 && packetItems.length > 0 && (
          <p className="mb-5 text-sm text-muted-foreground">
            બધી જ રેસીપી પેકેટમાં ઉમેરી દેવામાં આવી છે.
          </p>
        )}

        {/* Selected recipes list */}
        {packetItems.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
            <ChevronDown className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              તમારું ફૂડ પેકેટ બનાવવા માટે ઉપરથી વાનગી શોધો અને પસંદ કરો
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {packetItems.map((item) => {
              const recipe = recipes.find((r) => r.id === item.recipeId)
              if (!recipe) return null
              return (
                <div
                  key={item.recipeId}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-lg border border-border bg-background p-3 md:gap-3 md:p-4"
                >
                  {recipe.image ? (
                    <div className="relative h-8 w-8 md:h-10 md:w-10 shrink-0 overflow-hidden rounded-lg border border-border">
                      <Image
                        src={recipe.image}
                        alt={recipe.name}
                        fill
                        sizes="(max-width: 768px) 32px, 40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-xs md:text-sm font-bold text-accent-foreground">
                      {recipe.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="whitespace-normal text-xs md:truncate md:text-sm font-semibold text-foreground">
                        {recipe.name}
                      </span>
                      <Badge variant="secondary" className="md:shrink-0 text-[9px] md:text-[10px]">
                        {recipe.ingredients.length} સામગ્રી
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      બેઝ: {recipe.baseQuantity} {recipe.baseUnit} 
                      {recipe.packetYield ? ` | યીલ્ડ: ${recipe.packetYield} પેકેટો` : ""}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 sm:flex-shrink-0">
                    <Label className="sr-only" htmlFor={`qty-${item.recipeId}`}>
                      {recipe.name} માટે જથ્થો
                    </Label>
                    {/* show quantity in the selected/display unit — stored quantity is always in recipe.baseUnit */}
                    <Input
                      id={`qty-${item.recipeId}`}
                      type="number"
                      step="any"
                      min="0.01"
                      value={(() => {
                        const displayUnit = item.unit || recipe.baseUnit
                        const displayVal = convert(item.quantity || 0, recipe.baseUnit, displayUnit)
                        return Number.isFinite(displayVal)
                          ? Number.isInteger(displayVal)
                            ? String(displayVal)
                            : displayVal.toFixed(2)
                          : ""
                      })()}
                      onChange={(e) => {
                        const displayUnit = item.unit || recipe.baseUnit
                        const entered = parseFloat(e.target.value) || 0
                        const valueInBase = convert(entered, displayUnit, recipe.baseUnit)
                        updateItemQuantity(item.recipeId, valueInBase)
                      }}
                      className="h-8 w-14 sm:w-16 md:h-9 md:w-20 bg-card text-center text-xs sm:text-sm font-semibold"
                    />

                    {/* unit selector */}
                    <select
                      aria-label={`${recipe.name} માટે એકમ`}
                      value={item.unit || recipe.baseUnit}
                      onChange={(e) => updateItemUnit(item.recipeId, e.target.value)}
                      className="rounded-md border border-border bg-card px-1.5 py-1 text-xs"
                    >
                      {unitsFor(recipe.baseUnit).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRecipeFromPacket(item.recipeId)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${recipe.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Step 2: Number of packets */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-bold text-primary">2</span>
          </div>
          <div>
            <h3 className="font-serif text-lg text-foreground">
              કેટલા પેકેટ બનાવવા છે?
            </h3>
            <p className="text-sm text-muted-foreground">
              તમે કુલ કેટલા ફૂડ પેકેટો તૈયાર કરવાના છો તે સંખ્યા લખો
            </p>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1 md:max-w-xs">
            <Label
              htmlFor="packet-count"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              પેકેટની સંખ્યા
            </Label>
            <Input
              id="packet-count"
              type="number"
              min="1"
              step="1"
              value={packetCount || ""}
              onChange={(e) => setPacketCount(parseInt(e.target.value) || 0)}
              className="h-12 bg-background text-xl font-bold"
            />
          </div>
          <Button
            size="lg"
            className="gap-2"
            disabled={!canCalculate}
            onClick={() => setShowResults(true)}
          >
            <Calculator className="h-5 w-5" />
            પરિણામ
          </Button>
        </div>
      </div>

      {/* Step 3: Results */}
      {showResults && canCalculate && (
        <div className="space-y-5">
          {/* Summary header */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 md:p-7">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <h3 className="font-serif text-lg text-foreground">
                  ગણતરીનું પરિણામ
                </h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">
                    {packetCount} પેકેટ
                  </span> માટે કુલ જરૂરિયાત
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
              {packetItems.map((item) => {
                const recipe = recipes.find((r) => r.id === item.recipeId)
                if (!recipe) return null
                return (
                  <Badge
                    key={item.recipeId}
                    variant="secondary"
                    className="gap-1 bg-card px-3 py-1.5 text-xs"
                  >
                    {recipe.name}: {item.quantity} {recipe.baseUnit}
                  </Badge>
                )
              })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    // build printable HTML for recipeBreakdowns and aggregatedIngredients
                    const newWin = window.open('', '_blank')
                    if (!newWin) return

                    const style = `
                      body{font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px;color:#0f172a}
                      h1,h2,h3,h4{color:#0f172a}
                      table{width:100%;border-collapse:collapse;margin-bottom:16px}
                      th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
                      .section{margin-bottom:28px}
                      .muted{color:#6b7280;font-size:12px}
                    `

                    const breakdownHtml = `
                      <div class="section">
                        <h2>વાનગી મુજબ વિગત</h2>
                        ${recipeBreakdowns.filter(Boolean).map(b => {
                          if (!b) return '';
                          const recipe = b.recipe
                          return `
                            <h3 style="margin-bottom:6px">${escapeHtml(recipe.name)} — ${escapeHtml(String(b.totalQuantity))} ${escapeHtml(recipe.baseUnit)}</h3>
                            <table>
                              <thead>
                                <tr>
                                  <th>સામગ્રી</th>
                                  <th>દરેક પેકેટ દીઠ</th>
                                  <th>કુલ</th>
                                  ${recipe.packetYield ? `<th>યીલ્ડ મુજબ (${escapeHtml(String(recipe.packetYield))})</th>` : ''}
                                </tr>
                              </thead>
                              <tbody>
                                ${b.ingredients.map((ing: any) => {
                                  return `
                                  <tr>
                                    <td>${escapeHtml(ing.name)}</td>
                                    <td style="text-align:right">${escapeHtml(formatPerPacket(ing.perPacket, ing.unit))}</td>
                                    <td style="text-align:right">${escapeHtml(formatSmart(ing.total, ing.unit))}</td>
                                    ${recipe.packetYield ? `<td style="text-align:right">${ing.totalByYield ? escapeHtml(formatSmart(ing.totalByYield, ing.unit)) : '-'}</td>` : ''}
                                  </tr>
                                `
                                }).join('')}
                              </tbody>
                            </table>
                          `
                        }).join('')}
                      </div>
                    `

                    const combinedHtml = `
                      <div class="section">
                        <h2>કુલ સામગ્રીની યાદી</h2>
                        <p class="muted">${packetCount} પેકેટ માટે બધી જ વાનગીઓની કુલ સામગ્રી</p>
                        <table>
                          <thead>
                            <tr><th>સામગ્રી</th><th style="text-align:right">કુલ જરૂરિયાત</th><th>વાનગી મુજબ વિગત</th></tr>
                          </thead>
                          <tbody>
                            ${aggregatedIngredients.map(agg => `
                              <tr>
                                <td>${escapeHtml(agg.name)}</td>
                                <td style="text-align:right">${escapeHtml(formatSmart(agg.totalAmount, agg.unit))}</td>
                                <td>${agg.breakdown.map(b => `${escapeHtml(b.recipeName)}: ${escapeHtml(formatSmart(b.amount, agg.unit))}`).join('<br/>')}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    `

                    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>પેકેટની વિગત</title><style>${style}</style></head><body><h1>પેકેટની વિગત</h1>${breakdownHtml}${combinedHtml}<script>setTimeout(()=>{window.print();},250);function closeWindow(){window.close();}</script></body></html>`

                    // helper to escape HTML
                    function escapeHtml(s: any){
                      return String(s)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                    }

                    newWin.document.open()
                    newWin.document.write(doc)
                    newWin.document.close()
                  }}
                >
                  <Package className="h-4 w-4" />
                  PDF ડાઉનલોડ કરો
                </Button>
              </div>
            </div>
          </div>

          {/* Per-recipe breakdown */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg text-foreground">
              વાનગી મુજબ વિગત
            </h4>
            {recipeBreakdowns.filter(Boolean).map((breakdown) => {
              const { recipe, perPacketQuantity, totalQuantity, ingredients } = breakdown as {
                recipe: Recipe;
                perPacketQuantity: number;
                totalQuantity: number;
                scaleFactor: number;
                ingredients: Array<{ perPacket: number; total: number; totalByYield: number | null; id: string; name: string; amount: number; unit: string; }>;
              };
              return (
                <div
                  key={recipe.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3.5">
                    {recipe.image ? (
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border">
                        <Image
                          src={recipe.image}
                          alt={recipe.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                    <div>
                      <h5 className="font-serif text-base text-foreground">
                        {recipe.name}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        દરેક પેકેટ દીઠ {perPacketQuantity} {recipe.baseUnit}
                        {" x "}{packetCount} પેકેટો ={" "}
                        <span className="font-semibold text-primary">
                          {formatSmart(totalQuantity, recipe.baseUnit)} કુલ
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-5 py-2.5 text-left">સામગ્રી</th>
                          <th className="px-5 py-2.5 text-right">પેકેટ દીઠ</th>
                          <th className="px-3 py-2.5 text-center">
                            <span className="sr-only">arrow</span>
                          </th>
                          <th className="px-5 py-2.5 text-right">
                            કુલ ({packetCount} પેકેટ)
                          </th>
                          {recipe.packetYield && (
                            <th className="px-5 py-2.5 text-right">
                              યીલ્ડ મુજબ ({recipe.packetYield})
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ing: any) => (
                          <tr
                            key={ing.id}
                            className="border-b border-border last:border-b-0"
                          >
                            <td className="px-5 py-3 text-sm font-medium text-foreground">
                              {ing.name}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                              {formatPerPacket(ing.perPacket, ing.unit)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <ArrowRight className="mx-auto h-3.5 w-3.5 text-primary" />
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-primary">
                              {formatSmart(ing.total, ing.unit)}
                            </td>
                            {recipe.packetYield && (
                              <td className="px-5 py-3 text-right text-sm font-semibold text-primary">
                                {ing.totalByYield ? formatSmart(ing.totalByYield, ing.unit) : "-"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Aggregated shopping list */}
          <div className="overflow-hidden rounded-xl border-2 border-primary/20 bg-card shadow-sm">
            <div className="border-b border-primary/20 bg-primary/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h4 className="font-serif text-lg text-foreground">
                  કુલ સામગ્રીની યાદી
                </h4>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {packetCount} પેકેટ માટે બધી જ વાનગીઓની ભેગી કરેલી કુલ સામગ્રી
              </p>
            </div>

            {/* Mobile stacked view */}
            <div className="md:hidden px-3 py-3 space-y-2">
              {aggregatedIngredients.map((agg, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground break-words">
                        {agg.name}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-primary">{formatSmart(agg.totalAmount, agg.unit)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agg.breakdown.map((b, j) => (
                      <span key={j} className="inline-flex text-[10px] items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground max-w-full">
                        <span className="truncate">{b.recipeName}</span>
                        <span className="ml-0.5 font-semibold text-foreground shrink-0">{formatSmart(b.amount, agg.unit)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet table (hidden on small screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 text-left">સામગ્રી</th>
                    <th className="px-5 py-2.5 text-right">કુલ જરૂરિયાત</th>
                    <th className="px-5 py-2.5 text-left">વાનગી મુજબ વિગત</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedIngredients.map((agg, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3 text-sm font-medium text-foreground">{agg.name}</td>
                      <td className="px-5 py-3 text-right text-base font-bold text-primary">{formatSmart(agg.totalAmount, agg.unit)}</td>
                      <td className="px-5 py-3 min-w-0">
                        <div className="flex flex-wrap gap-2 items-start">
                          {agg.breakdown.map((b, j) => (
                            <span key={j} className="inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                              <span className="block max-w-[12rem] md:max-w-[14rem] whitespace-normal md:truncate">{b.recipeName}</span>
                              <span className="ml-1 font-semibold text-foreground">{formatSmart(b.amount, agg.unit)}</span>
                            </span>
                          ))}
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
}
