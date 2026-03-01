"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/header"
import { RecipeForm } from "@/components/recipe-form"
import { RecipeCard } from "@/components/recipe-card"
import api from "@/lib/api"
import { deleteRecipeClient } from "@/lib/firebaseClient"
import { useToast } from "@/hooks/use-toast"
import { EmptyRecipes } from "@/components/empty-recipes"
import { FoodPacketCalculator } from "@/components/food-packet-calculator"
import type { Recipe } from "@/lib/types"

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "sample-1",
    name: "Classic Chocolate Cake",
    baseQuantity: 1,
    baseUnit: "kg",
    ingredients: [
      { id: "s1", name: "All-Purpose Flour", amount: 250, unit: "g" },
      { id: "s2", name: "Sugar", amount: 200, unit: "g" },
      { id: "s3", name: "Cocoa Powder", amount: 75, unit: "g" },
      { id: "s4", name: "Butter", amount: 115, unit: "g" },
      { id: "s5", name: "Egg", amount: 3, unit: "pieces" },
      { id: "s6", name: "Milk", amount: 240, unit: "ml" },
      { id: "s7", name: "Baking Powder", amount: 2, unit: "tsp" },
      { id: "s8", name: "Vanilla Extract", amount: 1, unit: "tsp" },
    ],
    createdAt: Date.now() - 100000,
  },
  {
    id: "sample-2",
    name: "Banana Bread",
    baseQuantity: 1,
    baseUnit: "pieces",
    ingredients: [
      { id: "s9", name: "Ripe Bananas", amount: 3, unit: "pieces" },
      { id: "s10", name: "All-Purpose Flour", amount: 190, unit: "g" },
      { id: "s11", name: "Sugar", amount: 150, unit: "g" },
      { id: "s12", name: "Butter (melted)", amount: 75, unit: "g" },
      { id: "s13", name: "Egg", amount: 1, unit: "pieces" },
      { id: "s14", name: "Baking Soda", amount: 1, unit: "tsp" },
      { id: "s15", name: "Salt", amount: 0.5, unit: "tsp" },
    ],
    createdAt: Date.now() - 50000,
  },
  {
    id: "sample-3",
    name: "Spaghetti Bolognese",
    baseQuantity: 1,
    baseUnit: "serving",
    ingredients: [
      { id: "s16", name: "Spaghetti", amount: 100, unit: "g" },
      { id: "s17", name: "Ground Beef", amount: 200, unit: "g" },
      { id: "s18", name: "Tomato Sauce", amount: 150, unit: "ml" },
      { id: "s19", name: "Onion", amount: 1, unit: "pieces" },
      { id: "s20", name: "Garlic", amount: 2, unit: "clove" },
    ],
    createdAt: Date.now() - 30000,
  },
  {
    id: "sample-4",
    name: "Fluffy Pancakes",
    baseQuantity: 4,
    baseUnit: "pieces",
    ingredients: [
      { id: "s21", name: "All-Purpose Flour", amount: 200, unit: "g" },
      { id: "s22", name: "Milk", amount: 300, unit: "ml" },
      { id: "s23", name: "Egg", amount: 2, unit: "pieces" },
      { id: "s24", name: "Baking Powder", amount: 1, unit: "tsp" },
      { id: "s25", name: "Salt", amount: 0.5, unit: "tsp" },
    ],
    createdAt: Date.now() - 20000,
  },
  {
    id: "sample-5",
    name: "Tomato Soup",
    baseQuantity: 1,
    baseUnit: "liter",
    ingredients: [
      { id: "s26", name: "Tomatoes", amount: 500, unit: "g" },
      { id: "s27", name: "Onion", amount: 1, unit: "pieces" },
      { id: "s28", name: "Vegetable Stock", amount: 500, unit: "ml" },
      { id: "s29", name: "Olive Oil", amount: 1, unit: "tbsp" },
      { id: "s30", name: "Salt", amount: 1, unit: "tsp" },
    ],
    createdAt: Date.now() - 10000,
  },
]

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>(SAMPLE_RECIPES)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [focusedRecipeId, setFocusedRecipeId] = useState<string | null>(null)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"recipes" | "packet">("recipes")
  const [searchQuery, setSearchQuery] = useState("")
  const recipesRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()
  
  const loadRecipes = useCallback(async () => {
    const t = toast({ title: "Loading recipes", description: "Contacting backend..." })
    try {
      const data = await api.listRecipes()
      if (!data) {
        t.update({ id: t.id, title: "No recipes", description: "No recipes returned from backend", open: true })
        return
      }
      const dedupeById = (items: Recipe[]) => {
        const map = new Map<string, Recipe>()
        for (const it of items) {
          if (!it?.id) continue
          if (!map.has(it.id)) map.set(it.id, it)
        }
        return Array.from(map.values())
      }

      if (Array.isArray(data)) setRecipes(dedupeById(data as Recipe[]))
      else if (typeof data === "object") {
        const arr = Object.entries(data).map(([k, v]) => ({ id: k, ...(v as any) }))
        if (arr.length) setRecipes(dedupeById(arr as Recipe[]))
      }
      t.update({ id: t.id, title: "Loaded", description: "Recipes loaded from backend", open: true })
    } catch (err: any) {
      console.warn("Failed to load recipes from backend:", err)
      t.update({ id: t.id, title: "Load error", description: err?.message || "Failed to load recipes", open: true })
    }
  }, [toast])

  // Clear focus when clicking outside the recipes list
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (recipesRef.current && !recipesRef.current.contains(e.target as Node)) {
        setFocusedRecipeId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)

    // Load recipes from backend on mount
    void loadRecipes()

    // Reload when other pages signal recipesSaved (new/edit pages)
    const handleSaved = () => {
      void loadRecipes()
    }
    window.addEventListener('recipesSaved', handleSaved)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener('recipesSaved', handleSaved)
    }
  }, [])

  const addOrUpdateRecipe = useCallback((recipe: Recipe) => {
    setRecipes((prev) => {
      const existingIndex = prev.findIndex((r) => r.id === recipe.id)
      if (existingIndex !== -1) {
        const updated = [...prev]
        updated[existingIndex] = recipe
        return updated
      }
      return [recipe, ...prev]
    })
    setShowForm(false)
    setEditingRecipe(null)
  }, [])

  const deleteRecipe = useCallback((id: string) => {
    void (async () => {
      const t = toast({ title: "Deleting recipe", description: "Removing recipe..." })
      try {
        let deleted = false
        try {
          await deleteRecipeClient(id)
          deleted = true
        } catch (clientErr) {
          console.warn("Client deletion failed, falling back to API:", clientErr)
          try {
            await api.deleteRecipe(id)
            deleted = true
          } catch (apiErr) {
            // Treat "Not found" as success (already deleted or sample item)
            const msg = (apiErr && apiErr.message) || String(apiErr)
            if (msg.toLowerCase().includes('not found')) {
              deleted = true
            } else if (msg.toLowerCase().includes('device id mismatch')) {
              throw new Error('Delete blocked: this recipe belongs to a different browser (device id mismatch).')
            } else {
              console.error("API deletion failed:", apiErr)
              throw apiErr
            }
          }
        }

        if (deleted) {
          setRecipes((prev) => prev.filter((r) => r.id !== id))
          t.update({ id: t.id, title: "Deleted", description: "Recipe deleted successfully", open: true })
        }
      } catch (err: any) {
        console.error("Failed to delete recipe:", err)
        t.update({ id: t.id, title: "Delete failed", description: err?.message || "Failed to delete recipe", open: true })
      }
    })()
  }, [toast])

  const startEditing = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingRecipe(null)
  }, [])

  // Keep a sorted copy of recipes (alphabetical by name) for display
  const sortedRecipes = useMemo(() => {
    return [...recipes].sort((a, b) => a.name.localeCompare(b.name))
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return sortedRecipes
    const q = searchQuery.toLowerCase()
    return sortedRecipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
    )
  }, [sortedRecipes, searchQuery])

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {activeTab === "recipes" && (
          <>
            {/* Hero section */}
            <section className="mb-8 md:mb-12">
              <h2 className="font-serif text-3xl tracking-tight text-foreground md:text-4xl text-balance">
                Scale any recipe to the perfect amount
              </h2>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground leading-relaxed">
                Add your recipe with base ingredients, then use the calculator to
                instantly scale for any batch size. Making a 10kg cake instead of
                1kg? We handle the math.
              </p>
            </section>

            {/* Add button or form */}
            <section className="mb-8">
              <Button
                onClick={() => router.push('/recipes/new')}
                size="lg"
                className="gap-2 text-base"
              >
                <Plus className="h-5 w-5" />
                Add New Recipe
              </Button>
            </section>

            {/* Recipe list */}
            <section>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-serif text-xl text-foreground">
                  Your Recipes
                  <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                    ({filteredRecipes.length}
                    {searchQuery.trim() && ` of ${recipes.length}`})
                  </span>
                </h3>
                {recipes.length > 0 && (
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <form autoComplete="off">
                      <Input
                        placeholder="Search recipes or ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-background pl-9"
                      />
                    </form>
                  </div>
                )}
              </div>

              {recipes.length === 0 ? (
                <EmptyRecipes />
              ) : filteredRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center">
                  <Search className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {"No recipes match \""}{searchQuery}{"\""}
                  </p>
                </div>
                ) : (
                <div className="space-y-4" ref={recipesRef}>
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onDelete={deleteRecipe}
                        onEdit={() => router.push(`/recipes/${recipe.id}/edit`)}
                      isDimmed={focusedRecipeId !== null && focusedRecipeId !== recipe.id}
                      onFocusToggle={() =>
                        setFocusedRecipeId((prev) => (prev === recipe.id ? null : recipe.id))
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Client-side Firestore demo removed — use server/API or scripts for deletes */}
          </>
        )}

        {activeTab === "packet" && (
          <>
            {/* Packet hero */}
            <section className="mb-8 md:mb-12">
              <h2 className="font-serif text-3xl tracking-tight text-foreground md:text-4xl text-balance">
                Food Packet Calculator
              </h2>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground leading-relaxed">
                Combine multiple recipes into a single food packet, set how many
                packets you need, and get the total ingredient requirements
                instantly.
              </p>
            </section>

            <FoodPacketCalculator recipes={recipes} />
          </>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>
          {"RecipeScale \u2014 Built for chefs who love precision."}
        </p>
      </footer>
    </div>
  )
}
