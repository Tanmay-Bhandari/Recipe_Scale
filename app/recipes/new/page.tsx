"use client"

import { useRouter } from 'next/navigation'
import { RecipeForm } from '@/components/recipe-form'
import { useToast } from '@/hooks/use-toast'

export default function NewRecipePage() {
  const router = useRouter()
  const { toast } = useToast()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl">Add New Recipe</h1>
      <RecipeForm
        onAdd={(recipe) => {
          // notify main page to reload recipes
          try { window.dispatchEvent(new Event('recipesSaved')) } catch (e) {}
          toast({ title: 'Saved', description: 'Recipe saved' })
          router.push('/')
        }}
        onClose={() => router.push('/')}
      />
    </div>
  )
}
