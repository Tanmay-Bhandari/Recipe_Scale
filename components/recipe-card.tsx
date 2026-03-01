"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Trash2, Scale, UtensilsCrossed, Pencil } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ScaleCalculator } from "@/components/scale-calculator"
import type { Recipe } from "@/lib/types"

interface RecipeCardProps {
  recipe: Recipe
  onDelete: (id: string) => void
  onEdit: (recipe: Recipe) => void
  // if true, card should appear visually dimmed (another card is focused)
  isDimmed?: boolean
  // toggle focus for this card
  onFocusToggle?: () => void
}

export function RecipeCard({ recipe, onDelete, onEdit, isDimmed, onFocusToggle }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false)

  const baseClasses =
    "group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"

  const stateClasses = isDimmed
    ? "filter blur-sm opacity-60"
    : ""

  return (
    <div
      onClick={() => onFocusToggle?.()}
      className={`${baseClasses} ${stateClasses}`}
      data-testid={`recipe-card-${recipe.id}`}
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 md:p-7 gap-4">
        <div className="flex items-start gap-4 w-full">
          {recipe.image ? (
            <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-lg border border-border">
              <Image
                src={recipe.image}
                alt={recipe.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-lg bg-accent/30">
              <UtensilsCrossed className="h-6 w-6 md:h-7 md:w-7 text-accent-foreground" />
            </div>
          )}
          <div className="min-w-0 w-full">
            <h3 className="font-serif text-lg text-foreground whitespace-normal md:line-clamp-1">
              {recipe.name}
            </h3>
            <p className="text-sm text-muted-foreground whitespace-normal">
              Base: {recipe.baseQuantity} {recipe.baseUnit}
              <span className="mx-1.5 text-border">|</span>
              {recipe.ingredients.length} ingredient
              {recipe.ingredients.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 sm:mt-0 sm:ml-auto flex items-center gap-1"> 
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Scale</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(recipe)}
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            aria-label={`Edit ${recipe.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
            <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Delete recipe "${recipe.name}"? This cannot be undone.`)) {
              onDelete(recipe.id)
              }
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${recipe.name}`}
            >
            <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {/* Quick ingredients preview */}
      {!expanded && (
        <div className="border-t border-border bg-muted/30 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients.map((ing) => (
              <span
                key={ing.id}
                className="inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border"
              >
                {ing.name}
                <span className="ml-1 text-muted-foreground">
                  {ing.amount}
                  {ing.unit}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Scale Calculator */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-5">
          <ScaleCalculator recipe={recipe} />
        </div>
      )}
    </div>
  )
}
