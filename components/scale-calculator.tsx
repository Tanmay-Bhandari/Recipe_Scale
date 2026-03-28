"use client"

import { useState } from "react"
import { ArrowRight, Calculator } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { Recipe } from "@/lib/types"

interface ScaleCalculatorProps {
  recipe: Recipe
}

export function ScaleCalculator({ recipe }: ScaleCalculatorProps) {
  const [desiredQuantity, setDesiredQuantity] = useState(recipe.baseQuantity)
  const scaleFactor = desiredQuantity / recipe.baseQuantity

  function handleSliderChange(value: number[]) {
    const factor = value[0]
    setDesiredQuantity(
      parseFloat((recipe.baseQuantity * factor).toFixed(2))
    )
  }

  function handleInputChange(value: string) {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setDesiredQuantity(num)
    } else if (value === "") {
      setDesiredQuantity(0)
    }
  }

  function formatAmount(amount: number): string {
    const scaled = amount * scaleFactor
    if (scaled === 0) return "0"
    if (scaled < 0.01) return scaled.toExponential(1)
    if (Number.isInteger(scaled)) return scaled.toString()
    return scaled.toFixed(2)
  }

  return (
    <div className="space-y-5">
      {/* Scale controls */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Scale Calculator
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Original: {recipe.baseQuantity} {recipe.baseUnit}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                min="0"
                value={desiredQuantity || ""}
                onChange={(e) => handleInputChange(e.target.value)}
                className="h-10 bg-card text-lg font-semibold"
              />
              <span className="text-sm font-medium text-muted-foreground">
                {recipe.baseUnit}
              </span>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">
              Scale Factor: {scaleFactor.toFixed(2)}x
            </Label>
            <Slider
              value={[scaleFactor]}
              min={0.25}
              max={10}
              step={0.25}
              onValueChange={handleSliderChange}
              className="mt-4"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0.25x</span>
              <span>5x</span>
              <span>10x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scaled Ingredients Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Ingredient</span>
          <span className="w-20 text-right">Original</span>
          <span className="w-6 text-center">
            <span className="sr-only">arrow</span>
          </span>
          <span className="w-24 text-right">Scaled</span>
        </div>
        {recipe.ingredients.map((ing) => (
          <div
            key={ing.id}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="text-sm font-medium text-foreground">
              {ing.name}
            </span>
            <span className="w-20 text-right text-sm text-muted-foreground">
              {ing.amount} {ing.unit}
            </span>
            <span className="flex w-6 justify-center">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="w-24 text-right text-sm font-semibold text-primary">
              {formatAmount(ing.amount)} {ing.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
