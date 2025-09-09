// src/App.tsx
import { useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabaseClient"

import {
  appWrap, container, inp, btnPrimary, btnSecondary, dangerBtn, th, td, card, colors,
  cocktailCard, specialBadge, priceDisplay, ingredientList, textGradient, shadows
} from "./styles"

import { SettingsBlock } from "./components/SettingsBlock"
import { CocktailForm } from "./components/CocktailForm"
import { IngredientsAdmin } from "./components/IngredientsAdmin"
import { UsersAdmin, type UserRow } from "./components/UsersAdmin"

import { printOnePager } from "./utils/print"
import { ng, normalizeSearchTerm } from "./utils/text"

import type {
  Role, Cocktail as TCocktail, IngredientLine, CatalogItemRow as CatalogItem, Ingredient
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
      if (!session) { setRole("viewer"); return }

      const { data: rows, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1)

      if (error) { console.warn("profiles select failed:", error.message); setRole("viewer"); return }

      let currentRole: string | undefined = rows && (rows[0] as any)?.role
      if (!currentRole) {
        const { error: insErr } = await supabase.from("profiles").insert({ user_id: session.user.id, role: "viewer" })
        if (insErr) { console.warn("profiles insert failed:", insErr.message); setRole("viewer"); return }
        currentRole = "viewer"
      }
      setRole(String(currentRole).trim().toLowerCase() as Role)
    })()
  }, [session])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message); else alert("Check your email for the magic link.")
  }
  async function signOut() { await supabase.auth.signOut() }

  // ---------- ROUTING ----------
  const [route, setRoute] = useState<"main"|"settings"|"ingredients">("main")

  // ---------- CATALOGS ----------
  const [methods, setMethods] = useState<string[]>([])
  const [glasses, setGlasses] = useState<string[]>([])
  const [ices, setIces] = useState<string[]>([])
  const [garnishes, setGarnishes] = useState<string[]>([])

  useEffect(() => { loadCatalog() }, [])
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

  // ---------- COCKTAILS ----------
  const [rows, setRows] = useState<TCocktail[]>([])
  const [specs, setSpecs] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  // search / filters / view / sort
  const [q, setQ] = useState("")
  const [fMethod, setFMethod] = useState("Any")
  const [fGlass, setFGlass] = useState("")
  const [specialOnly, setSpecialOnly] = useState(false)
  const [view, setView] = useState<"cards"|"list">("cards")
  const [sortBy, setSortBy] = useState<"special_desc" | "special_asc" | "name_asc">("special_desc")

  useEffect(() => { load() }, [q, fMethod, fGlass, specialOnly, sortBy])
  async function load() {
    setLoading(true); setErr("")
    let query = supabase.from("cocktails").select("*")

    if (fMethod !== "Any" && fMethod.trim()) query = query.eq("method", fMethod)
    if (fGlass.trim()) query = query.eq("glass", fGlass.trim())
    if (specialOnly) query = query.not("last_special_on","is",null)

    if (sortBy === "name_asc") {
      query = query.order("name", { ascending: true })
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

    // Ingredient search (fuzzy)
    if (q.trim() && finalRows.length) {
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
  const [lines, setLines] = useState<IngredientLine[]>([
    { ingredientName:"", amount:"", unit:"oz", position:1 }
  ])

  function resetForm() {
    setEditingId(null)
    setName(""); setMethod("")
    setGlass(""); setIce(""); setGarnish(""); setNotes("")
    setPrice(""); setSpecialDate("")
    setLines([{ ingredientName:"", amount:"", unit:"oz", position:1 }])
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

    const cocktail = {
      id: editingId ?? undefined,
      name: name.trim(),
      method: method.trim(),
      glass: glass.trim() || null,
      ice: ice.trim() || null,
      garnish: garnish.trim() || null,
      notes: notes.trim() || null,
      price: price === "" ? null : Number(price),
      last_special_on: specialDate || null
    }

    const { data: up, error } = await supabase
      .from("cocktails")
      .upsert(cocktail, { onConflict: "name" })
      .select()
      .single()
    if (error || !up) { setErr(error?.message || "Save failed"); return }
    const cocktailId = (up as any).id as string

    await supabase.from("recipe_ingredients").delete().eq("cocktail_id", cocktailId)

    let pos: number = 1
    for (const ln of lines) {
      const ingName = ln.ingredientName.trim()
      const amtNum = ln.amount === "" ? NaN : Number(ln.amount)
      if (!ng(ingName) || !Number.isFinite(amtNum)) continue
      await supabase.from("ingredients").upsert({ name: ingName }, { onConflict: "name" })
      const { data: ingRow } = await supabase.from("ingredients").select("id").eq("name", ingName).single()
      if (!(ingRow && (ingRow as any).id)) continue
      await supabase.from("recipe_ingredients").insert({
        cocktail_id: cocktailId,
        ingredient_id: (ingRow as any).id as string,
        amount: amtNum,
        unit: ln.unit,
        position: pos
      })
      pos = pos + 1
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

  useEffect(() => { if (route==="ingredients") loadIngredients() }, [route, ingAdminQ])
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
    const { error } = await supabase.from("ingredients").insert({ name })
    if (error) { alert(error.message); return }
    setIngAdminNew("")
    await loadIngredients()
  }
  async function renameIngredient(it: Ingredient) {
    const n = prompt("Rename ingredient", it.name)?.trim()
    if (!n || n === it.name) return
    const { error } = await supabase.from("ingredients").update({ name: n }).eq("id", it.id)
    if (error) { alert(error.message); return }
    await loadIngredients()
  }
  async function deleteIngredient(it: Ingredient) {
    if (!confirm(`Delete "${it.name}"?`)) return
    const { error } = await supabase.from("ingredients").delete().eq("id", it.id)
    if (error) { alert(error.message); return }
    await loadIngredients()
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
    const { data, error } = await supabase.rpc("admin_list_profiles")
    setUsersLoading(false)
    if (error) { alert(error.message); return }
    setUsers((data || []) as UserRow[])
  }
  async function changeUserRole(user_id: string, newRole: Role) {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("user_id", user_id)
    if (error) { alert(error.message); return }
    await loadUsers()
  }
  async function renameUser(user_id: string) {
    const current = users.find(u => u.user_id === user_id)
    const n = prompt("Display name", current?.display_name || "")?.trim()
    if (!n) return
    const { error } = await supabase.from("profiles").update({ display_name: n }).eq("user_id", user_id)
    if (error) { alert(error.message); return }
    await loadUsers()
  }

  // ---------- CARDS GRID REF ----------
  const cardsRef = useRef<HTMLDivElement | null>(null)

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
            <h1 className="gradient-text" style={{ 
              fontSize: 36, 
              fontWeight: 800, 
              margin: 0,
              textShadow: "0 0 20px rgba(102, 126, 234, 0.3)"
            }}>
              🍸 Cocktail Keeper
            </h1>
            {session && (
              <div style={{
                background: colors.glass,
                backdropFilter: "blur(10px)",
                border: `1px solid ${colors.glassBorder}`,
                borderRadius: 20,
                padding: "8px 16px",
                fontSize: 12,
                color: colors.muted,
                fontWeight: 500
              }}>
                {session.user.email} • <span style={{ color: colors.primarySolid, fontWeight: 600 }}>{role}</span>
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

            {(role==="editor" || role==="admin") && (
              <button 
                onClick={()=> setRoute("ingredients")} 
                style={{
                  ...btnSecondary,
                  background: route === "ingredients" ? colors.primarySolid : colors.glass,
                  color: route === "ingredients" ? "white" : colors.text,
                  boxShadow: route === "ingredients" ? shadows.lg : "none"
                }}
              >
                🧪 Ingredients
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
            <>
              <SettingsBlock
                catalog={catalog}
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
              <div style={{ height:12 }} />
              <UsersAdmin
                meEmail={session?.user?.email ?? null}
                users={users}
                loading={usersLoading}
                reload={loadUsers}
                onChangeRole={changeUserRole}
                onRename={renameUser}
              />
            </>
          )
        )}

        {route === "ingredients" && (
          (role==="editor" || role==="admin") ? (
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
          ) : (
            <div style={{ color: colors.muted }}>Ingredients admin is editor-only.</div>
          )
        )}

        {route === "main" && (
          <>
            {/* ENHANCED CONTROLS */}
            <div className="animate-slide-in-right" style={{
              ...card({ marginBottom: 24 }),
              background: colors.glass,
              backdropFilter: "blur(10px)"
            }}>
              <div className="form-controls" style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: 16, 
                alignItems: "center" 
              }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.muted }}>🔍</span>
                  <input 
                    value={q} 
                    onChange={e=>setQ(e.target.value)} 
                    placeholder="Search by ingredient..." 
                    style={{ ...inp, paddingLeft: 40 }}
                  />
                </div>
                
                <select value={fMethod} onChange={e=>setFMethod(e.target.value)} style={inp}>
                  <option>Any Method</option>
                  {methods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                
                <select value={fGlass} onChange={e=>setFGlass(e.target.value)} style={inp}>
                  <option value="">Any Glass</option>
                  {glasses.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                
                <label style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: specialOnly ? colors.primarySolid : "transparent",
                  color: specialOnly ? "white" : colors.text,
                  transition: "all 0.2s ease"
                }}>
                  <input 
                    type="checkbox" 
                    checked={specialOnly} 
                    onChange={e=>setSpecialOnly(e.target.checked)}
                    style={{ margin: 0 }}
                  /> 
                  ⭐ Special only
                </label>
                
                <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={inp}>
                  <option value="special_desc">📅 Last Special (new → old)</option>
                  <option value="special_asc">📅 Last Special (old → new)</option>
                  <option value="name_asc">🔤 Name (A–Z)</option>
                </select>
                
                <button 
                  onClick={()=>setView(v=> v==="cards" ? "list" : "cards")} 
                  style={{
                    ...btnSecondary,
                    background: colors.glass,
                    border: `1px solid ${colors.glassBorder}`
                  }}
                >
                  {view==="cards" ? "📋 List View" : "🎴 Card View"}
                </button>
              </div>
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
                name={name} setName={setName}
                method={method} setMethod={setMethod}
                glass={glass} setGlass={setGlass}
                ice={ice} setIce={setIce}
                garnish={garnish} setGarnish={setGarnish}
                notes={notes} setNotes={setNotes}
                price={price} setPrice={setPrice}
                specialDate={specialDate} setSpecialDate={setSpecialDate}
                lines={lines} setLines={(updater)=> setLines(prev => updater(prev))}
                onClose={()=>{ resetForm(); setFormOpen(false) }}
                onSubmit={save}
                onQueryIngredients={queryIngredients}
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
                    onClick={()=>startEdit(c)}
                    style={{
                      ...cocktailCard,
                      position: "relative",
                      overflow: "hidden",
                      cursor: "pointer",
                      background: c.last_special_on ? 
                        `linear-gradient(135deg, ${colors.panel} 0%, rgba(167, 243, 208, 0.1) 100%)` : 
                        colors.panel,
                      border: c.last_special_on ? 
                        `1px solid ${colors.specialSolid}` : 
                        `1px solid ${colors.border}`,
                      boxShadow: c.last_special_on ? 
                        `0 0 20px rgba(167, 243, 208, 0.2)` : 
                        shadows.md,
                      animationDelay: `${index * 0.1}s`
                    }}
                    title="Click to edit"
                  >
                    {/* Special Badge */}
                    {c.last_special_on && (
                      <div style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        ...specialBadge
                      }}>
                        ⭐ Special
                      </div>
                    )}

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ flex: 1, marginRight: 16 }}>
                        <h3 style={{ 
                          fontWeight: 700, 
                          fontSize: 18, 
                          margin: "0 0 8px 0",
                          ...textGradient(colors.textGradient)
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
                      <div style={{ textAlign: "right" }}>
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

                    {/* Actions */}
                    <div style={{ 
                      display: "flex", 
                      gap: 8, 
                      marginTop: "auto",
                      paddingTop: 16,
                      borderTop: `1px solid ${colors.border}`
                    }}>
                      <button
                        onClick={(e)=>{ e.stopPropagation(); printOnePager(supabase, c, { page: "HalfLetter", orientation: "landscape" }) }}
                        style={{
                          ...btnSecondary,
                          flex: 1,
                          fontSize: 12,
                          padding: "8px 12px"
                        }}
                      >
                        🖨️ Print
                      </button>
                      {(role==="editor" || role==="admin") && (
                        <>
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
                        </>
                      )}
                    </div>
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
                  background: colors.glass,
                  backdropFilter: "blur(10px)"
                }}>
                  <thead style={{ 
                    background: `linear-gradient(135deg, ${colors.panel} 0%, ${colors.glass} 100%)`,
                    color: colors.text
                  }}>
                    <tr>
                      <th style={th}>🍸 Name</th>
                      <th style={th}>🔄 Method</th>
                      <th style={th}>🥃 Glass</th>
                      <th style={th}>💰 Price</th>
                      <th style={th}>🧪 Specs</th>
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
                            `linear-gradient(135deg, ${colors.panel} 0%, rgba(167, 243, 208, 0.05) 100%)` : 
                            "transparent"
                        }} 
                        onClick={()=>startEdit(c)} 
                        title="Click to edit"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = c.last_special_on ? 
                            `linear-gradient(135deg, ${colors.panelHover} 0%, rgba(167, 243, 208, 0.1) 100%)` : 
                            colors.panelHover
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = c.last_special_on ? 
                            `linear-gradient(135deg, ${colors.panel} 0%, rgba(167, 243, 208, 0.05) 100%)` : 
                            "transparent"
                        }}
                      >
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {c.last_special_on && <span style={{ color: colors.specialSolid }}>⭐</span>}
                            <span style={{ 
                              fontWeight: 600,
                              ...textGradient(colors.textGradient)
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
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              onClick={(e)=>{ e.stopPropagation(); printOnePager(supabase, c, { page: "HalfLetter", orientation: "landscape" }) }}
                              style={{
                                ...btnSecondary,
                                fontSize: 11,
                                padding: "6px 10px"
                              }}
                            >
                              🖨️
                            </button>
                            {(role==="editor" || role==="admin") && (
                              <>
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
                              </>
                            )}
                          </div>
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
