/**
 * Smart unit converter that upgrades small units to larger ones
 * when the amount is large enough.
 *
 * e.g. 1500 g -> 1.5 kg, 2000 ml -> 2 L, 48 tsp -> 16 tbsp
 */

interface ConvertedUnit {
  amount: number
  unit: string
}

const CONVERSIONS: Record<string, { target: string; factor: number }[]> = {
  g: [{ target: "kg", factor: 1000 }],
  mg: [
    { target: "g", factor: 1000 },
    { target: "kg", factor: 1000000 },
  ],
  ml: [{ target: "L", factor: 1000 }],
  tsp: [{ target: "tbsp", factor: 3 }],
  oz: [{ target: "lb", factor: 16 }],
}

// Known unit families (ordered from smallest -> largest)
const UNIT_FAMILIES: Record<string, string[]> = {
  mass: ["mg", "g", "kg"],
  volume: ["ml", "L"],
  spoons: ["tsp", "tbsp"],
  imperial: ["oz", "lb"],
}

function findFamily(unit: string): string[] | undefined {
  for (const family of Object.values(UNIT_FAMILIES)) {
    if (family.includes(unit)) return family
  }
  return undefined
}

/**
 * Convert between units within the same family. If units are incompatible
 * the function returns the original amount.
 */
export function convert(amount: number, from: string, to: string): number {
  if (!amount || from === to) return amount
  const family = findFamily(from)
  if (!family || !family.includes(to)) return amount

  // Build simple step factors between adjacent units using CONVERSIONS
  const stepFactors: Record<string, number> = {}
  Object.entries(CONVERSIONS).forEach(([u, conversions]) => {
    conversions.forEach((c) => {
      stepFactors[`${u}->${c.target}`] = 1 / c.factor
      stepFactors[`${c.target}->${u}`] = c.factor
    })
  })

  const fromIndex = family.indexOf(from)
  const toIndex = family.indexOf(to)
  let result = amount
  if (fromIndex < toIndex) {
    // convert up (divide by factors)
    for (let i = fromIndex; i < toIndex; i++) {
      const a = family[i]
      const b = family[i + 1]
      const key = `${a}->${b}`
      const factor = stepFactors[key] ?? 1
      result = result * factor
    }
  } else if (fromIndex > toIndex) {
    // convert down (multiply by factors)
    for (let i = fromIndex; i > toIndex; i--) {
      const a = family[i]
      const b = family[i - 1]
      const key = `${a}->${b}`
      const factor = stepFactors[key] ?? 1
      result = result * factor
    }
  }

  return result
}

export function unitsFor(unit: string): string[] {
  const family = findFamily(unit)
  return family ? family : [unit]
}

export function smartConvert(amount: number, unit: string): ConvertedUnit {
  const conversions = CONVERSIONS[unit]
  if (!conversions) return { amount, unit }

  // Try from the largest conversion down
  for (let i = conversions.length - 1; i >= 0; i--) {
    const conv = conversions[i]
    if (amount >= conv.factor) {
      return {
        amount: amount / conv.factor,
        unit: conv.target,
      }
    }
  }

  return { amount, unit }
}

export function formatSmart(amount: number, unit: string): string {
  const converted = smartConvert(amount, unit)
  const formatted =
    converted.amount === 0
      ? "0"
      : Number.isInteger(converted.amount)
        ? converted.amount.toString()
        : converted.amount.toFixed(2)
  return `${formatted} ${converted.unit}`
}
