import { CATS } from '../data/expenses'

const KEY = 'categories_config'

function defaults() {
  return Object.entries(CATS).map(([key, v]) => ({ key, label: v.label, icon: v.icon, enabled: true }))
}

export function getCategories() {
  try {
    const s = localStorage.getItem(KEY)
    if (!s) return defaults()
    const stored = JSON.parse(s)
    // ensure all built-in cats are present (handles new cats added in future)
    const storedKeys = new Set(stored.map(c => c.key))
    const merged = [...stored]
    for (const d of defaults()) {
      if (!storedKeys.has(d.key)) merged.push(d)
    }
    return merged
  } catch { return defaults() }
}

export function saveCategories(cats) {
  localStorage.setItem(KEY, JSON.stringify(cats))
}
