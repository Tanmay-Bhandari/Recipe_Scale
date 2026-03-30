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
import { DailyMenu } from "@/components/daily-menu"
import { TodayDailyMenu } from "@/components/today-daily-menu"
import { AuthDialog } from "@/components/auth-dialog"
import {
  approveAdminRequest,
  getSession,
  listPendingAdminRequests,
  logoutUser,
  loadUsers,
  rejectAdminRequest,
  type AdminApprovalRequest,
  type AuthSession,
} from "@/lib/auth-client"
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
    createdAt: 1711200000000,
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
    createdAt: 1711200001000,
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
    createdAt: 1711200002000,
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
    createdAt: 1711200003000,
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
    createdAt: 1711200004000,
  },
]

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>(SAMPLE_RECIPES)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [focusedRecipeId, setFocusedRecipeId] = useState<string | null>(null)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"todayMenu" | "recipes" | "packet" | "daily">("todayMenu")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      localStorage.setItem("recipeScaleActiveTab", activeTab)
    }
  }, [activeTab, isLoaded])
  const [session, setSession] = useState<AuthSession | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingAdminRequests, setPendingAdminRequests] = useState<AdminApprovalRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const recipesRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()
  const isAdmin = session?.role === "admin"

  useEffect(() => {
    // Load state from localStorage on mount (prevents hydration mismatch)
    if (typeof window !== "undefined") {
      try {
        const rawRecipes = localStorage.getItem("recipes")
        if (rawRecipes) {
          const parsed = JSON.parse(rawRecipes)
          if (Array.isArray(parsed) && parsed.length > 0) setRecipes(parsed)
        }
      } catch (e) { }

      // Priority: 1. URL Query Param (?tab=recipes), 2. LocalStorage
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      const savedTab = localStorage.getItem("recipeScaleActiveTab")

      const finalTab = (tabParam && ["recipes", "packet", "daily", "todayMenu"].includes(tabParam))
        ? tabParam as any
        : (savedTab && ["recipes", "packet", "daily", "todayMenu"].includes(savedTab))
          ? savedTab as any
          : "todayMenu"

      setActiveTab(finalTab)

      // Clean up URL if tab param was used to avoid sticking on refresh
      if (tabParam) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    // Seed default admin and read existing login session
    loadUsers()
    setSession(getSession())
    setPendingAdminRequests(listPendingAdminRequests())
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded && !isAdmin && activeTab !== "todayMenu") {
      setActiveTab("todayMenu")
    }
  }, [isLoaded, isAdmin, activeTab])

  const loadRecipes = useCallback(async () => {
    let localFound = false
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("recipes")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecipes(parsed)
            localFound = true
          }
        }
      }
    } catch (e) { }

    const loadingToast = localFound ? null : toast({ title: "Loading recipes", description: "Contacting backend..." })

    try {
      const data = await api.listRecipes()
      if (!data) {
        if (loadingToast) loadingToast.update({ id: loadingToast.id, title: "No recipes", description: "No recipes returned from backend", open: true })
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

      let newRecipes: Recipe[] = []
      if (Array.isArray(data)) newRecipes = dedupeById(data as Recipe[])
      else if (typeof data === "object") {
        const arr = Object.entries(data).map(([k, v]) => ({ id: k, ...(v as any) }))
        if (arr.length) newRecipes = dedupeById(arr as Recipe[])
      }

      if (newRecipes.length > 0) {
        setRecipes(newRecipes)
        if (typeof window !== "undefined") localStorage.setItem("recipes", JSON.stringify(newRecipes))
      }

      if (loadingToast) loadingToast.update({ id: loadingToast.id, title: "Loaded", description: "Recipes loaded from backend", open: true })
    } catch (err: any) {
      console.warn("Silent sync failed, using local data:", err?.message || String(err))
      if (loadingToast) loadingToast.update({ id: loadingToast.id, title: "Offline Mode", description: "Using locally saved recipes", open: true })
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
            const msg = (apiErr && (apiErr as any).message) || String(apiErr)
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
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (!isAdmin && tab !== "todayMenu") {
            setAuthOpen(true)
            return
          }
          setActiveTab(tab)
        }}
        isAdmin={isAdmin}
        session={session}
        onAuthClick={() => setAuthOpen(true)}
        onLogoutClick={() => {
          logoutUser()
          setSession(null)
          setActiveTab("todayMenu")
        }}
        pendingAdminRequests={pendingAdminRequests}
        onApproveAdminRequest={(userId) => {
          const res = approveAdminRequest(userId)
          toast({ title: res.ok ? "Approved" : "Error", description: res.message })
          setPendingAdminRequests(listPendingAdminRequests())
        }}
        onRejectAdminRequest={(userId) => {
          const res = rejectAdminRequest(userId)
          toast({ title: res.ok ? "Rejected" : "Error", description: res.message })
          setPendingAdminRequests(listPendingAdminRequests())
        }}
      />

      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(s) => {
          setSession(s)
          setPendingAdminRequests(listPendingAdminRequests())
          setActiveTab("todayMenu")
          setAuthOpen(false)
        }}
      />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {activeTab === "todayMenu" && (
          <>
            {!isAdmin ? (
              <section className="mb-4 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
                મહેમાન વ્યૂ: ફક્ત આજનું દૈનિક મેનુ ઉપલબ્ધ છે. તમામ વિકલ્પો માટે એડમિન તરીકે લોગીન કરો.
              </section>
            ) : null}
            <TodayDailyMenu recipes={recipes} isAdmin={isAdmin} />
          </>
        )}

        {isAdmin && activeTab === "recipes" && (
          <>
            {/* Hero section */}
            <section className="mb-8 md:mb-12">
              <h2 className="font-serif text-3xl tracking-tight text-foreground md:text-4xl text-balance">
                કોઈપણ રેસીપીને યોગ્ય માત્રામાં સ્કેલ કરો
              </h2>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground leading-relaxed">
                બેઝ સામગ્રી સાથે તમારી રેસીપી ઉમેરો, પછી કોઈપણ બેચ સાઈઝ માટે તરત જ સ્કેલ કરવા માટે કેલ્ક્યુલેટરનો ઉપયોગ કરો.
                1kg ને બદલે 10kg કેક બનાવવી છે? અમે ગણતરી સંભાળીશું.
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
                નવી વાનગી ઉમેરો
              </Button>
            </section>

            {/* Recipe list */}
            <section>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-serif text-xl text-foreground">
                  તમારી વાનગીઓ
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
                        placeholder="વાનગી અથવા સામગ્રી શોધો..."
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
                    {"\""}{searchQuery}{"\" "}સાથે કોઈ વાનગી મળી નથી
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
          </>
        )}

        {isAdmin && activeTab === "packet" && (
          <>
            {/* Packet hero */}
            <section className="mb-8 md:mb-12">
              <h2 className="font-serif text-3xl tracking-tight text-foreground md:text-4xl text-balance">
                ફૂડ પેકેટ કેલ્ક્યુલેટર
              </h2>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground leading-relaxed">
                મલ્ટીપલ રેસીપીને એક જ ફૂડ પેકેટમાં જોડો, તમને કેટલા પેકેટની જરૂર છે તે સેટ કરો
                અને તરત જ કુલ સામગ્રીની જરૂરિયાતો મેળવો.
              </p>
            </section>

            <FoodPacketCalculator recipes={recipes} />
          </>
        )}

        {isAdmin && activeTab === "daily" && (
          <>
            <section className="mb-8 md:mb-12">
              <h2 className="font-serif text-3xl tracking-tight text-foreground md:text-4xl text-balance">
                દૈનિક મેનુ
              </h2>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground leading-relaxed">
                તમારી સેવ કરેલી રેસીપીનો ઉપયોગ કરીને તમારા દૈનિક ભોજનનું આયોજન કરો.
              </p>
            </section>

            <DailyMenu recipes={recipes} />
          </>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>
          {"RecipeScale — ચોકસાઈ પસંદ કરતા શેફ માટે બનાવેલ છે."}
        </p>
      </footer>
    </div>
  )
}
