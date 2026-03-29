"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RecipeForm } from '@/components/recipe-form'
import api, { apiUrl } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { Recipe } from '@/lib/types'

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id
  const { toast } = useToast()
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    void (async () => {
      try {
        let localFound = false
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('recipes')
          if (raw) {
            const arr = JSON.parse(raw)
            if (Array.isArray(arr)) {
              const found = arr.find((r: any) => r.id === id)
              if (found) {
                if (mounted) setRecipe(found)
                localFound = true
              }
            }
          }
        }

        const data = await fetch(apiUrl(`/api/recipes/${id}`))
        if (!data.ok) throw new Error('Failed to fetch')
        const json = await data.json()
        if (!mounted) return
        setRecipe({ id, ...(json as any) })
      } catch (e) {
        console.warn('Silent sync failed:', e)
        if (!recipe && mounted) {
          toast({ title: 'Error', description: 'Failed to load recipe' })
        }
      }
    })()
    return () => { mounted = false }
  }, [id])

  if (!id) return <div className="p-6">Invalid recipe id</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl">વાનગી સુધારો</h1>
      {recipe ? (
        <RecipeForm
          editingRecipe={recipe}
          onAdd={(r) => {
            try { window.dispatchEvent(new Event('recipesSaved')) } catch (e) {}
            toast({ title: 'સેવ સફળ', description: 'રેસીપી સફળતાપૂર્વક સુધારેલ છે' })
            if (typeof window !== 'undefined') localStorage.setItem("recipeScaleActiveTab", "recipes")
            router.push('/?tab=recipes')
          }}
          onClose={() => {
            if (typeof window !== 'undefined') localStorage.setItem("recipeScaleActiveTab", "recipes")
            router.push('/?tab=recipes')
          }}
        />
      ) : (
        <div className="text-center py-10 font-serif text-lg">લોડ થઈ રહ્યું છે...</div>
      )}
    </div>
  )
}
