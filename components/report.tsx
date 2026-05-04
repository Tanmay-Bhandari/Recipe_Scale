"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Search, X, Trash2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatSmart, convert, unitsFor } from "@/lib/unit-converter"
import { getTodayKey, loadDayMenuFromFirestore, listSavedDaysApi, DAILY_MENU_STORAGE_KEY } from "@/lib/daily-menu-storage"
import type { MealType } from "@/lib/daily-menu-storage"
import type { Recipe, PacketRecipeItem } from "@/lib/types"

interface ReportProps { recipes: Recipe[] }

function isHeadingName(raw: string): boolean {
	const name = raw.trim()
	if (!name) return false
	const lower = name.toLowerCase()
	return lower.startsWith("ઠાકોરજી ") || lower.startsWith("જનરલ ")
}

function normalizeForMatch(s: string) {
	if (!s) return ""
	const n = s.normalize ? s.normalize('NFC') : s
	// remove punctuation (keep letters/numbers/space), collapse spaces, lowercase
	try {
		// Unicode-aware: remove characters that are not letters, numbers or whitespace
		// Use RegExp constructor to avoid parser errors in environments that don't support \p escapes.
		const unicodeRe = new RegExp('[^\\p{L}\\p{N}\\s]+', 'gu')
		return n.replace(unicodeRe, '').replace(/\s+/g, ' ').trim().toLowerCase()
	} catch (e) {
		// fallback if Unicode property escapes unsupported
		return n.replace(/[^\w\s]+/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
	}
}

function normalizeUnit(u?: string) {
	if (!u) return undefined
	const s = String(u).trim()
	if (!s) return undefined
	const low = s.toLowerCase()
	if (low === 'l' || low === 'ltr' || low === 'litre' || low === 'liter') return 'L'
	if (low === 'ml' || low === 'milliliter' || low === 'millilitre') return 'ml'
	if (low === 'kg' || low === 'kilogram' || low === 'kilograms') return 'kg'
	if (low === 'g' || low === 'gm' || low === 'gram' || low === 'grams') return 'g'
	if (low === 'mg' || low === 'milligram') return 'mg'
	if (low === 'tsp') return 'tsp'
	if (low === 'tbsp' || low === 'tblsp') return 'tbsp'
	if (low === 'oz') return 'oz'
	if (low === 'lb' || low === 'lbs') return 'lb'
	// fallback to the original trimmed string
	return s
}

export function Report({ recipes }: ReportProps) {
	const STORAGE_KEY = "report-state-v1"
	const [items, setItems] = useState<PacketRecipeItem[]>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (!raw) return []
			const parsed = JSON.parse(raw)
			return Array.isArray(parsed.items) ? parsed.items : []
		} catch (e) { return [] }
	})
	function fmtYMD(d: Date) {
		return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
	}
	const defaultEnd = getTodayKey()
	const defaultStart = fmtYMD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
	const [startDate, setStartDate] = useState<string>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (!raw) return defaultStart
			const parsed = JSON.parse(raw)
			return typeof parsed.startDate === 'string' ? parsed.startDate : defaultStart
		} catch (e) { return defaultStart }
	})
	const [endDate, setEndDate] = useState<string>(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (!raw) return defaultEnd
			const parsed = JSON.parse(raw)
			return typeof parsed.endDate === 'string' ? parsed.endDate : defaultEnd
		} catch (e) { return defaultEnd }
	})

	const [search, setSearch] = useState("")
	const [dropdownOpen, setDropdownOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement | null>(null)

	const [menu, setMenu] = useState<any | null>(null)
	const [savedMenuNames, setSavedMenuNames] = useState<Array<{ id: string; name: string; unit?: string }>>([])
	const [loadingSavedNames, setLoadingSavedNames] = useState(false)
	const [showResults, setShowResults] = useState(false)
	const [loadingResults, setLoadingResults] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function loadToday() {
			try {
				const key = getTodayKey()
				const data = await loadDayMenuFromFirestore(key)
				setMenu(data)
			} catch (err) {
				setMenu(null)
			}
		}
		void loadToday()
	}, [])

	// When saved menu names load, update any already-added menu items to use the stored unit
	useEffect(() => {
		if (!savedMenuNames || savedMenuNames.length === 0) return
		setItems(prev => prev.map(i => {
			if (!i.recipeId || !i.recipeId.startsWith('menu:')) return i
			// only update when unit is missing or defaulted to 'kg'
			if (i.unit && i.unit !== 'kg') return i
			const sn = savedMenuNames.find(s => s.id === i.recipeId)
			if (sn?.unit) return { ...i, unit: normalizeUnit(sn.unit) || sn.unit }
			return i
		}))
	}, [savedMenuNames])

	// Load unique menu item names across saved daily menus (limit to recent 365 days)
	useEffect(() => {
		let cancelled = false
		async function loadSavedNames() {
			setLoadingSavedNames(true)
			try {
				const saved = await listSavedDaysApi()
				if (!Array.isArray(saved) || saved.length === 0) {
					setSavedMenuNames([])
					setLoadingSavedNames(false)
					return
				}

				const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
				const keys = saved.filter((d: string) => {
					const dt = new Date(`${d}T00:00:00`)
					return dt >= cutoff
				})

				const seen = new Set<string>()
					for (const key of keys) {
					if (cancelled) break
					try {
						const day = await loadDayMenuFromFirestore(key)
						if (!day || !day.meals) continue
						const mealTypes: MealType[] = ['breakfast','lunch','dinner']
						for (const mt of mealTypes) {
							const meal = day.meals?.[mt]
							if (!meal || !Array.isArray(meal.items)) continue
								for (const it of meal.items) {
									const name = ((it.value || it.name || it.label) || '').trim()
										if (!name || isHeadingName(name)) continue
										const keyName = name.toLowerCase()
									if (seen.has(keyName)) continue
									seen.add(keyName)
									// id prefixed with menu: to match selection format; store normalized unit when available
									setSavedMenuNames(prev => [...prev, { id: `menu:${encodeURIComponent(name)}`, name, unit: normalizeUnit(it.unit) }])
								}
						}
					} catch (e) {
						// ignore individual day failures
					}
				}
			} catch (e) {
				console.error('Failed loading saved menu names', e)
			} finally {
				if (!cancelled) setLoadingSavedNames(false)
			}
		}
		void loadSavedNames()
		return () => { cancelled = true }
	}, [])

	useEffect(() => {
		function onClick(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
		}
		document.addEventListener('mousedown', onClick)
		return () => document.removeEventListener('mousedown', onClick)
	}, [])

	useEffect(() => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, startDate, endDate })) } catch (e) {}
	}, [items, startDate, endDate])

	const available = recipes.filter(r => !items.find(i => i.recipeId === r.id))

	// Collect today's menu item names to allow selecting items that are not in recipes
	const menuItems: Array<{ id: string; name: string; unit?: string }> = useMemo(() => {
		const seen = new Set<string>()
		const out: Array<{ id: string; name: string; unit?: string }> = []
		const mealTypes: MealType[] = ['breakfast','lunch','dinner']

		const addItem = (raw: string | undefined, unit?: string) => {
			const name = (raw || '').trim()
			if (!name) return
			if (isHeadingName(name)) return
			const key = name.toLowerCase()
			if (seen.has(key)) return
			seen.add(key)
			out.push({ id: `menu:${encodeURIComponent(name)}`, name, unit: normalizeUnit(unit) })
		}

		// include unsaved local daily-menu state so newly typed values are suggested immediately
		try {
			const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DAILY_MENU_STORAGE_KEY) : null
			if (raw) {
				const parsed = JSON.parse(raw)
				const localMeals = parsed?.meals
				if (localMeals) {
					for (const mt of mealTypes) {
						const meal = localMeals?.[mt]
						if (!meal || !Array.isArray(meal.items)) continue
						for (const it of meal.items) addItem(it.value || it.name || it.label, it.unit)
					}
				}
			}
		} catch (e) {
			// ignore local parse errors
		}

		if (menu && menu.meals) {
			for (const mt of mealTypes) {
				const meal = menu.meals?.[mt]
				if (!meal || !Array.isArray(meal.items)) continue
				for (const it of meal.items) addItem(it.value || it.name || it.label, it.unit)
			}
		}

		return out
		}, [menu])
	// Suggest only today's menu items (no recipe cards or common suggestions)
	const suggestionNames = useMemo(() => {
		const map = new Map<string, { id: string; name: string; normKey: string }>()
		// include saved names from Firestore first
		for (const s of savedMenuNames) {
			const raw = (s.name || '')
			const norm = raw && raw.normalize ? raw.normalize('NFC') : raw
			const key = normalizeForMatch(norm)
			if (!map.has(key)) map.set(key, { id: s.id, name: norm, normKey: key })
		}
		// include today's menu items (override saved if same name)
		for (const m of menuItems) {
			const raw = (m.name || '')
			const norm = raw && raw.normalize ? raw.normalize('NFC') : raw
			const key = normalizeForMatch(norm)
			map.set(key, { id: m.id, name: norm, normKey: key })
		}
		return Array.from(map.values())
	}, [savedMenuNames, menuItems])

	// Only show today's menu items in suggestions (no recipe suggestions)
	const filteredMenus = useMemo(() => {
		const qRaw = search.trim()
		if (!qRaw) return suggestionNames
		const qNorm = normalizeForMatch(qRaw)
		return suggestionNames.filter(m => {
			const key = (m.normKey || normalizeForMatch(m.name || ''))
			return key.includes(qNorm)
		})
	}, [suggestionNames, search])

	function add(recipeId: string) {
		if (items.find(i => i.recipeId === recipeId)) return
		// if selecting a menu item (id starts with menu:), create a synthetic entry
		if (recipeId.startsWith('menu:')) {
	 		const name = decodeURIComponent(recipeId.slice(5))
	 		// prefer unit from today's menu items, else use savedMenuNames (historical), fallback to 'kg'
			let unit = 'kg'
			const mi = menuItems.find(m => m.id === recipeId)
			if (mi?.unit) unit = normalizeUnit(mi.unit) || unit
			else {
				const sn = savedMenuNames.find(s => s.id === recipeId)
				if (sn?.unit) unit = normalizeUnit(sn.unit) || unit
			}
	 		setItems(prev => [...prev, { recipeId, quantity: 1, unit }])
	 		setSearch("")
	 		setDropdownOpen(false)
	 		return
	 	}

	 	const recipe = recipes.find(r => r.id === recipeId)
	 	const unit = recipe ? recipe.baseUnit : undefined
	 	setItems(prev => [...prev, { recipeId, quantity: 1, unit }])
	 	setSearch("")
	 	setDropdownOpen(false)
	}
	function remove(id: string) { setItems(prev => prev.filter(i => i.recipeId !== id)) }
	function updateQty(id: string, qtyInBase: number) { setItems(prev => prev.map(i => i.recipeId === id ? { ...i, quantity: qtyInBase } : i)) }
	function updateUnit(id: string, unit: string) { setItems(prev => prev.map(i => i.recipeId === id ? { ...i, unit } : i)) }

	// We'll compute counts over the selected months by querying saved daily menus.
	async function aggregateCountsForRange(startYMD: string, endYMD: string) {
		setError(null)
		setLoadingResults(true)
		try {
			const saved = await listSavedDaysApi()
			if (!Array.isArray(saved) || saved.length === 0) {
				setLoadingResults(false)
				return { counts: new Map<string, number>(), summedQuantities: new Map<string, number>(), countsByName: new Map<string, number>(), summedQuantitiesByName: new Map<string, { amount: number; unit: string }>() }
			}

			// compute date range (use 30 days/month as approximation)
			const start = new Date(`${startYMD}T00:00:00`)
			const now = new Date(`${endYMD}T23:59:59`)

			const keysInRange = saved.filter((d: string) => {
				const parts = d.split('-')
				if (parts.length !== 3) return false
				const dt = new Date(`${d}T00:00:00`)
				return dt >= start && dt <= now
			})

			const counts = new Map<string, number>()
			const summedQuantities = new Map<string, number>()
			const countsByName = new Map<string, number>()
			// store summed quantities per name along with unit: { amount, unit }
			const summedQuantitiesByName = new Map<string, { amount: number; unit: string }>()

			for (const key of keysInRange) {
				try {
					const dayMenu = await loadDayMenuFromFirestore(key)
					if (!dayMenu) continue
					const mealTypes: MealType[] = ['breakfast','lunch','dinner']
					const mealCount = (meal: any) => {
						if (!meal) return 0
						const total = Number(meal.totalOverride || 0)
						if (total > 0) return total
						const sum = (Number(meal.vip||0) + Number(meal.staff||0) + Number(meal.guest||0) + Number(meal.ajeevan||0) + Number(meal.chhatralaya||0) + Number(meal.yuvati||0))
						return sum || 0
					}

					for (const mt of mealTypes) {
						const meal = dayMenu.meals?.[mt]
						const cnt = mealCount(meal)
						const itemsList = meal?.items || []
						for (const it of itemsList) {
							const rawName = ((it.value || it.name) || '').trim()
							const name = rawName.toLowerCase()
							if (!name) continue

							// always increment name-based maps (for menu items not in recipes)
							const prevNameCnt = countsByName.get(name) || 0
							countsByName.set(name, prevNameCnt + 1)
							try {
								const rawQty = Number(it.quantity || 0)
								const fromUnit = normalizeUnit(it.unit) || 'kg'
								if (!rawQty) {
									// nothing to add
								} else {
									const prev = summedQuantitiesByName.get(name)
									if (!prev) {
										summedQuantitiesByName.set(name, { amount: rawQty, unit: fromUnit })
									} else {
										// If units belong to same family, sum in the smaller unit to preserve precision
										try {
											const family = unitsFor(prev.unit || fromUnit)
											const fromIndex = family.indexOf(fromUnit)
											const prevIndex = family.indexOf(prev.unit)
											if (fromIndex !== -1 && prevIndex !== -1) {
												// choose the smaller (lower index) unit to sum in
												const smallUnit = fromIndex < prevIndex ? fromUnit : prev.unit
												const prevInSmall = Number(convert(prev.amount, prev.unit, smallUnit)) || 0
												const rawInSmall = Number(convert(rawQty, fromUnit, smallUnit)) || 0
												summedQuantitiesByName.set(name, { amount: prevInSmall + rawInSmall, unit: smallUnit })
											} else {
												// fallback: convert incoming qty to prev.unit
												const converted = Number(convert(rawQty, fromUnit, prev.unit)) || 0
												summedQuantitiesByName.set(name, { amount: prev.amount + converted, unit: prev.unit })
											}
										} catch (e) {
											const converted = Number(convert(rawQty, fromUnit, prev.unit)) || 0
											summedQuantitiesByName.set(name, { amount: prev.amount + converted, unit: prev.unit })
										}
									}
								}
							} catch (e) {
								// ignore conversion failures for name sums
							}

							const matching = recipes.filter(r => r.name.trim().toLowerCase() === name)
							for (const r of matching) {
								// occurrences: count number of batches (1 per meal item), not headcount
								const prev = counts.get(r.id) || 0
								counts.set(r.id, prev + 1)

								// sum maat (quantity) from the daily menu items, converted to recipe.baseUnit
								try {
									const rawQty = Number(it.quantity || 0)
									const fromUnit = it.unit || r.baseUnit
									const qtyInBase = Number(convert(rawQty, fromUnit, r.baseUnit)) || 0
									const prevSum = summedQuantities.get(r.id) || 0
									summedQuantities.set(r.id, prevSum + qtyInBase)
								} catch (e) {
									// conversion failed — ignore this item's quantity
								}
							}
						}
					}
				} catch (e) {
					// ignore failing day loads but continue
					console.error('Failed loading day', key, e)
				}
			}

			setLoadingResults(false)
			return { counts, summedQuantities, countsByName, summedQuantitiesByName }
		} catch (err: any) {
			setLoadingResults(false)
			setError(err?.message || 'Failed to list saved days')
			return { counts: new Map<string, number>(), summedQuantities: new Map<string, number>(), countsByName: new Map(), summedQuantitiesByName: new Map() }
		}
	}

	const canShow = items.length > 0 && startDate && endDate && (new Date(startDate) <= new Date(endDate))

	const [results, setResults] = useState<Array<any>>([])

	async function computeAndShow() {
		setShowResults(false)
		setError(null)
		setResults([])
		const agg = await aggregateCountsForRange(startDate, endDate)
		const counts = agg.counts
		const sums = agg.summedQuantities
		const countsByName = agg.countsByName || new Map<string, number>()
		const sumsByName = agg.summedQuantitiesByName || new Map<string, { amount: number; unit: string }>()

		// build results using summed maat when available; fallback to previous estimate
		const res = items.map(it => {
			if (it.recipeId.startsWith('menu:')) {
				const name = decodeURIComponent(it.recipeId.slice(5))
				const key = name.trim().toLowerCase()
				const totalOccurrences = countsByName.get(key) || 0
				const summed = sumsByName.get(key)
				if (summed) {
					// return amount+unit so rendering can format smartly (e.g., 5000 ml -> 5 L)
					const displayUnit = summed.unit || (it.unit || 'kg')
					const pseudoRecipe = { id: it.recipeId, name, baseUnit: displayUnit, baseQuantity: 1 }
					return { recipe: pseudoRecipe, totalOccurrences, totalProducedAmount: summed.amount, totalProducedUnit: summed.unit }
				}
				// fallback when no summed amount
				const pseudoRecipe = { id: it.recipeId, name, baseUnit: (it.unit || 'kg'), baseQuantity: 1 }
				return { recipe: pseudoRecipe, totalOccurrences, totalProducedAmount: 0, totalProducedUnit: (it.unit || 'kg') }
			}
			const recipe = recipes.find(r => r.id === it.recipeId)
			if (!recipe) return null
			const totalOccurrences = counts.get(recipe.id) || 0
			const summedMaatInBase = sums.get(recipe.id) || 0
			let totalProducedBaseUnit = summedMaatInBase
			if (!totalProducedBaseUnit || totalProducedBaseUnit <= 0) {
				const perServingQty = Number(it.quantity || 1)
				totalProducedBaseUnit = totalOccurrences * perServingQty * (Number(recipe.baseQuantity) || 1)
			}
			return { recipe, totalOccurrences, totalProducedBaseUnit }
		}).filter(Boolean) as Array<any>

		setResults(res)
		setShowResults(true)
	}

	function handlePrint() {
		if (!results || results.length === 0) return
		const style = `
			body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;color:#0f172a}
			h1{font-size:20px;margin-bottom:8px}
			h2{font-size:14px;margin-top:0;color:#64748b}
			table{width:100%;border-collapse:collapse;margin-top:16px}
			th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
			th{background:#f8fafc;color:#64748b;font-weight:700}
		`
		const rows = results.map(r => {
			const total = r.totalProducedAmount !== undefined && r.totalProducedUnit
				? formatSmart(r.totalProducedAmount, r.totalProducedUnit)
				: formatSmart(r.totalProducedBaseUnit || 0, r.recipe.baseUnit || '')
			return `<tr><td>${(r.recipe.name || '').replace(/</g,'&lt;')}</td><td style="text-align:center">${r.totalOccurrences}</td><td style="text-align:right">${total}</td></tr>`
		}).join('')
		const html = `
			<!doctype html>
			<html>
			<head>
			<meta charset="utf-8">
			<title>રિપોર્ટ ${startDate} — ${endDate}</title>
			<style>${style}</style>
			</head>
			<body>
				<h1>રિપોર્ટ</h1>
				<h2>સાઢ: ${startDate} થી ${endDate}</h2>
				<table>
				<thead><tr><th>ઇટમ</th><th>કુલ બનાવટ</th><th>કુલ</th></tr></thead>
				<tbody>${rows}</tbody>
				</table>
				<script>window.onload = function(){ window.print(); }</script>
			</body>
			</html>
		`
		const newWin = window.open('', '_blank')
		if (!newWin) return
		newWin.document.open()
		newWin.document.write(html)
		newWin.document.close()
	}

	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
				<div className="mb-4 flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><span className="text-sm font-bold text-primary">1</span></div>
					<div>
						<h3 className="font-serif text-lg text-foreground">રિપોર્ટ માટે વાનગીઓ પસંદ કરો</h3>
						<p className="text-sm text-muted-foreground">આજની મેનુ મુજબ, પસંદ કરેલ વાનગીઓ કેટલા બનાવવામાં આવે છે તેના પર આધારિત રિપોર્ટ.</p>
					</div>
				</div>

				<div className="relative" ref={dropdownRef}>
					<Label className="mb-1.5 block text-sm font-medium text-foreground">વાનગી શોધો અને ઉમેરો</Label>
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input placeholder="વાનગી શોધો..." value={search} onChange={(e)=>{setSearch(e.target.value); setDropdownOpen(true)}} className="bg-background pl-9" onFocus={() => setDropdownOpen(true)} />
						{search && <button type="button" onClick={()=>{setSearch(""); setDropdownOpen(false)}} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>}
					</div>
					{dropdownOpen && (
						<div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
							{filteredMenus.length === 0 ? (
								<div className="px-4 py-6 text-center text-sm text-muted-foreground">કોઈ સરખી વાનગી નથી</div>
							) : (
								<div>
									<div className="px-4 pb-2 text-xs text-muted-foreground">આજનું દૈનિક મેનુ</div>
									{filteredMenus.map(entry => {
										const displayName = entry.name
										return (
											<button key={entry.id} type="button" onClick={()=>add(entry.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 first:rounded-t-xl last:rounded-b-xl">
												<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-xs font-bold text-accent-foreground">{displayName.charAt(0)}</div>
												<div className="flex-1 overflow-hidden"><span className="block truncate text-sm font-medium text-foreground">{displayName}</span></div>
											</button>
										)
									})}
								</div>
							)}
						</div>
					)}
				</div>

				{items.length === 0 ? (
					<div className="rounded-lg border-2 border-dashed border-border py-8 text-center mt-4">
						<p className="text-sm text-muted-foreground">અહીંથી રિપોર્ટ માટે વાનગીઓ ઉમેરો</p>
					</div>
				) : (
					<div className="space-y-3 mt-4">
								{items.map(it => {
									const r = recipes.find(x => x.id === it.recipeId)
									if (r) {
										return (
											<div key={it.recipeId} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
												{r.image ? (<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border"><Image src={r.image} alt={r.name} fill sizes="40px" className="object-cover"/></div>) : (<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-xs font-bold text-accent-foreground">{r.name.charAt(0)}</div>)}
												<div className="flex-1 min-w-0">
													<div className="font-semibold text-foreground truncate">{r.name}</div>
												</div>
												<div>
													<Button variant="ghost" size="icon" onClick={()=>remove(it.recipeId)} className="h-8 w-8 text-muted-foreground"><Trash2 className="h-3.5 w-3.5"/></Button>
												</div>
											</div>
										)
									}
									// menu item (not a recipe)
									if (it.recipeId.startsWith('menu:')) {
										const name = decodeURIComponent(it.recipeId.slice(5))
										return (
											<div key={it.recipeId} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-xs font-bold text-accent-foreground">{name.charAt(0)}</div>
												<div className="flex-1 min-w-0">
													<div className="font-semibold text-foreground truncate">{name}</div>
												</div>
												<div>
													<Button variant="ghost" size="icon" onClick={()=>remove(it.recipeId)} className="h-8 w-8 text-muted-foreground"><Trash2 className="h-3.5 w-3.5"/></Button>
												</div>
											</div>
										)
									}
									return null
								})}
					</div>
				)}
			</div>

			<div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-7">
				<div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><span className="text-sm font-bold text-primary">2</span></div><div><h3 className="font-serif text-lg text-foreground">તારીખ પસંદ કરો</h3><p className="text-sm text-muted-foreground">શરૂઆત અને અંત તારીખ પસંદ કરો — અમે આ શ્રેણીમાંનાSaved દૈનિક મેનુઝ પરથી કુલ વજન ગણશે.</p></div></div>
				<div className="flex items-end gap-4 flex-wrap">
					<div className="flex-1 md:max-w-xs">
						<Label htmlFor="startDate" className="mb-1.5 block text-sm font-medium text-foreground">શરૂઆત તારીખ</Label>
						<Input id="startDate" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="h-12 bg-background text-lg" />
					</div>
					<div className="flex-1 md:max-w-xs">
						<Label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-foreground">અંત તારીખ</Label>
						<Input id="endDate" type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="h-12 bg-background text-lg" />
					</div>
					<Button size="lg" className="gap-2" disabled={!canShow || loadingResults} onClick={async ()=>{ setDropdownOpen(false); await computeAndShow() }}><Package className="h-5 w-5" /> જોવો</Button>
				</div>
			</div>



			{(loadingResults || error || showResults) && (
				<div className="space-y-5">
					{loadingResults ? (
						<div className="rounded-xl border border-border bg-card p-5">લોડ કરી રહ્યા છે...</div>
					) : error ? (
						<div className="rounded-xl border border-destructive bg-card p-5 text-destructive">{error}</div>
					) : (
						showResults && (
							<div className="rounded-xl border border-primary/30 bg-primary/5 p-5 md:p-7">
								<div className="mb-3 flex items-center justify-between">
									<div><h3 className="font-serif text-lg text-foreground">રિપોર્ટ</h3><p className="text-sm text-muted-foreground">શોધેલા દિવસોમાંથી ગણતરી કરેલો totals</p></div>
									<div className="flex items-center gap-2">
										<Button size="sm" onClick={handlePrint} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Package className="h-4 w-4" /> PDF ડાઉનલોડ કરો</Button>
									</div>
								</div>
								<div className="grid gap-3">
									{results.map(r => (
										<div key={r.recipe.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
											<div className="min-w-0">
												<div className="font-semibold text-foreground truncate">{r.recipe.name}</div>
												<div className="text-xs text-muted-foreground">કુલ બનાવટ: {r.totalOccurrences} વાર</div>
											</div>
											<div className="text-right">
												<div className="text-sm text-muted-foreground">કુલ: {r.totalProducedAmount !== undefined && r.totalProducedUnit ? formatSmart(r.totalProducedAmount, r.totalProducedUnit) : formatSmart(r.totalProducedBaseUnit, r.recipe.baseUnit)}</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)
					)}
				</div>
			)}
		</div>
	)
}

