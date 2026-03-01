"use client"

import { BookOpen } from "lucide-react"

export function EmptyRecipes() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-serif text-lg text-foreground">No recipes yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Add your first recipe to get started. You can then scale ingredients to
        any quantity you need.
      </p>
    </div>
  )
}
