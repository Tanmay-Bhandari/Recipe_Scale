"use client"

import { useRouter } from 'next/navigation'
import { RecipeForm } from '@/components/recipe-form'
import { useToast } from '@/hooks/use-toast'

export default function NewRecipePage() {
  const router = useRouter()
  const { toast } = useToast()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl">નવી વાનગી ઉમેરો</h1>
      <RecipeForm
        onAdd={(recipe) => {
          try { window.dispatchEvent(new Event('recipesSaved')) } catch (e) {}
          toast({ title: 'સેવ સફળ', description: 'રેસીપી સફળતાપૂર્વક પૂર્વક સેવ કરી છે' })
          if (typeof window !== 'undefined') localStorage.setItem("recipeScaleActiveTab", "recipes")
          router.push('/?tab=recipes')
        }}
        onClose={() => {
          if (typeof window !== 'undefined') localStorage.setItem("recipeScaleActiveTab", "recipes")
          router.push('/?tab=recipes')
        }}
      />
    </div>
  )
}
