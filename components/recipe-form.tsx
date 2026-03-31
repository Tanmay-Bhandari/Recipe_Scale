"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { v4 as uuidv4 } from "uuid"
import { Plus, Trash2, X, CakeSlice, ImagePlus, Loader2, ChefHat } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RecipeSuggestionInput } from "./recipe-suggestion-input"
import { COMMON_SUGGESTIONS } from "@/lib/suggestions"
import { Label } from "@/components/ui/label"
import { IngredientInput } from "@/components/ingredient-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Ingredient, Recipe } from "@/lib/types"
import api, { apiUrl } from "@/lib/api"

const UNITS = ["kg", "g", "lb", "oz", "ml", "L", "cups", "pieces"]

interface RecipeFormProps {
  onAdd: (recipe: Recipe) => void
  onClose: () => void
  editingRecipe?: Recipe | null
}

export function RecipeForm({ onAdd, onClose, editingRecipe }: RecipeFormProps) {
  const isEditing = !!editingRecipe
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const allSuggestions = useMemo(() => {
    const fromRecipes = recipes.map(r => ({ name: r.name }))
    const fromCommon = COMMON_SUGGESTIONS.map(name => ({ name }))
    const combined = [...fromRecipes, ...fromCommon]
    const unique = Array.from(new Map(combined.map(s => [s.name, s])).values())
    return unique.sort((a, b) => a.name.localeCompare(b.name, 'gu'))
  }, [recipes])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("recipes")
        if (raw) setRecipes(JSON.parse(raw))
      } catch (e) {}
    }
  }, [])

  const [name, setName] = useState(editingRecipe?.name ?? "")
  const [baseQuantity, setBaseQuantity] = useState(
    editingRecipe ? String(editingRecipe.baseQuantity) : ""
  )
  const [baseUnit, setBaseUnit] = useState(editingRecipe?.baseUnit ?? "kg")
  const [packetYield, setPacketYield] = useState(
    editingRecipe?.packetYield ? String(editingRecipe.packetYield) : ""
  )
  const [imagePreview, setImagePreview] = useState<string | null>(
    editingRecipe?.image ?? null
  )
  const [ingredients, setIngredients] = useState<Omit<Ingredient, "id">[]>(
    editingRecipe
      ? editingRecipe.ingredients.map(({ name, amount, unit }) => ({
          name,
          amount,
          unit,
        }))
      : [{ name: "", amount: 0, unit: "g" }]
  )
  const [previousIngredientNames, setPreviousIngredientNames] = useState<string[]>([])
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Function to load ingredients from localStorage
  // Function to load ingredients preferring Firestore (via API) then falling back to localStorage
  async function loadPreviousIngredients(): Promise<number> {
    try {
      const names = new Set<string>()

      // Try backend API first (aggregated ingredient names)
      try {
        const res = await fetch(apiUrl('/api/ingredients'))
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            for (const n of data) if (n && typeof n === 'string') names.add(n)
          }
        } else {
          // fallback: try fetching full recipes and extract ingredient names
          console.debug('/api/ingredients returned', res.status, 'trying /api/recipes')
          try {
            const r2 = await fetch(apiUrl('/api/recipes'))
            if (r2.ok) {
              const obj = await r2.json()
              if (obj && typeof obj === 'object') {
                for (const k of Object.keys(obj)) {
                  const rec = obj[k]
                  for (const ing of rec?.ingredients || []) {
                    if (ing && ing.name && typeof ing.name === 'string') names.add(ing.name)
                  }
                }
              }
            }
          } catch (e2) {
            console.warn('Fallback /api/recipes failed', e2)
          }
        }
      } catch (e) {
        console.warn('Failed to fetch ingredient names from API', e)
      }

      // If backend returned nothing, fallback to localStorage (client-side)
      if (names.size === 0) {
        try {
          const recipesRaw = localStorage.getItem('recipes')
          if (recipesRaw) {
            const recipes = JSON.parse(recipesRaw)
            for (const recipe of recipes) {
              for (const ing of recipe.ingredients || []) {
                if (ing && ing.name && typeof ing.name === 'string') names.add(ing.name)
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse local recipes', e)
        }
      }

      const arr = Array.from(names).sort()
      setPreviousIngredientNames(arr)
      return arr.length
    } catch (err) {
      setPreviousIngredientNames([])
      return 0
    }
  }

  // Load ingredient names from localStorage - run whenever form opens/editingRecipe changes
  useEffect(() => {
    void loadPreviousIngredients()
  }, [editingRecipe])

  // Load ingredient names from localStorage
  useEffect(() => {
    void loadPreviousIngredients()
    
    // Listen for storage changes (when recipes are saved from other tabs/windows)
    const handleStorageChange = () => {
      setTimeout(() => { void loadPreviousIngredients() }, 50)
    }
    
    // Listen for custom event (when recipes are saved from the same tab)
    const handleRecipesSaved = () => {
      setTimeout(() => { void loadPreviousIngredients() }, 50)
    }
    
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("recipesSaved", handleRecipesSaved)
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("recipesSaved", handleRecipesSaved)
    }
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { name: "", amount: 0, unit: "g" }])
  }

  function removeIngredientRow(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(
    index: number,
    field: keyof Omit<Ingredient, "id">,
    value: string | number
  ) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !baseQuantity || ingredients.length === 0) return

    const validIngredients = ingredients.filter(
      (ing) => ing.name.trim() && ing.amount > 0
    )
    if (validIngredients.length === 0) return

    const id = editingRecipe?.id ?? uuidv4()

    const recipe: Recipe = {
      id,
      name: name.trim(),
      baseQuantity: parseFloat(baseQuantity),
      baseUnit,
      packetYield: packetYield ? parseFloat(packetYield) : undefined,
      image: (imagePreview === null ? null : imagePreview ?? undefined) as any,
      ingredients: validIngredients.map((ing, idx) => ({
        ...ing,
        id: editingRecipe?.ingredients[idx]?.id ?? uuidv4(),
      })),
      createdAt: editingRecipe?.createdAt ?? Date.now(),
    }

    // If imagePreview is a data URL (client-side newly added image), upload it first
    const isDataUrl = typeof imagePreview === "string" && imagePreview.startsWith("data:")

    async function uploadAndSave() {
      setIsSaving(true)
      const t = toast({ title: 'રેસીપી સેવ થઈ રહી છે', description: 'ફોટો અપલોડ અને રેસીપી સેવ થઈ રહી છે...' })
      let imageUrl: string | null | undefined = recipe.image
      let imagePath: string | null | undefined = (editingRecipe as any)?.imagePath

      try {
        // If the user removed the image (cleared preview), send explicit nulls
        // so the backend can remove stored image fields.
        if (imagePreview === null) {
          imageUrl = null
          imagePath = null
        }

        if (selectedFile) {
          // Upload via server-side endpoint to avoid signed URL CORS issues
          const filename = `${id}-${selectedFile.name}`

          // Read file as data URL and extract base64 payload
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.onload = () => {
              const result = reader.result as string
              const match = result.match(/^data:(.*);base64,(.*)$/)
              if (match) resolve(match[2])
              else reject(new Error('Invalid file data'))
            }
            reader.readAsDataURL(selectedFile)
          })

          // Attempt storage upload; if storage is unavailable, fall back to saving base64 in Firestore
          try {
            const uploadResp = await api.uploadImage({ filename, data: base64, contentType: selectedFile.type || 'application/octet-stream' })
            imageUrl = uploadResp?.url
            imagePath = uploadResp?.path
          } catch (uploadErr: any) {
            console.warn('Image upload failed, falling back to storing base64 in DB:', uploadErr?.message || String(uploadErr))
            // Keep base64 so we can send it with the recipe create/update request
            // (will be stored in Firestore as `imageBase64` field)
            ;(recipe as any).imageBase64 = base64
          }
        } else if (isDataUrl && imagePreview) {
          const match = imagePreview.match(/^data:(.*);base64,(.*)$/)
          if (match) {
            const contentType = match[1]
            const base64 = match[2]
            const filename = `${id}.png`
            try {
              const uploadResp = await api.uploadImage({ filename, data: base64, contentType })
              imageUrl = uploadResp?.url
              imagePath = uploadResp?.path
            } catch (uploadErr: any) {
              console.warn('Image upload failed, falling back to storing base64 in DB:', uploadErr?.message || String(uploadErr))
              ;(recipe as any).imageBase64 = base64
            }
          }
        }

        // Save recipe to backend (create or update) via API helper
        if (isEditing) {
          await api.updateRecipe(id, { ...recipe, image: imageUrl, imagePath } as any)
          onAdd({ ...recipe, image: imageUrl, imagePath } as any)
        } else {
          const resp = await api.createRecipe({ ...recipe, image: imageUrl, imagePath } as any)
          const newId = resp?.id ?? id
          onAdd({ ...recipe, image: imageUrl, imagePath, id: newId } as any)
        }
        window.dispatchEvent(new Event("recipesSaved"))
        setTimeout(() => loadPreviousIngredients(), 100)

        t.update({ id: t.id, title: 'સેવ સફળ!', description: 'રેસીપી સફળતાપૂર્વક પૂર્વક સેવ કરી છે', open: true })
      } catch (err: any) {
        console.warn('Save failed, falling back to localStorage:', err?.message || String(err))
        // Fallback: save locally so the UI still updates when backend is unavailable
        try {
          const raw = localStorage.getItem('recipes')
          const arr = raw ? JSON.parse(raw) : []
          const existingIndex = arr.findIndex((r: any) => r.id === recipe.id)
          const toSave: any = { ...recipe, image: imageUrl, imagePath }
          if (existingIndex !== -1) {
            arr[existingIndex] = toSave
          } else {
            arr.unshift(toSave)
          }
          localStorage.setItem('recipes', JSON.stringify(arr))
          onAdd(toSave)
          window.dispatchEvent(new Event('recipesSaved'))
          t.update({ id: t.id, title: 'લોકલી સેવ સફળ!', description: 'બેકએન્ડ ઉપલબ્ધ નથી — બ્રાઉઝર સ્ટોરેજમાં સેવ કર્યું છે', open: true })
        } catch (e) {
          t.update({ id: t.id, title: 'ભૂલ', description: err?.message || 'રેસીપી સેવ કરવામાં નિષ્ફળ', open: true })
        }
      } finally {
        setIsSaving(false)
      }
    }

    void uploadAndSave()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <CakeSlice className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-serif text-xl text-foreground">
            {isEditing ? "રેસીપી એડિટ કરો" : "નવી વાનગી ઉમેરો"}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close form">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-foreground">
            વાનગીનો ફોટો
          </Label>
          <div className="flex items-start gap-4">
            {imagePreview ? (
              <div className="relative h-40 w-40 md:h-48 md:w-48 shrink-0 overflow-hidden rounded-xl border border-border">
                <Image
                  src={imagePreview}
                  alt="Recipe preview"
                  fill
                  sizes="(max-width: 768px) 160px, 192px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-40 w-40 md:h-48 md:w-48 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs font-medium">ફોટો ઉમેરો</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              aria-label="Upload recipe photo"
            />
            <p className="pt-1 text-xs text-muted-foreground leading-relaxed">
              તમારી રેસીપીનો ફોટો અપલોડ કરો. JPG, PNG અથવા WebP સ્વીકાર્ય છે. આ વૈકલ્પિક છે પણ રેસીપી ઓળખવામાં મદદ કરે છે.
            </p>
          </div>
        </div>

        {/* Recipe Info */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-1">
            <Label htmlFor="recipe-name" className="mb-1.5 block text-sm font-medium text-foreground">
              વાનગીનું નામ
            </Label>
            <RecipeSuggestionInput
              id="recipe-name"
              placeholder="દા.ત. ચોકલેટ કેક"
              value={name}
              onChange={(v) => setName(v)}
              recipes={allSuggestions}
              className="bg-background"
              required
            />
          </div>
          <div>
            <Label htmlFor="base-qty" className="mb-1.5 block text-sm font-medium text-foreground">
              બેઝ જથ્થો
            </Label>
            <Input
              id="base-qty"
              type="number"
              step="any"
              min="0.01"
              placeholder="દા.ત. 10"
              value={baseQuantity}
              onChange={(e) => setBaseQuantity(e.target.value)}
              className="bg-background"
              required
            />
          </div>
          <div>
            <Label htmlFor="base-unit" className="mb-1.5 block text-sm font-medium text-foreground">
              યુનિટ
            </Label>
            <Select value={baseUnit} onValueChange={setBaseUnit}>
              <SelectTrigger id="base-unit" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="packet-yield" className="mb-1.5 block text-sm font-medium text-foreground">
              કુલ ફૂડ પેકેટ
            </Label>
            <Input
              id="packet-yield"
              type="number"
              step="1"
              min="1"
              placeholder="દા.ત. 100"
              value={packetYield}
              onChange={(e) => setPacketYield(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">
              સામગ્રી
            </Label>
          </div>



          <div className="space-y-3">
            {ingredients.map((ing, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-border bg-background p-3 md:items-end"
                >
                  <div className="md:col-span-6">
                    <Label className="mb-1.5 block text-sm font-medium text-foreground">
                      {i === 0 ? "સામગ્રીનું નામ" : ""}
                    </Label>
                    <IngredientInput
                      value={ing.name}
                      onChange={(value) => updateIngredient(i, "name", value)}
                      placeholder="દા.ત. મેંદો"
                      className="bg-background"
                      previousIngredients={previousIngredientNames}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="mb-1.5 block text-sm font-medium text-foreground">
                      {i === 0 ? "જથ્થો" : ""}
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={ing.amount || ""}
                      onChange={(e) => updateIngredient(i, "amount", parseFloat(e.target.value) || 0)}
                      className="bg-background"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1.5 block text-sm font-medium text-foreground">
                      {i === 0 ? "યુનિટ" : ""}
                    </Label>
                    <Select
                      value={ing.unit}
                      onValueChange={(v) => updateIngredient(i, "unit", v)}
                    >
                      <SelectTrigger id={`unit-${i}`} className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredientRow(i)}
                      disabled={ingredients.length === 1}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remove ingredient"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
            ))}

          </div>

          {/* moved Add Ingredient button below all ingredient blocks — right-aligned */}
          <div className="mt-3 flex justify-end">
            <Button
            type="button"
            variant="outline"
            onClick={addIngredientRow}
            className="w-full gap-2 border-dashed"
          >
            <Plus className="h-4 w-4" />
            સામગ્રી ઉમેરો
          </Button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            રદ કરો
          </Button>
          <Button type="submit" size="lg" className="w-full gap-2 text-lg shadow-lg" disabled={isSaving}>
          <ChefHat className="h-5 w-5" />
          {isSaving ? (isEditing ? "અપડેટ થઈ રહ્યું છે..." : "સેવ થઈ રહ્યું છે...") : isEditing ? "રેસીપી અપડેટ કરો" : "રેસીપી સેવ કરો"}
        </Button>
        </div>
      </form>
    </div>
  )
}
