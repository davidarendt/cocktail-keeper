// src/App.tsx
import { useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabaseClient"

import {
  appWrap, container, inp, btnPrimary, btnSecondary, dangerBtn, th, td, card, colors,
  cocktailCard, specialBadge, ologyBadge, priceDisplay, ingredientList, shadows
} from "./styles"

import { SettingsBlock } from "./components/SettingsBlock"
import { CocktailForm } from "./components/CocktailForm"
import { IngredientsAdmin } from "./components/IngredientsAdmin"
import { UsersAdmin, type UserRow } from "./components/UsersAdmin"

import { ng, normalizeSearchTerm } from "./utils/text"

import type {
  Role, Cocktail as TCocktail, IngredientLine, CatalogItemRow as CatalogItem, Ingredient, Tag
} from "./types"

export default function App() {
  // ---------- AUTH ----------
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role>("viewer")
  const [email, setEmail] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // self-healing role loader
  useEffect(() => {
    (async () => {
      if (!session) { 
        console.log("No session, setting role to viewer")
        setRole("viewer"); 
        return 
      }

      console.log("Loading role for user:", session.user.id, session.user.email)

      const { data: rows, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1)

      if (error) { 
        console.warn("profiles select failed:", error.message); 
        setRole("viewer"); 
        return 
      }

      console.log("Profile query result:", rows)

      let currentRole: string | undefined = rows && (rows[0] as any)?.role
      if (!currentRole) {
        console.log("No role found, creating new profile with viewer role")
        const { error: insErr } = await supabase.from("profiles").insert({ user_id: session.user.id, role: "viewer" })
        if (insErr) { 
          console.warn("profiles insert failed:", insErr.message); 
          setRole("viewer"); 
          return 
        }
        currentRole = "viewer"
      }
      
      console.log("Setting role to:", currentRole)
      setRole(String(currentRole).trim().toLowerCase() as Role)
    })()
  }, [session])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setErr("")
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setErr(error.message)
    } else {
      setErr("✅ Check your email for the magic link!")
    }
  }
  async function signOut() { await supabase.auth.signOut() }


  // ---------- ROUTING ----------
  const [route, setRoute] = useState<"main"|"settings">("main")
  const [settingsTab, setSettingsTab] = useState<"methods"|"glasses"|"ices"|"garnishes"|"tags"|"ingredients"|"users">("methods")
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3B82F6")


  // ---------- CATALOGS ----------
  const [methods, setMethods] = useState<string[]>([])
  const [glasses, setGlasses] = useState<string[]>([])
  const [ices, setIces] = useState<string[]>([])
  const [garnishes, setGarnishes] = useState<string[]>([])

  useEffect(() => { loadCatalog(); loadTags() }, [])
  async function loadCatalog() {
    const { data } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("active", true)
      .order("kind")
      .order("position")
    const rows = (data || []) as CatalogItem[]
    setMethods(rows.filter(r=>r.kind==="method").map(r=>r.name))
    setGlasses(rows.filter(r=>r.kind==="glass").map(r=>r.name))
    setIces(rows.filter(r=>r.kind==="ice").map(r=>r.name))
    setGarnishes(rows.filter(r=>r.kind==="garnish").map(r=>r.name))
  }

  async function loadTags() {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .order("name")
    setAvailableTags(data || [])
  }

  // ---------- COCKTAILS ----------
  const [rows, setRows] = useState<TCocktail[]>([])
  const [specs, setSpecs] = useState<Record<string, string[]>>({})
  const [cocktailTags, setCocktailTags] = useState<Record<string, Tag[]>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  // search / filters / view / sort
  const [q, setQ] = useState("")
  const [nameSearch, setNameSearch] = useState("")
  const [ingredientFilters, setIngredientFilters] = useState<string[]>([])
  const [fMethod, setFMethod] = useState("Any")
  const [fGlass, setFGlass] = useState("")
  const [specialOnly, setSpecialOnly] = useState(false)
  const [ologyOnly, setOlogyOnly] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [view, setView] = useState<"cards"|"list">("cards")
  const [sortBy, setSortBy] = useState<"special_desc" | "special_asc" | "name_asc" | "name_desc">("special_desc")

  useEffect(() => { load() }, [q, nameSearch, fMethod, fGlass, specialOnly, ologyOnly, sortBy, ingredientFilters, selectedTags])
  async function load() {
    setLoading(true); setErr("")
    let query = supabase.from("cocktails").select("*")

    if (fMethod !== "Any" && fMethod.trim()) query = query.eq("method", fMethod)
    if (fGlass.trim()) query = query.eq("glass", fGlass.trim())
    if (specialOnly) query = query.not("last_special_on","is",null)
    if (ologyOnly) query = query.eq("is_ology_recipe", true)
    if (nameSearch.trim()) query = query.ilike("name", `%${nameSearch.trim()}%`)
    
    // Tag filtering - cocktails must have ALL selected tags
    if (selectedTags.length > 0) {
      const { data: taggedCocktails } = await supabase
        .from("cocktail_tags")
        .select("cocktail_id")
        .in("tag_id", selectedTags)
      
      if (taggedCocktails?.length) {
        // Group by cocktail_id and count tags
        const cocktailTagCounts = taggedCocktails.reduce((acc: Record<string, number>, ct: any) => {
          acc[ct.cocktail_id] = (acc[ct.cocktail_id] || 0) + 1
          return acc
        }, {})
        
        // Only include cocktails that have ALL the selected tags
        const cocktailIds = Object.keys(cocktailTagCounts)
          .filter(id => cocktailTagCounts[id] === selectedTags.length)
        
        if (cocktailIds.length > 0) {
          query = query.in("id", cocktailIds)
        } else {
          query = query.eq("id", -1) // no results
        }
      } else {
        query = query.eq("id", -1) // no results
      }
    }

    if (sortBy === "name_asc") {
      query = query.order("name", { ascending: true })
    } else if (sortBy === "name_desc") {
      query = query.order("name", { ascending: false })
    } else {
      const asc = sortBy === "special_asc"
      query = query
        .order("last_special_on", { ascending: asc, nullsFirst: asc })
        .order("name", { ascending: true })
    }
    query = query.limit(500)

    const { data: base, error } = await query
    if (error) { setErr(error.message); setLoading(false); return }

    let finalRows = (base || []) as TCocktail[]

    // Ingredient search (multiple filters or single fuzzy)
    if (ingredientFilters.length > 0 && finalRows.length) {
      const ids = finalRows.map(c=>c.id)
      const { data: rec, error: rerr } = await supabase
        .from("recipe_ingredients")
        .select("cocktail_id, ingredient:ingredients(name)")
        .in("cocktail_id", ids)
      if (rerr) { setErr(rerr.message); setLoading(false); return }
      
      // Group by cocktail_id and count matching ingredients
      const cocktailIngredientCounts = (rec || []).reduce((acc: Record<string, number>, r: any) => {
        const ingredientName = (r.ingredient?.name || "").toLowerCase()
        const matches = ingredientFilters.some(filter => {
          const filterLower = filter.toLowerCase()
          const words = ingredientName.split(/\s+/)
          const wordStart = words.some((w: string) => w.startsWith(filterLower))
          const contains = ingredientName.includes(filterLower) || ingredientName.replace(/\s+/g,"").includes(normalizeSearchTerm(filter))
          return wordStart || contains
        })
        
        if (matches) {
          acc[r.cocktail_id] = (acc[r.cocktail_id] || 0) + 1
        }
        return acc
      }, {})
      
      // Only include cocktails that have ALL the filtered ingredients
      const matchIds = new Set(
        Object.keys(cocktailIngredientCounts)
          .filter(id => cocktailIngredientCounts[id] === ingredientFilters.length)
      )
      finalRows = finalRows.filter(c => matchIds.has(c.id))
    } else if (q.trim() && finalRows.length) {
      // Fallback to single ingredient search for backward compatibility
      const ids = finalRows.map(c=>c.id)
      const { data: rec, error: rerr } = await supabase
        .from("recipe_ingredients")
        .select("cocktail_id, ingredient:ingredients(name)")
        .in("cocktail_id", ids)
      if (rerr) { setErr(rerr.message); setLoading(false); return }
      const typed = q.trim().toLowerCase()
      const typedC = normalizeSearchTerm(q.trim())
      const matchIds = new Set(
        (rec || []).filter((r:any) => {
          const n = (r.ingredient?.name || "").toLowerCase()
          const words = n.split(/\s+/)
          const wordStart = words.some((w: string) => w.startsWith(typed))
          const contains = n.includes(typed) || n.replace(/\s+/g,"").includes(typedC)
          return wordStart || contains
        }).map((r:any)=> r.cocktail_id)
      )
      finalRows = finalRows.filter(c => matchIds.has(c.id))
    }

    setRows(finalRows)
    await loadSpecsFor(finalRows.map(c=>c.id))
    await loadTagsForCocktails(finalRows.map(c=>c.id))
    setLoading(false)
  }

  async function loadSpecsFor(ids: string[]) {
    if (!ids.length) { setSpecs({}); return }
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("cocktail_id, amount, unit, position, ingredient:ingredients(name)")
      .in("cocktail_id", ids)
      .order("position", { ascending: true })
    const map: Record<string, string[]> = {}
    for (const r of (data || []) as any[]) {
      const k = r.cocktail_id as string
      const amtNum = Number(r.amount)
      const amtStr = Number.isFinite(amtNum) ? String(amtNum) : String(r.amount ?? "")
      const unit = r.unit ? ` ${r.unit}` : ""
      const ing = r.ingredient?.name ? ` ${r.ingredient.name}` : ""
      const line = `${amtStr}${unit}${ing}`.trim()
      ;(map[k] ||= []).push(line)
    }
    setSpecs(map)
  }

  async function loadTagsForCocktails(ids: string[]) {
    if (!ids.length) { setCocktailTags({}); return }
    const { data } = await supabase
      .from("cocktail_tags")
      .select("cocktail_id, tag:tags(id, name, color)")
      .in("cocktail_id", ids)
    const grouped = (data || []).reduce((acc: Record<string, Tag[]>, r: any) => {
      if (!acc[r.cocktail_id]) acc[r.cocktail_id] = []
      if (r.tag) acc[r.cocktail_id].push(r.tag)
      return acc
    }, {})
    setCocktailTags(grouped)
  }

  // ---------- FORM ----------
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [method, setMethod] = useState("")
  const [glass, setGlass] = useState("")
  const [ice, setIce] = useState("")
  const [garnish, setGarnish] = useState("")
  const [notes, setNotes] = useState("")
  const [price, setPrice] = useState("")
  const [specialDate, setSpecialDate] = useState("") // YYYY-MM-DD
  const [isOlogyRecipe, setOlogyRecipe] = useState(false)
  const [lines, setLines] = useState<IngredientLine[]>([
    { ingredientName:"", amount:"", unit:"oz", position:1 }
  ])

  function resetForm() {
    setEditingId(null)
    setName(""); setMethod("")
    setGlass(""); setIce(""); setGarnish(""); setNotes("")
    setPrice(""); setSpecialDate(""); setOlogyRecipe(false)
    setLines([{ ingredientName:"", amount:"", unit:"oz", position:1 }])
    setSelectedTags([])
  }
  function openAddForm() { resetForm(); setFormOpen(true) }

  async function startEdit(c: TCocktail) {
    resetForm()
    setEditingId(c.id)
    setFormOpen(true)
    setName(c.name)
    setMethod(c.method || "")
    setGlass(c.glass || ""); setIce(c.ice || ""); setGarnish(c.garnish || ""); setNotes(c.notes || "")
    setPrice(c.price == null ? "" : String(c.price))
    setSpecialDate(c.last_special_on || "")
    setOlogyRecipe(c.is_ology_recipe || false)
    
    // Load tags for this cocktail
    const { data: cocktailTags } = await supabase
      .from("cocktail_tags")
      .select("tag_id")
      .eq("cocktail_id", c.id)
    setSelectedTags(cocktailTags?.map(ct => ct.tag_id) || [])

    const { data } = await supabase
      .from("recipe_ingredients")
      .select("amount, unit, position, ingredient:ingredients(name)")
      .eq("cocktail_id", c.id)
      .order("position", { ascending: true })

    const mapped: IngredientLine[] = (data||[]).map((r:any,i:number)=>({
      ingredientName: r.ingredient?.name || "",
      amount: String(r.amount ?? ""),
      unit: (r.unit || "oz"),
      position: typeof r.position === "number" ? r.position : (i + 1)
    }))
    setLines(mapped.length ? mapped : [{ ingredientName:"", amount:"", unit:"oz", position:1 }])
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function remove(cId: string) {
    if (!confirm("Delete this cocktail?")) return
    const { error } = await supabase.from("cocktails").delete().eq("id", cId)
    if (error) { setErr(error.message); return }
    setRows(prev=> prev.filter(r=> r.id !== cId))
    if (editingId === cId) { resetForm(); setFormOpen(false) }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    if (!name.trim()) { setErr("Name required"); return }
    if (!method.trim()) { setErr("Choose a method"); return }

    // Check if user is authenticated
    if (!session) {
      setErr("You must be logged in to save cocktails");
      return;
    }

    // Debug: Log user info
    console.log("User session:", {
      userId: session.user.id,
      email: session.user.email,
      role: role
    });

    // Check if user has permission to create cocktails
    if (role !== "editor" && role !== "admin") {
      setErr("You don't have permission to create cocktails. Your role: " + role);
      return;
    }

    const cocktail = {
      id: editingId ?? undefined,
      name: name.trim(),
      method: method.trim(),
      glass: glass.trim() || null,
      ice: ice.trim() || null,
      garnish: garnish.trim() || null,
      notes: notes.trim() || null,
      price: price === "" ? null : Number(price),
      last_special_on: specialDate || null,
      is_ology_recipe: isOlogyRecipe
    }

    const { data: up, error } = await supabase
      .from("cocktails")
      .upsert(cocktail, { onConflict: "name" })
      .select()
      .single()
    
    if (error) {
      console.error("Save error:", error);
      if (error.message.includes("row-level security")) {
        setErr("Permission denied. Please check your user role and database policies.");
      } else {
        setErr(error.message || "Save failed");
      }
      return;
    }
    
    if (!up) { 
      setErr("Save failed - no data returned"); 
      return;
    }
    const cocktailId = (up as any).id as string

    await supabase.from("recipe_ingredients").delete().eq("cocktail_id", cocktailId)

    let pos: number = 1
    for (const ln of lines) {
      const ingName = ln.ingredientName.trim()
      const amtNum = ln.amount === "" ? NaN : Number(ln.amount)
      if (!ng(ingName) || !Number.isFinite(amtNum)) continue
      
      // Insert ingredient with error handling
      const { error: ingError } = await supabase.from("ingredients").upsert({ name: ingName }, { onConflict: "name" })
      if (ingError) {
        console.error("Ingredient insert error:", ingError);
        setErr(`Failed to save ingredient "${ingName}": ${ingError.message}`);
        return;
      }
      
      const { data: ingRow, error: ingSelectError } = await supabase.from("ingredients").select("id").eq("name", ingName).single()
      if (ingSelectError || !(ingRow && (ingRow as any).id)) {
        console.error("Ingredient select error:", ingSelectError);
        setErr(`Failed to find ingredient "${ingName}"`);
        return;
      }
      
      // Insert recipe ingredient with error handling
      const { error: recipeError } = await supabase.from("recipe_ingredients").insert({
        cocktail_id: cocktailId,
        ingredient_id: (ingRow as any).id as string,
        amount: amtNum,
        unit: ln.unit,
        position: pos
      })
      
      if (recipeError) {
        console.error("Recipe ingredient insert error:", recipeError);
        setErr(`Failed to save recipe ingredient: ${recipeError.message}`);
        return;
      }
      
      pos = pos + 1
    }

    // Handle tags
    await supabase.from("cocktail_tags").delete().eq("cocktail_id", cocktailId)
    if (selectedTags.length > 0) {
      const tagInserts = selectedTags.map(tagId => ({
        cocktail_id: cocktailId,
        tag_id: tagId
      }))
      const { error: tagError } = await supabase.from("cocktail_tags").insert(tagInserts)
      if (tagError) {
        console.error("Tag insert error:", tagError);
        setErr(`Failed to save tags: ${tagError.message}`);
        return;
      }
    }

    await load()
    resetForm()
    setFormOpen(false)
  }

  // ingredient suggestions
  async function queryIngredients(term: string): Promise<string[]> {
    const t = term.trim()
    if (!t) return []
    const { data } = await supabase
      .from("ingredients")
      .select("name")
      .ilike("name", `%${t}%`)
      .limit(50)

    const tl = t.toLowerCase()
    const tC = normalizeSearchTerm(t)

    const scored: { name: string; score: number }[] = (data || [])
      .map((d:any)=> d.name as string)
      .map((name: string) => {
        const lower = name.toLowerCase()
        const words = lower.split(/\s+/)
        const score: number =
          (lower.startsWith(tl) ? 0 : 100) +
          (words.some((w:string)=> w.startsWith(tl)) ? 0 : 50) +
          ((lower.includes(tl) || lower.replace(/\s+/g,"").includes(tC)) ? 1 : 200)
        return { name, score }
      })

    return scored
      .sort((a,b)=> a.score - b.score)
      .slice(0, 10)
      .map(x => x.name)
  }

  // ---------- SETTINGS (catalogs) ----------
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [newName, setNewName] = useState<Partial<Record<"method"|"glass"|"ice"|"garnish", string>>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => { if (route==="settings" && role==="admin") reloadSettings() }, [route, role])
  async function reloadSettings() {
    setCatLoading(true)
    const { data } = await supabase.from("catalog_items").select("*").order("kind").order("position")
    setCatalog((data || []) as CatalogItem[])
    setCatLoading(false)
  }
  const handleNewNameChange = (k: "method"|"glass"|"ice"|"garnish", v: string) =>
    setNewName(prev => ({ ...prev, [k]: v }))

  async function addCatalog(kind: "method"|"glass"|"ice"|"garnish") {
    const n = (newName[kind] || "").trim()
    if (!n) return
    const maxPos = Math.max(0, ...catalog.filter(c=>c.kind===kind).map(c=>c.position))
    const { error } = await supabase.from("catalog_items").insert({ kind, name: n, position: maxPos + 1, active: true })
    if (!error) { setNewName(p => ({ ...p, [kind]: "" })); await reloadSettings(); await loadCatalog() }
  }

  async function addCatalogItem(kind: "method" | "glass" | "ice" | "garnish", name: string) {
    try {
      const maxPos = Math.max(0, ...catalog.filter(c=>c.kind===kind).map(c=>c.position))
      const { error } = await supabase.from("catalog_items").insert({ kind, name, position: maxPos + 1, active: true })
      if (error) throw error
      await reloadSettings()
      await loadCatalog()
    } catch (err) {
      console.error("add catalog item error:", err)
      throw err
    }
  }

  // Ingredient filter management
  function addIngredientFilter(ingredient: string) {
    const trimmed = ingredient.trim()
    if (trimmed && !ingredientFilters.includes(trimmed)) {
      setIngredientFilters(prev => [...prev, trimmed])
    }
  }

  function removeIngredientFilter(ingredient: string) {
    setIngredientFilters(prev => prev.filter(f => f !== ingredient))
  }

  function clearAllIngredientFilters() {
    setIngredientFilters([])
  }

  // Tag management
  function toggleTag(tagId: string) {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  function clearAllTags() {
    setSelectedTags([])
  }

  // Tag management functions
  async function addTag(name: string, color: string = '#3B82F6') {
    try {
      const { error } = await supabase.from("tags").insert({ name: name.trim(), color })
      if (error) throw error
      await loadTags()
    } catch (err) {
      console.error("add tag error:", err)
      setErr(err instanceof Error ? err.message : "Failed to add tag")
    }
  }

  async function renameTag(tag: Tag) {
    const newName = prompt(`Rename tag "${tag.name}":`, tag.name)?.trim()
    if (!newName || newName === tag.name) return
    try {
      const { error } = await supabase.from("tags").update({ name: newName }).eq("id", tag.id)
      if (error) throw error
      await loadTags()
    } catch (err) {
      console.error("rename tag error:", err)
      setErr(err instanceof Error ? err.message : "Failed to rename tag")
    }
  }

  async function deleteTag(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from all cocktails.`)) return
    try {
      const { error } = await supabase.from("tags").delete().eq("id", tag.id)
      if (error) throw error
      await loadTags()
    } catch (err) {
      console.error("delete tag error:", err)
      setErr(err instanceof Error ? err.message : "Failed to delete tag")
    }
  }
  async function renameCatalog(item: CatalogItem) {
    const n = prompt(`Rename ${item.kind}`, item.name)?.trim()
    if (!n || n === item.name) return
    await supabase.from("catalog_items").update({ name: n }).eq("id", item.id)
    await reloadSettings(); await loadCatalog()
  }
  async function toggleCatalog(item: CatalogItem) {
    await supabase.from("catalog_items").update({ active: !item.active }).eq("id", item.id)
    await reloadSettings(); await loadCatalog()
  }
  async function deleteCatalog(item: CatalogItem) {
    if (!confirm(`Delete "${item.name}" from ${item.kind}?`)) return
    await supabase.from("catalog_items").delete().eq("id", item.id)
    await reloadSettings(); await loadCatalog()
  }
  function onDragStart(e: React.DragEvent<HTMLTableRowElement>, id: string) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = "move"
  }
  function onDragOver(e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }
  async function onDrop(kind: "method"|"glass"|"ice"|"garnish", targetId: string) {
    if (!draggingId || draggingId === targetId) return
    const list = catalog.filter(c=>c.kind===kind).sort((a,b)=> a.position-b.position)
    const from = list.findIndex(x=>x.id===draggingId)
    const to = list.findIndex(x=>x.id===targetId)
    if (from < 0 || to < 0) return
    const newList = list.slice()
    const [moved] = newList.splice(from,1)
    newList.splice(to,0,moved)
    for (let i=0;i<newList.length;i++) {
      const item = newList[i]
      if (item.position !== i+1) {
        await supabase.from("catalog_items").update({ position: i+1 }).eq("id", item.id)
      }
    }
    setDraggingId(null)
    await reloadSettings(); await loadCatalog()
  }

  // ---------- INGREDIENTS ADMIN ----------
  const [ingAdmin, setIngAdmin] = useState<Ingredient[]>([])
  const [ingAdminLoading, setIngAdminLoading] = useState(false)
  const [ingAdminQ, setIngAdminQ] = useState("")
  const [ingAdminNew, setIngAdminNew] = useState("")
  const [mergeFrom, setMergeFrom] = useState("")
  const [mergeTo, setMergeTo] = useState("")
  const [mergeBusy, setMergeBusy] = useState(false)
  const [mergeMsg, setMergeMsg] = useState("")

  useEffect(() => { if (route==="settings" && settingsTab==="ingredients") loadIngredients() }, [route, settingsTab, ingAdminQ])
  async function loadIngredients() {
    setIngAdminLoading(true)
    const base = supabase.from("ingredients").select("id,name").order("name")
    const { data } = ingAdminQ.trim()
      ? await base.ilike("name", `%${ingAdminQ.trim()}%`)
      : await base
    setIngAdmin((data || []) as Ingredient[])
    setIngAdminLoading(false)
  }
  async function addIngredient(name: string) {
    try {
      console.log(`Adding ingredient: "${name}"`)
      console.log("User session:", { userId: session?.user?.id, email: session?.user?.email, role })
      
      // Check if user has permission to add ingredients
      if (role !== "editor" && role !== "admin") {
        setErr("Permission denied. Only editors and admins can add ingredients.")
        return
      }
      
      const { error } = await supabase.from("ingredients").insert({ name })
      
      if (error) {
        console.error("Ingredient insert error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have the required privileges to add ingredients.")
        } else {
          setErr(`Failed to add ingredient: ${error.message}`)
        }
        return
      }
      
      console.log(`Successfully added ingredient: "${name}"`)
      setIngAdminNew("")
      await loadIngredients()
    } catch (err) {
      console.error("Unexpected error adding ingredient:", err)
      setErr("Failed to add ingredient. Please try again.")
    }
  }
  async function renameIngredient(it: Ingredient) {
    try {
      const n = prompt("Rename ingredient", it.name)?.trim()
      if (!n || n === it.name) return
      
      // Check if user has permission to rename ingredients
      if (role !== "editor" && role !== "admin") {
        setErr("Permission denied. Only editors and admins can rename ingredients.")
        return
      }
      
      console.log(`Renaming ingredient "${it.name}" to "${n}"`)
      const { error } = await supabase.from("ingredients").update({ name: n }).eq("id", it.id)
      
      if (error) {
        console.error("Ingredient rename error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have the required privileges to rename ingredients.")
        } else {
          setErr(`Failed to rename ingredient: ${error.message}`)
        }
        return
      }
      
      console.log(`Successfully renamed ingredient to "${n}"`)
      await loadIngredients()
    } catch (err) {
      console.error("Unexpected error renaming ingredient:", err)
      setErr("Failed to rename ingredient. Please try again.")
    }
  }
  async function deleteIngredient(it: Ingredient) {
    try {
      if (!confirm(`Delete "${it.name}"?`)) return
      
      // Check if user has permission to delete ingredients
      if (role !== "editor" && role !== "admin") {
        setErr("Permission denied. Only editors and admins can delete ingredients.")
        return
      }
      
      console.log(`Deleting ingredient: "${it.name}"`)
      const { error } = await supabase.from("ingredients").delete().eq("id", it.id)
      
      if (error) {
        console.error("Ingredient delete error:", error)
        if (error.message.includes("row-level security")) {
          alert("Permission denied. You may not have the required privileges to delete ingredients.")
        } else {
          alert(`Failed to delete ingredient: ${error.message}`)
        }
        return
      }
      
      console.log(`Successfully deleted ingredient: "${it.name}"`)
      await loadIngredients()
    } catch (err) {
      console.error("Unexpected error deleting ingredient:", err)
      alert("Failed to delete ingredient. Please try again.")
    }
  }
  async function doMergeWith(from: string, to: string) {
    setMergeMsg("")
    const s = from.trim(), t = to.trim()
    if (!s || !t) { setMergeMsg("Pick both ingredients."); return }
    if (s.toLowerCase() === t.toLowerCase()) { setMergeMsg("Source and target are the same."); return }
    if (!confirm(`Merge "${s}" INTO "${t}"?\nAll uses of "${s}" will be changed to "${t}".`)) return
    setMergeBusy(true)
    const { data, error } = await supabase.rpc("merge_ingredients", { source_name: s, target_name: t })
    setMergeBusy(false)
    if (error) { setMergeMsg(error.message); return }
    setMergeMsg(`Merged. ${data?.moved ?? 0} specs updated.`)
    setMergeFrom(""); setMergeTo("")
    await loadIngredients()
    await load()
  }

  // ---------- USERS (ADMIN) ----------
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (route === "settings" && role === "admin") { loadUsers() }
  }, [route, role])

  async function loadUsers() {
    setUsersLoading(true)
    try {
      // Try the RPC function first
      const { data, error } = await supabase.rpc("admin_list_profiles")
      if (error) {
        console.warn("RPC function failed, trying direct query:", error.message)
        // Fallback to direct query if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("profiles")
          .select(`
            user_id,
            role,
            display_name,
            created_at,
            auth_users:user_id(email)
          `)
          .order("created_at", { ascending: false })
        
        if (fallbackError) {
          console.error("Fallback query failed:", fallbackError)
          setErr(`Failed to load users: ${fallbackError.message}`)
          setUsersLoading(false)
          return
        }
        
        // Transform the fallback data to match UserRow format
        const transformedData = (fallbackData || []).map((row: any) => ({
          user_id: row.user_id,
          email: row.auth_users?.email || null,
          role: row.role,
          display_name: row.display_name,
          created_at: row.created_at
        }))
        
        setUsers(transformedData as UserRow[])
      } else {
        setUsers((data || []) as UserRow[])
      }
    } catch (err) {
      console.error("Unexpected error loading users:", err)
      setErr("Failed to load users. Please check your database permissions.")
    }
    setUsersLoading(false)
  }
  async function changeUserRole(user_id: string, newRole: Role) {
    try {
      console.log(`Changing user ${user_id} role to ${newRole}`)
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("user_id", user_id)
      
      if (error) {
        console.error("Role change error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have admin privileges to change user roles.")
        } else {
          setErr(`Failed to change user role: ${error.message}`)
        }
        return
      }
      
      // Reload users to show the change
      await loadUsers()
      console.log(`Successfully changed user role to ${newRole}`)
    } catch (err) {
      console.error("Unexpected error changing user role:", err)
      setErr("Failed to change user role. Please try again.")
    }
  }
  async function renameUser(user_id: string) {
    try {
      const current = users.find(u => u.user_id === user_id)
      const n = prompt("Display name", current?.display_name || "")?.trim()
      if (!n) return
      
      console.log(`Renaming user ${user_id} to ${n}`)
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: n })
        .eq("user_id", user_id)
      
      if (error) {
        console.error("Rename error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have admin privileges to rename users.")
        } else {
          setErr(`Failed to rename user: ${error.message}`)
        }
        return
      }
      
      await loadUsers()
      console.log(`Successfully renamed user to ${n}`)
    } catch (err) {
      console.error("Unexpected error renaming user:", err)
      setErr("Failed to rename user. Please try again.")
    }
  }

  // ---------- CARDS GRID REF ----------
  const cardsRef = useRef<HTMLDivElement | null>(null)

  // ---------- DEBUG: Test database permissions ----------
  async function testDatabasePermissions() {
    if (!session) return;
    
    try {
      // Test basic select
      const { data: testData, error: testError } = await supabase
        .from("cocktails")
        .select("id")
        .limit(1);
      
      console.log("Database test - Select:", { testData, testError });
      
      // Test profile access
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      
      console.log("Database test - Profile:", { profileData, profileError });
      
    } catch (error) {
      console.error("Database test error:", error);
    }
  }

  // Run test when session changes
  useEffect(() => {
    if (session) {
      testDatabasePermissions();
    }
  }, [session]);

  // ---------- RENDER ----------
  return (
    <div style={appWrap}>
      <div style={container}>
        {/* ENHANCED HEADER */}
        <header className="animate-fade-in-up" style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 32,
          padding: "24px 0",
          borderBottom: `1px solid ${colors.border}`,
          position: "relative"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h1 
              className="gradient-text" 
              onClick={() => setRoute("main")}
              style={{ 
              fontSize: 36, 
              fontWeight: 800, 
              margin: 0,
                color: colors.accent,
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)"
                e.currentTarget.style.color = colors.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.color = colors.accent
              }}
            >
              🍸 Ology Cocktail Keeper
            </h1>
            {session && (
              <div style={{
                background: colors.glass,
                border: `1px solid ${colors.glassBorder}`,
                borderRadius: 20,
                padding: "8px 16px",
                fontSize: 12,
                color: colors.muted,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 12
              }}>
                <span>
                {session.user.email} • <span style={{ color: colors.primarySolid, fontWeight: 600 }}>{role}</span>
                </span>
              </div>
            )}
          </div>
          
          <nav style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button 
              onClick={()=> setRoute("main")} 
              style={{
                ...btnSecondary,
                background: route === "main" ? colors.primarySolid : colors.glass,
                color: route === "main" ? "white" : colors.text,
                boxShadow: route === "main" ? shadows.lg : "none"
              }}
            >
              🏠 Home
            </button>

            {role==="admin" && (
              <button 
                onClick={()=> setRoute("settings")} 
                style={{
                  ...btnSecondary,
                  background: route === "settings" ? colors.primarySolid : colors.glass,
                  color: route === "settings" ? "white" : colors.text,
                  boxShadow: route === "settings" ? shadows.lg : "none"
                }}
                title="Manage dropdown lists and user access"
              >
                ⚙️ Settings
              </button>
            )}


            {session ? (
              <button onClick={signOut} style={btnSecondary}>
                🚪 Sign out
              </button>
            ) : (
              <form onSubmit={signIn} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input 
                  value={email} 
                  onChange={e=>setEmail(e.target.value)} 
                  placeholder="your@email.com" 
                  style={{ ...inp, minWidth: 200 }}
                  type="email"
                />
                <button type="submit" style={btnPrimary}>
                  ✨ Magic link
                </button>
              </form>
            )}
          </nav>
        </header>

        {/* ENHANCED ERROR BOX */}
        {err && (
          <div style={{
            ...card({ 
              border: `1px solid ${colors.dangerSolid}`, 
              background: "rgba(239, 68, 68, 0.1)",
              color: "#fecaca",
              marginBottom: 24
            }),
            boxShadow: `0 0 20px rgba(239, 68, 68, 0.2)`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontWeight: 500 }}>{err}</span>
            </div>
          </div>
        )}

        {/* ROUTES */}
        {route === "settings" && (
          role !== "admin" ? (
            <div style={{ color: colors.muted }}>Settings are admin-only.</div>
          ) : (
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <h2 style={{ 
                marginBottom: 24, 
                fontSize: 24, 
                fontWeight: 700,
                color: colors.text,
                textAlign: "center"
              }}>
                ⚙️ Settings
              </h2>
              
              {/* Settings Menu */}
              <div style={{
                ...card({ marginBottom: 24 }),
                background: colors.glass
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  padding: 20
                }}>
                  <button
                    onClick={() => setSettingsTab("methods")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "methods" ? colors.accent : colors.glass,
                      color: settingsTab === "methods" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "methods" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🔄</span>
                    <span>Methods</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Shake, Stir, Build, etc.
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("glasses")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "glasses" ? colors.accent : colors.glass,
                      color: settingsTab === "glasses" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "glasses" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🥃</span>
                    <span>Glasses</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Coupe, Highball, etc.
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("ices")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "ices" ? colors.accent : colors.glass,
                      color: settingsTab === "ices" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "ices" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🧊</span>
                    <span>Ice</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Cubed, Crushed, etc.
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("garnishes")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "garnishes" ? colors.accent : colors.glass,
                      color: settingsTab === "garnishes" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "garnishes" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🌿</span>
                    <span>Garnishes</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Lime, Cherry, etc.
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("tags")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "tags" ? colors.accent : colors.glass,
                      color: settingsTab === "tags" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "tags" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🏷️</span>
                    <span>Tags</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Cocktail Categories & Labels
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("ingredients")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "ingredients" ? colors.accent : colors.glass,
                      color: settingsTab === "ingredients" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "ingredients" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🧪</span>
                    <span>Ingredients</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Manage Ingredient Database
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("users")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "users" ? colors.accent : colors.glass,
                      color: settingsTab === "users" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "users" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>👥</span>
                    <span>Users</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Manage User Roles & Access
                    </span>
                  </button>
                </div>
              </div>

              {/* Settings Content */}
              {settingsTab === "methods" && (
                <SettingsBlock
                  catalog={catalog.filter(c => c.kind === "method")}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                />
              )}

              {settingsTab === "glasses" && (
                <SettingsBlock
                  catalog={catalog.filter(c => c.kind === "glass")}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                />
              )}

              {settingsTab === "ices" && (
                <SettingsBlock
                  catalog={catalog.filter(c => c.kind === "ice")}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                />
              )}

              {settingsTab === "garnishes" && (
                <SettingsBlock
                  catalog={catalog.filter(c => c.kind === "garnish")}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                />
              )}

              {settingsTab === "tags" && (
                <div style={{
                  ...card({ marginBottom: 24 }),
                  background: colors.panel,
                  padding: 24
                }}>
                  <h3 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 600, color: colors.text }}>
                    🏷️ Tag Management
                  </h3>
                  
                  {/* Add New Tag */}
                  <div style={{ marginBottom: 24, padding: 16, background: colors.glass, borderRadius: 8 }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: colors.text }}>
                      Add New Tag
                    </h4>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        placeholder="Tag name..."
                        style={{ ...inp, flex: 1 }}
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={e => setNewTagColor(e.target.value)}
                        style={{ width: 40, height: 40, border: "none", borderRadius: 6, cursor: "pointer" }}
                      />
                      <button
                        onClick={() => {
                          if (newTagName.trim()) {
                            addTag(newTagName.trim(), newTagColor)
                            setNewTagName("")
                            setNewTagColor("#3B82F6")
                          }
                        }}
                        style={{
                          ...btnPrimary,
                          padding: "8px 16px",
                          fontSize: 14
                        }}
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Tags List */}
                  <div style={{ display: "grid", gap: 12 }}>
                    {availableTags.map(tag => (
                      <div
                        key={tag.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: 12,
                          background: colors.glass,
                          borderRadius: 8,
                          border: `1px solid ${colors.glassBorder}`
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            background: tag.color
                          }}
                        />
                        <span style={{ flex: 1, fontWeight: 500, color: colors.text }}>
                          {tag.name}
                        </span>
                        <button
                          onClick={() => renameTag(tag)}
                          style={{
                            ...btnSecondary,
                            fontSize: 12,
                            padding: "4px 8px"
                          }}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => deleteTag(tag)}
                          style={{
                            ...dangerBtn,
                            fontSize: 12,
                            padding: "4px 8px"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === "ingredients" && (
                <IngredientsAdmin
                  items={ingAdmin}
                  loading={ingAdminLoading}
                  q={ingAdminQ}
                  setQ={setIngAdminQ}
                  newName={ingAdminNew}
                  setNewName={setIngAdminNew}
                  onAdd={addIngredient}
                  onRename={renameIngredient}
                  onDelete={deleteIngredient}
                  mergeFrom={mergeFrom}
                  setMergeFrom={setMergeFrom}
                  mergeTo={mergeTo}
                  setMergeTo={setMergeTo}
                  onMerge={doMergeWith}
                  mergeBusy={mergeBusy}
                  mergeMsg={mergeMsg}
                />
              )}

              {settingsTab === "users" && (
              <UsersAdmin
                meEmail={session?.user?.email ?? null}
                users={users}
                loading={usersLoading}
                reload={loadUsers}
                onChangeRole={changeUserRole}
                onRename={renameUser}
              />
              )}
            </div>
          )
        )}


        {route === "main" && (
          <>
            {/* COMPACT FILTER CONTROLS */}
            <div className="animate-slide-in-right" style={{
              ...card({ marginBottom: 24 }),
              background: colors.glass
            }}>
              {/* Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `1px solid ${colors.glassBorder}`
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.text,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  🔍 Search & Filter
                </h3>
                <div style={{ fontSize: 12, color: colors.muted }}>
                  {rows.length} cocktail{rows.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "auto auto auto auto auto auto auto auto auto", 
                gap: 8, 
                alignItems: "center" 
              }}>
                {/* View Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: colors.muted }}>View:</span>
                  <button 
                    onClick={()=>setView(v=> v==="cards" ? "list" : "cards")} 
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: "4px 6px",
                      background: view === "cards" ? colors.accent : colors.glass,
                      color: view === "cards" ? "white" : colors.text,
                      border: `1px solid ${view === "cards" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 4,
                      minWidth: 32
                    }}
                  >
                    {view==="cards" ? "📋" : "🎴"}
                  </button>
                </div>


                {/* Cocktail Name Search */}
                <div style={{ position: "relative" }}>
                  <input 
                    value={nameSearch} 
                    onChange={e=>setNameSearch(e.target.value)} 
                    placeholder="🍸 Name..." 
                    style={{ 
                      ...inp, 
                      paddingLeft: 8,
                      paddingRight: nameSearch ? 24 : 8,
                      fontSize: 12,
                      minWidth: 100
                    }}
                  />
                  {nameSearch && (
                    <button
                      onClick={() => setNameSearch("")}
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: colors.muted,
                        cursor: "pointer",
                        fontSize: 10,
                        padding: 1
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Ingredients Search */}
                <div style={{ position: "relative" }}>
                  <input 
                    value={q} 
                    onChange={e=>setQ(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === "Enter" && q.trim()) {
                        addIngredientFilter(q.trim())
                        setQ("")
                      }
                    }}
                    placeholder="🔍 Ingredient..." 
                    style={{ 
                      ...inp, 
                      paddingLeft: 8,
                      paddingRight: q ? 24 : 8,
                      fontSize: 12,
                      minWidth: 100
                    }}
                  />
                  {q && (
                    <button
                      onClick={() => {
                        if (q.trim()) {
                          addIngredientFilter(q.trim())
                          setQ("")
                        } else {
                          setQ("")
                        }
                      }}
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: colors.muted,
                        cursor: "pointer",
                        fontSize: 10,
                        padding: 1
                      }}
                    >
                      {q.trim() ? "➕" : "✕"}
                    </button>
                  )}
                </div>
                
                {/* Method Filter */}
                <select value={fMethod} onChange={e=>setFMethod(e.target.value)} style={{...inp, fontSize: 12, minWidth: 80}}>
                  <option value="">Method</option>
                  {methods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                
                {/* Glass Filter */}
                <select value={fGlass} onChange={e=>setFGlass(e.target.value)} style={{...inp, fontSize: 12, minWidth: 80}}>
                  <option value="">Glass</option>
                  {glasses.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                
                {/* Tags Filter */}
                <select 
                  value="" 
                  onChange={e => {
                    if (e.target.value) {
                      toggleTag(e.target.value)
                      e.target.value = ""
                    }
                  }}
                  style={{...inp, fontSize: 12, minWidth: 80}}
                >
                  <option value="">🏷️ Tags</option>
                  {availableTags.map(tag => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                
                {/* Sort */}
                <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{...inp, fontSize: 12, minWidth: 100}}>
                  <option value="special_desc">📅 Special</option>
                  <option value="special_asc">📅 Old Special</option>
                  <option value="name_asc">🔤 A-Z</option>
                  <option value="name_desc">🔤 Z-A</option>
                </select>
                
                {/* Special Toggle */}
                <button
                  onClick={() => setSpecialOnly(!specialOnly)}
                  style={{
                    ...btnSecondary,
                    fontSize: 11,
                    padding: "4px 8px",
                    background: specialOnly ? colors.primarySolid : colors.glass,
                    color: specialOnly ? "white" : colors.text,
                    border: `1px solid ${specialOnly ? colors.primarySolid : colors.glassBorder}`,
                    borderRadius: 4,
                    minWidth: 50
                  }}
                >
                  ⭐ Special
                </button>

                {/* Menu Items Toggle */}
                <button
                  onClick={() => setOlogyOnly(!ologyOnly)}
                  style={{
                    ...btnSecondary,
                    fontSize: 11,
                    padding: "4px 8px",
                    background: ologyOnly ? colors.accent : colors.glass,
                    color: ologyOnly ? "white" : colors.text,
                    border: `1px solid ${ologyOnly ? colors.accent : colors.glassBorder}`,
                    borderRadius: 4,
                    minWidth: 50
                  }}
                >
                  🍸 Menu
                </button>

              </div>


              {/* Active Filters Row */}
              {(ingredientFilters.length > 0 || nameSearch || fMethod || fGlass || specialOnly || ologyOnly || selectedTags.length > 0) && (
                <div style={{ 
                  display: "flex", 
                  gap: 8, 
                  alignItems: "center",
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${colors.glassBorder}`
                }}>
                  <span style={{ fontSize: 12, color: colors.muted, marginRight: 8 }}>Active:</span>
                  
                  {ingredientFilters.map((ingredient, index) => (
                    <span key={index} style={{
                      background: colors.primarySolid,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🔍 {ingredient}
                      <button
                        onClick={() => removeIngredientFilter(ingredient)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                  cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  
                  {selectedTags.map((tagId) => {
                    const tag = availableTags.find(t => t.id === tagId)
                    return tag ? (
                      <span key={tagId} style={{
                        background: colors.accent,
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        🏷️ {tag.name}
                        <button
                          onClick={() => toggleTag(tagId)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 10,
                            padding: 0
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ) : null
                  })}
                  
                  {nameSearch && (
                    <span style={{
                      background: colors.accent,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🍸 {nameSearch}
                      <button
                        onClick={() => setNameSearch("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {q && (
                    <span style={{
                      background: colors.primarySolid,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🔍 {q}
                <button 
                        onClick={() => setQ("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {fMethod && (
                    <span style={{
                      background: colors.glassBorder,
                      color: colors.text,
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🥃 {fMethod}
                      <button
                        onClick={() => setFMethod("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: colors.text,
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {fGlass && (
                    <span style={{
                      background: colors.glassBorder,
                      color: colors.text,
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🥃 {fGlass}
                      <button
                        onClick={() => setFGlass("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: colors.text,
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {specialOnly && (
                    <span style={{
                      background: colors.primarySolid,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      ⭐ Special
                      <button
                        onClick={() => setSpecialOnly(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {ologyOnly && (
                    <span style={{
                      background: colors.accent,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🍸 Menu
                      <button
                        onClick={() => setOlogyOnly(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  <button
                    onClick={() => {
                      setQ("")
                      setNameSearch("")
                      setFMethod("")
                      setFGlass("")
                      setSpecialOnly(false)
                      setOlogyOnly(false)
                      clearAllIngredientFilters()
                      clearAllTags()
                    }}
                  style={{
                    ...btnSecondary,
                      fontSize: 11,
                      padding: "4px 8px",
                    background: colors.glass,
                      border: `1px solid ${colors.glassBorder}`,
                      borderRadius: 6,
                      marginLeft: "auto"
                  }}
                >
                    🗑️ Clear All
                </button>
              </div>
              )}
            </div>

            {/* ENHANCED ADD BUTTON */}
            {(role === "editor" || role === "admin") && !formOpen && (
              <div style={{ marginBottom: 24, textAlign: "center" }}>
                <button 
                  onClick={openAddForm} 
                  style={{
                    ...btnPrimary,
                    background: colors.accent,
                    fontSize: 16,
                    padding: "16px 32px",
                    borderRadius: 12,
                    boxShadow: shadows.lg
                  }}
                >
                  ✨ Create New Cocktail
                </button>
              </div>
            )}

            {/* FORM */}
            {(role === "editor" || role === "admin") && formOpen && (
              <CocktailForm
                editingId={editingId}
                methods={methods}
                glasses={glasses}
                ices={ices}
                garnishes={garnishes}
                availableTags={availableTags}
                name={name} setName={setName}
                method={method} setMethod={setMethod}
                glass={glass} setGlass={setGlass}
                ice={ice} setIce={setIce}
                garnish={garnish} setGarnish={setGarnish}
                notes={notes} setNotes={setNotes}
                price={price} setPrice={setPrice}
                specialDate={specialDate} setSpecialDate={setSpecialDate}
                isOlogyRecipe={isOlogyRecipe} setOlogyRecipe={setOlogyRecipe}
                lines={lines} setLines={(updater)=> setLines(prev => updater(prev))}
                selectedTags={selectedTags} setSelectedTags={setSelectedTags}
                onClose={()=>{ resetForm(); setFormOpen(false) }}
                onSubmit={save}
            onQueryIngredients={queryIngredients}
            onAddCatalogItem={addCatalogItem}
            onAddTag={addTag}
              />
            )}

            {/* RESULTS */}
            {loading ? (
              <div>Loading…</div>
            ) : rows.length === 0 ? (
              <div style={{ color: colors.muted }}>No results.</div>
            ) : view==="cards" ? (
              <div
                ref={cardsRef}
                className="cocktail-grid"
                style={{
                  display: "grid",
                  gap: 16,
                }}
              >
                {rows.map((c, index) => (
                  <div
                    key={c.id}
                    className="card-hover animate-fade-in-up"
                    onClick={() => startEdit(c)}
                    style={{
                      ...cocktailCard,
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                      background: c.last_special_on ? 
                        colors.special : 
                        colors.panel,
                      border: c.last_special_on ? 
                        `1px solid ${colors.specialSolid}` : 
                        `1px solid ${colors.border}`,
                      boxShadow: c.last_special_on ? 
                        shadows.glow : 
                        shadows.md,
                      animationDelay: `${index * 0.1}s`
                    }}
                    title="Click to edit"
                  >
                    {/* Header with name, price, and special badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ flex: 1, marginRight: 16 }}>
                        <h3 style={{ 
                          fontWeight: 700, 
                          fontSize: 18, 
                          margin: "0 0 8px 0",
                          color: colors.accent
                        }}>
                          {c.name}
                        </h3>
                        <div style={{ 
                          fontSize: 13, 
                          color: colors.muted,
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}>
                          {c.method && <span>🔄 {c.method}</span>}
                          {c.glass && <span>🥃 {c.glass}</span>}
                        </div>
                      </div>
                      <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "flex-end",
                        gap: 8
                      }}>
                        {/* Badges */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {c.last_special_on && (
                          <div style={specialBadge}>
                            ⭐ Special
                          </div>
                        )}
                          {c.is_ology_recipe && (
                            <div style={ologyBadge}>
                              🍸 Menu
                            </div>
                          )}
                        </div>
                        
                        {/* Tags */}
                {cocktailTags[c.id] && cocktailTags[c.id].length > 0 && (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 8
                  }}>
                    {cocktailTags[c.id].map(tag => (
                      <span
                        key={tag.id}
                        style={{
                          background: colors.accent,
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}
                      >
                        🏷️ {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                        {/* Price */}
                        {c.price != null && (
                          <div style={priceDisplay}>
                            ${Number(c.price).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ 
                        fontSize: 12, 
                        color: colors.muted, 
                        margin: "0 0 8px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 600
                      }}>
                        🧪 Ingredients
                      </h4>
                      <ul style={{
                        ...ingredientList,
                        fontSize: 13,
                        color: colors.text
                      }}>
                        {(specs[c.id] || []).map((l, i) => (
                          <li key={i} style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 8,
                            padding: "4px 0"
                          }}>
                            <span style={{ color: colors.primarySolid }}>•</span>
                            {l}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Notes */}
                    {c.notes && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ 
                          fontSize: 12, 
                          color: colors.muted, 
                          margin: "0 0 8px 0",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 600
                        }}>
                          📝 Notes
                        </h4>
                        <div style={{
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: colors.text,
                          background: colors.panel,
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${colors.border}`,
                          fontStyle: "italic"
                        }}>
                          {c.notes}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {(role==="editor" || role==="admin") && (
                      <div style={{ 
                        display: "flex", 
                        gap: 8, 
                        marginTop: "auto",
                        paddingTop: 16,
                        borderTop: `1px solid ${colors.border}`
                      }}>
                        <button 
                          onClick={(e)=>{ e.stopPropagation(); startEdit(c) }} 
                          style={{
                            ...btnSecondary,
                            flex: 1,
                            fontSize: 12,
                            padding: "8px 12px"
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={(e)=>{ e.stopPropagation(); remove(c.id) }} 
                          style={{
                            ...dangerBtn,
                            flex: 1,
                            fontSize: 12,
                            padding: "8px 12px"
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table-responsive" style={{ 
                  minWidth: 800, 
                  width: "100%", 
                  borderCollapse: "collapse", 
                  ...card({ padding: 0 }),
                  background: colors.glass
                }}>
                  <thead style={{ 
                    background: colors.panel,
                    color: colors.text
                  }}>
                    <tr>
                      <th style={th}>🍸 Name</th>
                      <th style={th}>🔄 Method</th>
                      <th style={th}>🥃 Glass</th>
                      <th style={th}>💰 Price</th>
                      <th style={th}>🧪 Specs</th>
                      <th style={th}>📝 Notes</th>
                      <th style={th}>⚡ Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(c => (
                      <tr 
                        key={c.id} 
                        style={{ 
                          borderTop: `1px solid ${colors.border}`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: c.last_special_on ? 
                            colors.special : 
                            "transparent"
                        }} 
                        onClick={() => startEdit(c)} 
                        title="Click to edit"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = c.last_special_on ? 
                            colors.special : 
                            colors.panelHover
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = c.last_special_on ? 
                            colors.special : 
                            "transparent"
                        }}
                      >
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {c.last_special_on && <span style={{ color: colors.specialSolid }}>⭐</span>}
                            {c.is_ology_recipe && <span style={{ color: colors.accent }}>🍸</span>}
                            <span style={{ 
                              fontWeight: 600,
                              color: colors.accent
                            }}>
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td style={td}>{c.method || "—"}</td>
                        <td style={td}>{c.glass || "—"}</td>
                        <td style={td}>
                          {c.price != null ? (
                            <span style={priceDisplay}>
                              ${Number(c.price).toFixed(2)}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={td}>
                          <ul style={{ 
                            margin: 0, 
                            paddingLeft: 0,
                            listStyle: "none"
                          }}>
                            {(specs[c.id] || []).slice(0, 3).map((l, i) => (
                              <li key={i} style={{ 
                                fontSize: 12,
                                color: colors.muted,
                                padding: "2px 0"
                              }}>
                                • {l}
                              </li>
                            ))}
                            {(specs[c.id] || []).length > 3 && (
                              <li style={{ 
                                fontSize: 11,
                                color: colors.muted,
                                fontStyle: "italic"
                              }}>
                                +{(specs[c.id] || []).length - 3} more...
                              </li>
                            )}
                          </ul>
                        </td>
                        <td style={td}>
                          {c.notes ? (
                            <div style={{
                              fontSize: 12,
                              lineHeight: 1.4,
                              color: colors.text,
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }} title={c.notes}>
                              {c.notes}
                            </div>
                          ) : "—"}
                        </td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          {(role==="editor" || role==="admin") && (
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button 
                                onClick={(e)=>{ e.stopPropagation(); startEdit(c) }} 
                                style={{
                                  ...btnSecondary,
                                  fontSize: 11,
                                  padding: "6px 10px"
                                }}
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={(e)=>{ e.stopPropagation(); remove(c.id) }} 
                                style={{
                                  ...dangerBtn,
                                  fontSize: 11,
                                  padding: "6px 10px"
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
