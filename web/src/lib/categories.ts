import type { Category } from './types'

// category or subcategory id → its top-level category
export const parentsById = (categories: Category[]) =>
  new Map(categories.flatMap((c) => [[c.id, c] as const, ...c.subcategories.map((s) => [s.id, c] as const)]))
