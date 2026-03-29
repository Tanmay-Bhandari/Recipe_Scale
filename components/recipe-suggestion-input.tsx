"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea"
import { cn } from "@/lib/utils"

interface RecipeSuggestionInputProps {
  value: string
  onChange: (value: string) => void
  recipes: Array<{ name: string }>
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  required?: boolean
}

export function RecipeSuggestionInput({
  value,
  onChange,
  recipes,
  placeholder = "નામ લખો...",
  className,
  disabled = false,
  id,
  required,
}: RecipeSuggestionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [userTyped, setUserTyped] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allSuggestions = useMemo(() => {
    return recipes.map(r => r.name).sort((a, b) => a.localeCompare(b, 'gu'))
  }, [recipes])

  useEffect(() => {
    if ((!userTyped && !showSuggestions) || value.trim().length < 1) {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      return
    }

    const q = value.toLowerCase()
    
    // Separate matches into "starts with" and "includes" for better priority
    const startsWith = allSuggestions.filter((name) =>
      name.toLowerCase().startsWith(q)
    )
    const includes = allSuggestions.filter((name) =>
      !name.toLowerCase().startsWith(q) && name.toLowerCase().includes(q)
    )

    const filtered = [...startsWith, ...includes].slice(0, 10)

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
        // If something is highlighted, select it; otherwise select the first suggestion
        const indexToSelect = highlightedIndex >= 0 ? highlightedIndex : 0
        if (filteredSuggestions[indexToSelect]) {
          handleSuggestionClick(filteredSuggestions[indexToSelect])
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
    <div className="relative w-full">
      <AutoResizeTextarea
        ref={inputRef}
        id={id}
        required={required}
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
        className={cn("bg-background", className)}
        disabled={disabled}
        autoComplete="off"
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
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
