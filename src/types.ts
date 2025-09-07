// src/types.ts

/** ---------- Base aliases ---------- */
export type ID = string
export type IsoDate = string        // "YYYY-MM-DD"
export type TimestampISO = string   // full ISO timestamp

/** Roles & enums */
export type Role = "viewer" | "editor" | "admin"
export type Kind = "method" | "glass" | "ice" | "garnish"
export type Unit = "oz" | "barspoon" | "dash" | "drop" | "ml"

/** ---------- Database row shapes (match Supabase tables) ---------- */
export type CocktailRow = {
  id: ID
  name: string
  method: string | null
  glass: string | null
  ice: string | null
  garnish: string | null
  notes: string | null
  price: number | null
  last_special_on: IsoDate | null
  created_at?: TimestampISO
}

export type IngredientRow = {
  id: ID
  name: string
  created_at?: TimestampISO
}

export type RecipeIngredientRow = {
  id?: ID            // optional on insert
  cocktail_id: ID
  ingredient_id: ID
  amount: number
  unit: Unit
  position: number
  created_at?: TimestampISO
}

export type CatalogItemRow = {
  id: ID
  kind: Kind
  name: string
  position: number
  active: boolean
  created_at?: TimestampISO
}

export type ProfileRow = {
  user_id: ID
  role: Role
  display_name?: string | null
  created_at?: TimestampISO
}

/** ---------- UI / form types ---------- */
export type IngredientLine = {
  ingredientName: string
  amount: string   // keep as string in the form; convert to number on save
  unit: Unit
  position: number
}

export type Cocktail = CocktailRow
export type Ingredient = { id: ID; name: string }

/** For printable spec sheets (used by utils/print) */
export type PrintCocktail = {
  id: ID
  name: string
  method?: string | null
  glass?: string | null
  garnish?: string | null
  notes?: string | null
  price?: number | null
  last_special_on?: IsoDate | null
}

/** ---------- Small helpers (optional) ---------- */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Convenient shapes for inserts/upserts
export type CocktailUpsert = Optional<CocktailRow, "id" | "created_at">
export type CatalogItemInsert = Optional<CatalogItemRow, "id" | "created_at">
export type IngredientInsert = Optional<IngredientRow, "id" | "created_at">
export type RecipeIngredientInsert = Optional<RecipeIngredientRow, "id" | "created_at">
