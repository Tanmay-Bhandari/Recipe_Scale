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
        const data = await fetch(apiUrl(`/api/recipes/${id}`))
        if (!data.ok) throw new Error('Failed to fetch')
        const json = await data.json()
        if (!mounted) return
        setRecipe({ id, ...(json as any) })
      } catch (e) {
        console.error(e)
        toast({ title: 'Error', description: 'Failed to load recipe' })
      }
    })()
    return () => { mounted = false }
  }, [id])

  if (!id) return <div className="p-6">Invalid recipe id</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl">Edit Recipe</h1>
      {recipe ? (
        <RecipeForm
          editingRecipe={recipe}
          onAdd={(r) => {
            try { window.dispatchEvent(new Event('recipesSaved')) } catch (e) {}
            toast({ title: 'Saved', description: 'Recipe updated' })
            router.push('/')
          }}
          onClose={() => router.push('/')}
        />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}
