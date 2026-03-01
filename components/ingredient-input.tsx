import { useState, useRef, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const COMMON_INGREDIENTS = [
  "Flour",
  "Sugar",
  "Butter",
  "Eggs",
  "Milk",
  "Baking Powder",
  "Baking Soda",
  "Salt",
  "Vanilla Extract",
  "Cocoa Powder",
  "Chocolate",
  "Almonds",
  "Walnuts",
  "Pecans",
  "Oats",
  "Honey",
  "Oil",
  "Coconut Oil",
  "Olive Oil",
  "Cream",
  "Yogurt",
  "Cheese",
  "Yeast",
  "Cinnamon",
  "Nutmeg",
  "Ginger",
  "Lemon",
  "Orange",
  "Vanilla Bean",
  "Caramel",
  "Coffee",
  "Matcha",
  "Sesame",
  "Peanut Butter",
  "Almond Butter",
  "Dates",
  "Raisins",
  "Blueberries",
  "Strawberries",
  "Raspberries",
  "Bananas",
  "Apples",
  "Pumpkin",
  "Carrot",
  "Zucchini",
  "Spinach",
  "Garlic",
  "Onion",
  "Tomato",
  "Bell Pepper",
  "Basil",
  "Thyme",
  "Rosemary",
  "Oregano",
  "Cumin",
  "Paprika",
  "Black Pepper",
  "Chili",
  "Mustard",
  "Soy Sauce",
  "Fish Sauce",
  "Vinegar",
  "Lemon Juice",
  "Lime Juice",
  "Balsamic Vinegar",
  "Rice",
  "Pasta",
  "Bread",
  "Chickpea",
  "Lentil",
  "Beef",
  "Chicken",
  "Pork",
  "Fish",
  "Salmon",
  "Shrimp",
  "Tofu",
  "Tempeh",
]

interface IngredientInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  previousIngredients?: string[]
}

export function IngredientInput({
  value,
  onChange,
  placeholder = "e.g. Flour",
  className,
  disabled = false,
  previousIngredients = [],
}: IngredientInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [userTyped, setUserTyped] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Combine previous ingredients with common ingredients (previous first)
  const allSuggestions = useMemo(() => {
    const previousSet = new Set(previousIngredients.map(i => i.toLowerCase()))
    const uniquePrevious = previousIngredients.filter((ing, idx) => 
      previousIngredients.indexOf(ing) === idx
    )
    
    const remaining = COMMON_INGREDIENTS.filter(
      ing => !previousSet.has(ing.toLowerCase())
    )
    
    return [...uniquePrevious, ...remaining]
  }, [previousIngredients])

  useEffect(() => {
    // Only show suggestions if the user has actively typed and value length is reasonable
    if (!userTyped || value.trim().length < 2) {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      return
    }

    const filtered = allSuggestions.filter((ing) =>
      ing.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 6)

    setFilteredSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
    setHighlightedIndex(-1)
  }, [value, allSuggestions, userTyped])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0) {
          onChange(filteredSuggestions[highlightedIndex])
          setShowSuggestions(false)
          setUserTyped(false)
          setFilteredSuggestions([])
          setHighlightedIndex(-1)
        }
        break
      case "Escape":
        setShowSuggestions(false)
        break
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    setUserTyped(false)
    setFilteredSuggestions([])
    setHighlightedIndex(-1)
    // return focus to the input for better UX
    inputRef.current?.focus()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setUserTyped(true)
          onChange(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        className={cn("h-9 px-3", className)}
        disabled={disabled}
        autoComplete="off"
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-md"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10",
                highlightedIndex === index && "bg-primary/10 text-primary font-medium"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
