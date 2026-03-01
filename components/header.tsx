"use client"

import { ChefHat, CakeSlice, Package } from "lucide-react"

interface HeaderProps {
  activeTab: "recipes" | "packet"
  onTabChange: (tab: "recipes" | "packet") => void
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">
                RecipeScale
              </h1>
              <p className="hidden text-xs text-muted-foreground md:block">
                Scale your recipes perfectly
              </p>
            </div>
          </div>

        </div>

        {/* Nav tabs */}
        <nav className="-mb-px flex gap-1" aria-label="Main navigation">
          <button
            onClick={() => onTabChange("recipes")}
            className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "recipes"
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <CakeSlice className="h-4 w-4" />
            Recipes
          </button>
          <button
            onClick={() => onTabChange("packet")}
            className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "packet"
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" />
            Food Packet Calculator
          </button>
        </nav>
      </div>
    </header>
  )
}
