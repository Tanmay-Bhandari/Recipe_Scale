"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RecipeForm } from '@/components/recipe-form'
import { apiUrl } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { Recipe } from '@/lib/types'

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined
  const { toast } = useToast()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let mounted = true
    setIsLoading(true)

    void (async () => {
      try {
        // Always fetch directly from Firestore API — never use localStorage
        const res = await fetch(apiUrl(`/api/recipes/${id}`))
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch recipe`)
        const json = await res.json()
        if (!mounted) return
        setRecipe({ id, ...(json as any) })
      } catch (e: any) {
        console.error('Failed to load recipe from Firestore:', e)
        if (mounted) {
          toast({ title: 'Error', description: `Recipe load failed: ${e?.message || 'Unknown error'}` })
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [id])

  if (!id) return <div className="p-6">Invalid recipe id</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl">વાનગી સુધારો</h1>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">Firestore માંથી લોડ થઈ રહ્યું છે...</p>
        </div>
      ) : recipe ? (
        <RecipeForm
          editingRecipe={recipe}
          onAdd={(r) => {
            try { window.dispatchEvent(new Event('recipesSaved')) } catch (e) {}
            toast({ title: 'સેવ સફળ', description: 'રેસીપી સફળતાપૂર્વક સુધારેલ છે' })
            router.push('/?tab=recipes')
          }}
          onClose={() => {
            router.push('/?tab=recipes')
          }}
        />
      ) : (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium text-destructive">Recipe not found in Firestore.</p>
          <button
            onClick={() => router.push('/?tab=recipes')}
            className="mt-4 text-sm text-primary underline"
          >
            Go back to Recipe List
          </button>
        </div>
      )}
    </div>
  )
}
