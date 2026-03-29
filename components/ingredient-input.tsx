import { useState, useRef, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea"
import { cn } from "@/lib/utils"

const COMMON_INGREDIENTS = [
  "મેંદો",
  "લોટ",
  "ઘઉંનો લોટ",
  "ચણાનો લોટ",
  "ખાંડ",
  "ગોળ",
  "તેલ",
  "ઘી",
  "મીઠું",
  "પાણી",
  "દૂધ",
  "દહીં",
  "મરચું",
  "લીલા મરચાં",
  "આદુ",
  "લસણ",
  "ડુંગળી",
  "બટાકા",
  "ટામેટા",
  "કોથમીર",
  "જીરું",
  "હળદર",
  "રાઈ",
  "મેથી",
  "હીંગ",
  "લીમડો",
  "વરિયાળી",
  "તજ",
  "લવિંગ",
  "એલચી",
  "મરી",
  "ફુદીનો",
  "પનીર",
  "માખણ",
  "સોજી",
  "રવો",
  "બેસન",
  "ચોખા",
  "પૌંઆ",
  "મમરા",
  "શીંગદાણા",
  "તલ",
  "અજમો",
  "સૂંઠ",
  "તુલસી",
  "કેસર",
  "પ્રેમવતી સ્પ. મસાલા",
  "મેથીના બીજ",
  "વટાણા",
  "ફલાવર",
  "કોબીજ",
  "ભીંડા",
  "રીંગણ",
  "દુધી",
  "ટીંડોરા",
  "પરવળ",
  "ગલકા",
  "ચોળી",
  "તુવેર",
  "મગ",
  "ચણા",
  "વાલ",
  "લીલવા",
  "રાજમા",
  "સોયાબીન",
  "પાલક",
  "મેથીની ભાજી",
  "કેપ્સીકમ",
  "ગાજર",
  "કાકડી",
  "લીંબુ",
  "કઢી લીમડો",
  "તેજપત્તા",
  "મગફળી",
  "કાજુ",
  "બદામ",
  "કિસમિસ",
  "પિસ્તા",
  "ચારોળી",
  "સૂકું કોપરું",
  "કોપરાનું છીણ",
  "ખસખસ",
  "મિક્સ મસાલો",
  "ગરમ મસાલો",
  "ધાણાજીરું",
  "આમચૂર પાવડર",
  "ચાટ મસાલો",
  "કસ્તૂરી મેથી",
  "તવી મસાલો",
  "પાઉંભાજી મસાલો",
  "ચોકલેટ પાવડર",
  "કોકો પાવડર",
  "બેકિંગ પાવડર",
  "બેકિંગ સોડા",
  "યીસ્ટ",
  "કન્ડેન્સ્ડ મિલ્ક",
  "ક્રીમ",
  "પેરી પેરી મસાલો",
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
  placeholder = "દા.ત. મેંદો",
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
    
    // Sort combined list locale-aware
    return [...uniquePrevious, ...remaining].sort((a, b) => a.localeCompare(b, 'gu'))
  }, [previousIngredients])

  useEffect(() => {
    // Only show suggestions if the user has actively typed or it is focused with some value
    if ((!userTyped && !showSuggestions) || value.trim().length < 1) {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      return
    }

    const q = value.toLowerCase()
    // Prioritize "starts with" then "includes"
    const startsWith = allSuggestions.filter(ing => ing.toLowerCase().startsWith(q))
    const includes = allSuggestions.filter(ing => 
      !ing.toLowerCase().startsWith(q) && ing.toLowerCase().includes(q)
    )

    const filtered = [...startsWith, ...includes].slice(0, 8)

    setFilteredSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
    setHighlightedIndex(-1)
  }, [value, allSuggestions, userTyped])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      <AutoResizeTextarea
        ref={inputRef as any}
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          if (value.trim().length >= 1) {
            setUserTyped(true)
            setShowSuggestions(true)
          }
        }}
        onChange={(e) => {
          setUserTyped(true)
          onChange(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        className={cn("min-h-[36px] px-3", className)}
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
