export interface Ingredient {
  id: string
  name: string
  amount: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  baseQuantity: number
  baseUnit: string
  ingredients: Ingredient[]
  image?: string
  createdAt: number
}

export interface PacketRecipeItem {
  recipeId: string
  quantity: number
  // selected/display unit for the per-packet quantity (defaults to recipe.baseUnit)
  unit?: string
}

export interface AggregatedIngredient {
  name: string
  unit: string
  totalAmount: number
  breakdown: {
    recipeName: string
    amount: number
  }[]
}
