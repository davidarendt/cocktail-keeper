import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import type { Session } from "@supabase/supabase-js"

// ---------- Types ----------
type Unit = "oz"|"barspoon"|"dash"|"drop"|"ml"

type Cocktail = {
  id: string
  name: string
  method: string // flexible method
  glass: string | null
  ice: string | null
  garnish: string | null
  notes: string | null
  price: number | null
  on_menu: boolean
  last_special_at: string | null
}

type IngredientLine = {
  ingredientName: string
  amount: string
  unit: Unit
  position: number
}

type CatalogItem = {
  id: string
  kind: "method" | "glass" | "ice" | "garnish"
  name: string
  position: number
  active: boolean
}

// ---------- App ----------
export default function App() {
  // auth
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<"viewer"|"editor">("viewer")
  const [email, setEmail] = useState("")

  // routing
  const [route, setRoute] = useState<"main"|"settings">("main")

  // catalog dropdowns
  const [methods, setMethods] = useState<string[]>([])
  const [glasses, setGlasses] = useState<string[]>([])
  const [ices, setIces] = useState<string[]>([])
  const [garnishes, setGarnishes] = useState<string[]>([])

  // data + specs
  const [rows, setRows] = useState<Cocktail[]>([])
  const [specs, setSpecs] = useState<Record<string, string[]>>({}) // cocktail_id -> ["2 oz Gin", ...]
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>("")

  // filters / search / view
  const [q, setQ] = useState("") // ingredient search
  const [fMethod, setFMethod] = useState<string>("Any")
  const [fGlass, setFGlass] = useState("")
  const [specialOnly, setSpecialOnly] = useState(false)
  const [view, setView] = useState<"cards"|"list">("cards")

  // form open/close + fields
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [method, setMethod] = useState<string>("") // required, no default; shows placeholder
  const [glass, setGlass] = useState("")
  const [ice, setIce] = useState("")
  const [garnish, setGarnish] = useState("")
  const [notes, setNotes] = useState("")
  const [price, setPrice] = useState<string>("")
  const [onMenu, setOnMenu] = useState(false)
  const [markSpecialNow, setMarkSpecialNow] = useState(false)
  const [lines, setLines] = useState<IngredientLine[]>([{ ingredientName:"", amount:"", unit:"oz", position:1 }])

  // ingredient typeahead
  const [ingSuggest, setIngSuggest] = useState<string[]>([])
  const [suggestFor, setSuggestFor] = useState<number | null>(null)

  // ---------- AUTH ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    (async () => {
      if (!session) { setRole("viewer"); return }
      const { data } = await supabase.from("profiles").select("role").eq("user_id", session.user.id).single()
      setRole(((data?.role as any) || "viewer") as "viewer"|"editor")
    })()
  }, [session])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message); else alert("Check your email for the magic link.")
  }
  async function signOut() { await supabase.auth.signOut() }

  // ---------- CATALOG (dropdown sources) ----------
  useEffect(() => { loadCatalog() }, [])
  async function loadCatalog() {
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("active", true)
      .order("kind", { ascending: true })
      .order("position", { ascending: true })
    if (error) return
    const methodList = (data||[]).filter(d => d.kind === "method").map(d => d.name)
    const glassList  = (data||[]).filter(d => d.kind === "glass").map(d => d.name)
    const iceList    = (data||[]).filter(d => d.kind === "ice").map(d => d.name)
    const garList    = (data||[]).filter(d => d.kind === "garnish").map(d => d.name)
    setMethods(methodList)
    setGlasses(glassList)
    setIces(iceList)
    setGarnishes(garList)
  }

  // ---------- LOAD LIST ----------
  useEffect(() => { load() }, [q, fMethod, fGlass, specialOnly])
  async function load() {
    setLoading(true); setErr("")
    let query = supabase.from("cocktails").select("*").order("last_special_at",{ascending:false}).limit(500)
    if (fMethod !== "Any" && fMethod.trim()) query = query.eq("method", fMethod)
    if (fGlass.trim()) query = query.eq("glass", fGlass.trim())
    if (specialOnly) query = query.not("last_special_at","is",null)
    const { data: base, error } = await query
    if (error) { setErr(error.message); setLoading(false); return }
    let finalRows = base || []

    // Ingredient search (prioritize word-start matches)
    if (q.trim() && finalRows.length) {
      const ids = finalRows.map(c=>c.id)
      const { data: rec } = await supabase
        .from("recipe_ingredients")
        .select("cocktail_id, ingredient:ingredients(name)")
        .in("cocktail_id", ids)

      const typed = q.trim().toLowerCase()
      const typedC = typed.replace(/\s+/g,"")
      const matchIds = new Set(
        (rec || []).filter((r:any) => {
          const n = (r.ingredient?.name || "").toLowerCase()
          const words: string[] = n.split(/\s+/)
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
    const { data: rec } = await supabase
      .from("recipe_ingredients")
      .select("cocktail_id, amount, unit, position, ingredient:ingredients(name)")
      .in("cocktail_id", ids)
      .order("position", { ascending: true })
    const map: Record<string,string[]> = {}
    for (const r of (rec||[]) as any[]) {
      const k = r.cocktail_id
      const line = `${Number(r.amount)} ${r.unit} ${r.ingredient?.name || ""}`.trim()
      ;(map[k] ||= []).push(line)
    }
    setSpecs(map)
  }

  // ---------- ING TYPEAHEAD (word-start prioritized) ----------
  async function fetchIngSuggest(s: string, rowIndex: number) {
    setSuggestFor(rowIndex)
    if (!s.trim()) { setIngSuggest([]); return }
    const { data } = await supabase.from("ingredients").select("name").ilike("name", `%${s.trim()}%`).limit(50)
    const term = s.trim().toLowerCase()
    const termC = term.replace(/\s+/g,"")
    const ranked = (data || [])
  .map((d: { name: string }) => d.name)
  .map((name: string) => {
    const lower = name.toLowerCase()
    const words: string[] = lower.split(/\s+/)
    const score =
      (lower.startsWith(term) ? 0 : 100) +
      (words.some((w: string) => w.startsWith(term)) ? 0 : 50) +
      ((lower.includes(term) || lower.replace(/\s+/g, "").includes(termC)) ? 1 : 200)
    return { name, score }
  })
  .sort((a, b) => a.score - b.score)
  .slice(0, 10)
  .map((x: { name: string; score: number }) => x.name)
    setIngSuggest(ranked)
  }

  // ---------- FORM HELPERS ----------
  function resetForm() {
    setEditingId(null)
    setName(""); setMethod(""); // placeholder until chosen
    setGlass(""); setIce(""); setGarnish(""); setNotes("")
    setPrice(""); setOnMenu(false); setMarkSpecialNow(false)
    setLines([{ ingredientName:"", amount:"", unit:"oz", position:1 }])
  }
  function openAddForm() { resetForm(); setFormOpen(true) }

  async function startEdit(c: Cocktail) {
    resetForm()
    setEditingId(c.id)
    setFormOpen(true)
    setName(c.name)
    setMethod(c.method || "")
    setGlass(c.glass||""); setIce(c.ice||""); setGarnish(c.garnish||""); setNotes(c.notes||"")
    setPrice(c.price==null ? "" : String(c.price))
    setOnMenu(!!c.on_menu)

    const { data } = await supabase
      .from("recipe_ingredients")
      .select("amount, unit, position, ingredient:ingredients(name)")
      .eq("cocktail_id", c.id)
      .order("position", { ascending: true })
    const mapped: IngredientLine[] = (data||[]).map((r:any,i:number)=>({
      ingredientName: r.ingredient?.name || "",
      amount: String(r.amount ?? ""),
      unit: (r.unit || "oz") as Unit,
      position: r.position ?? i+1
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
      on_menu: onMenu,
      last_special_at: markSpecialNow ? new Date().toISOString() : undefined
    }

    const { data: up, error } = await supabase.from("cocktails").upsert(cocktail, { onConflict: "name" }).select().single()
    if (error || !up) { setErr(error?.message || "Save failed"); return }
    const cocktailId = up.id as string

    await supabase.from("recipe_ingredients").delete().eq("cocktail_id", cocktailId)

    let pos = 1
    for (const ln of lines) {
      const ingName = ln.ingredientName.trim()
      const amt = ln.amount === "" ? NaN : Number(ln.amount)
      if (!ingName || !isFinite(amt)) continue
      await supabase.from("ingredients").upsert({ name: ingName }, { onConflict: "name" })
      const { data: ingRow } = await supabase.from("ingredients").select("id").eq("name", ingName).single()
      if (!ingRow) continue
      await supabase.from("recipe_ingredients").insert({
        cocktail_id: cocktailId,
        ingredient_id: ingRow.id,
        amount: amt,
        unit: ln.unit,
        position: pos++
      })
    }

    await load()
    resetForm()
    setFormOpen(false)
  }

  // ---------- PRINT ----------
  async function printOnePager(c: Cocktail) {
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("amount, unit, position, ingredient:ingredients(name)")
      .eq("cocktail_id", c.id)
      .order("position", { ascending: true })
    const lines = (data||[]).map((r:any)=> `${r.amount} ${r.unit} ${r.ingredient?.name || ""}`)
    const w = window.open("", "_blank", "width=800,height=1000"); if (!w) return
    w.document.write(`
      <html><head><title>${escapeHtml(c.name)}</title>
      <style>
        @page { size: A5; margin: 14mm; }
        body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial; color:#111; }
        h1 { margin:0 0 6px; font-size:22px; }
        .muted { color:#555; font-size:12px; }
        ul { margin:8px 0 12px; padding-left:18px; } li{ margin:3px 0; }
        .row{ margin:6px 0; } .box{ border:1px solid #ddd; border-radius:8px; padding:10px; }
      </style></head><body>
        <h1>${escapeHtml(c.name)}</h1>
        <div class="muted">${escapeHtml(c.method)}${c.glass ? " • "+escapeHtml(c.glass) : ""}</div>
        <div class="row box">
          <strong>Specs</strong>
          <ul>${lines.map(l=> `<li>${escapeHtml(l)}</li>`).join("")}</ul>
          ${c.garnish ? `<div><strong>Garnish:</strong> ${escapeHtml(c.garnish)}</div>` : ""}
          ${c.notes ? `<div class="row"><strong>Notes:</strong> ${escapeHtml(c.notes)}</div>` : ""}
        </div>
        <div class="muted">Price: ${c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}${c.last_special_at ? " • Special" : ""}</div>
        <script>window.print();</script>
      </body></html>
    `)
    w.document.close()
  }

  // ---------- SETTINGS (editor only) ----------
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [newName, setNewName] = useState<{[k in CatalogItem["kind"]]?: string}>({})

  useEffect(() => { if (route==="settings") reloadSettings() }, [route])
  async function reloadSettings() {
    setCatLoading(true)
    const { data } = await supabase.from("catalog_items").select("*").order("kind").order("position")
    setCatalog(data || [])
    setCatLoading(false)
  }

  async function addCatalog(kind: CatalogItem["kind"]) {
    const name = (newName[kind] || "").trim()
    if (!name) return
    const maxPos = Math.max(0, ...catalog.filter(c=>c.kind===kind).map(c=>c.position))
    const { error } = await supabase.from("catalog_items").insert({ kind, name, position: maxPos + 1, active: true })
    if (!error) { setNewName(p => ({ ...p, [kind]: "" })); await reloadSettings(); await loadCatalog() }
  }

  async function renameCatalog(item: CatalogItem) {
    const name = prompt(`Rename ${item.kind}`, item.name)?.trim()
    if (!name || name === item.name) return
    await supabase.from("catalog_items").update({ name }).eq("id", item.id)
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

  // ---------- RENDER ----------
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#e5e7eb", fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial" }}>
      <div style={{ maxWidth: 1120, margin:"0 auto", padding:24 }}>
        {/* HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <h1 style={{ fontSize:28, fontWeight:800 }}>Cocktail Keeper</h1>
          <div style={{ display:"flex", gap:8 }}>
            {role==="editor" && (
              <button onClick={()=> setRoute(route==="main"?"settings":"main")} style={btnSecondary}>
                {route==="main" ? "Settings" : "← Back"}
              </button>
            )}
            {session ? (
              <>
                <span style={{ fontSize:12, color:"#9ca3af", alignSelf:"center" }}>
                  {session.user.email} • <b>{role}</b>
                </span>
                <button onClick={signOut} style={btnSecondary}>Sign out</button>
              </>
            ) : (
              <form onSubmit={signIn} style={{ display:"flex", gap:8 }}>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email" style={inp} />
                <button type="submit" style={btnPrimary}>Magic link</button>
              </form>
            )}
          </div>
        </div>

        {/* ERROR BOX */}
        {err && (
          <div style={{ background:"#1f2937", border:"1px solid #374151", padding:12, borderRadius:12, color:"#fecaca", marginBottom:12 }}>
            {err}
          </div>
        )}

        {/* SETTINGS PAGE */}
        {route === "settings" ? (
          role !== "editor" ? (
            <div style={{ color:"#9ca3af" }}>Settings are editor-only.</div>
          ) : (
            <div>
              <p style={{ color:"#9ca3af", marginBottom:12 }}>Edit dropdown lists for Method, Glass, Ice, Garnish. Items marked inactive won’t appear in forms/filters.</p>

              {(["method","glass","ice","garnish"] as const).map(kind => (
                <div key={kind} style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:12, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <strong style={{ textTransform:"capitalize" }}>{kind}</strong>
                    <div style={{ display:"flex", gap:8 }}>
                      <input
                        value={newName[kind] || ""}
                        onChange={e=> setNewName(prev => ({ ...prev, [kind]: e.target.value }))}
                        placeholder={`Add ${kind}…`} style={inp}
                      />
                      <button onClick={()=>addCatalog(kind)} style={btnPrimary}>Add</button>
                    </div>
                  </div>

                  {catLoading ? (
                    <div>Loading…</div>
                  ) : (
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr>
                        <th style={th}>Name</th><th style={th}>Active</th><th style={th}></th>
                      </tr></thead>
                      <tbody>
                        {catalog.filter(c=>c.kind===kind).sort((a,b)=> a.position-b.position || a.name.localeCompare(b.name)).map(item => (
                          <tr key={item.id} style={{ borderTop:"1px solid #1f2937" }}>
                            <td style={td}>{item.name}</td>
                            <td style={td}>
                              <label style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                                <input type="checkbox" checked={item.active} onChange={()=>toggleCatalog(item)} /> {item.active ? "Active" : "Inactive"}
                              </label>
                            </td>
                            <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                              <button onClick={()=>renameCatalog(item)} style={btnSecondary}>Rename</button>
                              <button onClick={()=>deleteCatalog(item)} style={dangerBtn}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            {/* CONTROLS */}
            <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr 1fr 1fr auto", gap:8, marginBottom:12 }}>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by ingredient (e.g., lemon)" style={inp} />
              <select value={fMethod} onChange={e=>setFMethod(e.target.value)} style={inp}>
                <option>Any</option>
                {methods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={fGlass} onChange={e=>setFGlass(e.target.value)} style={inp}>
                <option value="">Any glass</option>
                {glasses.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                <input type="checkbox" checked={specialOnly} onChange={e=>setSpecialOnly(e.target.checked)} /> Special only
              </label>
              <div style={{ textAlign:"right" }}>
                <button onClick={()=>setView(v=> v==="cards" ? "list" : "cards")} style={btnSecondary}>
                  {view==="cards" ? "List" : "Cards"}
                </button>
              </div>
            </div>

            {/* ADD BUTTON (editor) */}
            {role === "editor" && !formOpen && (
              <div style={{ marginBottom:12 }}>
                <button onClick={openAddForm} style={btnPrimary}>+ New cocktail</button>
              </div>
            )}

            {/* FORM (editor) */}
            {role === "editor" && formOpen && (
              <form onSubmit={save} style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:12, marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <strong>{editingId ? "Edit cocktail" : "Create cocktail"}</strong>
                  <div style={{ display:"flex", gap:8 }}>
                    <button type="button" onClick={()=>{ resetForm(); setFormOpen(false) }} style={btnSecondary}>Close</button>
                    <button type="submit" style={btnPrimary}>{editingId ? "Save changes" : "Create"}</button>
                  </div>
                </div>

                {/* Row 1 */}
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" style={inp} />
                  <select value={method} onChange={e=>setMethod(e.target.value)} style={inp}>
                    <option value="" disabled>Stir/Shake/Build in glass</option>
                    {methods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={glass} onChange={e=>setGlass(e.target.value)} style={inp}>
                    <option value="">Glass…</option>
                    {glasses.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select value={ice} onChange={e=>setIce(e.target.value)} style={inp}>
                    <option value="">Ice…</option>
                    {ices.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <select value={garnish} onChange={e=>setGarnish(e.target.value)} style={inp}>
                    <option value="">Garnish…</option>
                    {garnishes.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                {/* Notes / price / flags */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" style={{ ...inp, minHeight:60, resize:"vertical" }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inp} />
                    <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                      <input type="checkbox" checked={onMenu} onChange={e=>setOnMenu(e.target.checked)} /> On menu
                    </label>
                    <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                      <input type="checkbox" checked={markSpecialNow} onChange={e=>setMarkSpecialNow(e.target.checked)} /> Mark as Special now
                    </label>
                  </div>
                </div>

                {/* Ingredient lines */}
                <div style={{ marginTop:10, fontWeight:700 }}>Ingredients</div>
                <div style={{ display:"grid", gap:8 }}>
                  {lines.map((ln, i) => (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr .8fr .8fr auto", gap:8 }}>
                      <div style={{ position:"relative" }}>
                        <input
                          value={ln.ingredientName}
                          onChange={e=>{
                            const v = e.target.value
                            setLines(prev => prev.map((x,idx)=> idx===i ? { ...x, ingredientName:v } : x))
                            fetchIngSuggest(v, i)
                          }}
                          onFocus={()=> fetchIngSuggest(ln.ingredientName, i)}
                          placeholder="Ingredient (e.g., Fresh Lemon Juice)" style={inp}
                        />
                        {suggestFor===i && ingSuggest.length>0 && (
                          <div style={{ position:"absolute", zIndex:10, top:"100%", left:0, right:0, background:"#0b1020", border:"1px solid #1f2937", borderRadius:10, padding:6 }}>
                            {ingSuggest.map(s => (
                              <div key={s} onMouseDown={()=>{
                                  setLines(prev => prev.map((x,idx)=> idx===i ? { ...x, ingredientName:s } : x))
                                  setSuggestFor(null); setIngSuggest([])
                                }} style={{ padding:"6px 8px", cursor:"pointer" }}>{s}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <input value={ln.amount} onChange={e=>setLines(prev=> prev.map((x,idx)=> idx===i ? { ...x, amount:e.target.value } : x))} placeholder="Amount" type="number" step="0.01" style={inp} />
                      <select value={ln.unit} onChange={e=>setLines(prev=> prev.map((x,idx)=> idx===i ? { ...x, unit:e.target.value as Unit } : x))} style={inp}>
                        <option value="oz">oz</option><option value="barspoon">barspoon</option><option value="dash">dash</option><option value="drop">drop</option><option value="ml">ml</option>
                      </select>
                      <div style={{ display:"flex", gap:8 }}>
                        <button type="button" onClick={()=>{
                          setLines(prev => prev.filter((_,idx)=> idx!==i).map((x,idx)=> ({...x, position: idx+1})))
                        }} style={btnSecondary}>Remove</button>
                        {i===lines.length-1 && (
                          <button type="button" onClick={()=>{
                            setLines(prev => [...prev, { ingredientName:"", amount:"", unit:"oz", position: prev.length+1 }])
                          }} style={btnSecondary}>Add row</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </form>
            )}

            {/* RESULTS */}
            {loading ? (
              <div>Loading…</div>
            ) : rows.length === 0 ? (
              <div style={{ color:"#9ca3af" }}>No results.</div>
            ) : view==="cards" ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 }}>
                {rows.map(c => (
                  <div
                    key={c.id}
                    onClick={()=>startEdit(c)}
                    style={{ background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:12, cursor:"pointer" }}
                    title="Click to edit"
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:16 }}>{c.name}</div>
                        <div style={{ fontSize:12, color:"#9ca3af" }}>{c.method}{c.glass ? ` • ${c.glass}` : ""}</div>
                      </div>
                      <div style={{ textAlign:"right", fontSize:12, color:"#cbd5e1" }}>
                        {c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}
                        {c.last_special_at ? <div style={{ color:"#a7f3d0" }}>Special</div> : null}
                      </div>
                    </div>
                    {/* Ingredient list */}
                    <ul style={{ marginTop:8, paddingLeft:18, color:"#cbd5e1", fontSize:13 }}>
                      {(specs[c.id] || []).map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <button onClick={(e)=>{ e.stopPropagation(); printOnePager(c) }} style={btnSecondary}>Print</button>
                      {role==="editor" && (
                        <>
                          <button onClick={(e)=>{ e.stopPropagation(); startEdit(c) }} style={btnSecondary}>Edit</button>
                          <button onClick={(e)=>{ e.stopPropagation(); remove(c.id) }} style={dangerBtn}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", background:"#111827", border:"1px solid #1f2937", borderRadius:12, overflow:"hidden" }}>
                <thead style={{ background:"#0f172a", color:"#cbd5e1" }}>
                  <tr>
                    <th style={th}>Name</th>
                    <th style={th}>Method</th>
                    <th style={th}>Glass</th>
                    <th style={th}>Price</th>
                    <th style={th}>Specs</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(c => (
                    <tr key={c.id} style={{ borderTop:"1px solid #1f2937" }} onClick={()=>startEdit(c)} title="Click to edit">
                      <td style={td}>{c.name}</td>
                      <td style={td}>{c.method}</td>
                      <td style={td}>{c.glass || "—"}</td>
                      <td style={td}>{c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}</td>
                      <td style={td}>
                        <ul style={{ margin:0, paddingLeft:18 }}>
                          {(specs[c.id] || []).map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                      </td>
                      <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                        <button onClick={(e)=>{ e.stopPropagation(); printOnePager(c) }} style={btnSecondary}>Print</button>
                        {role==="editor" && (
                          <>
                            <button onClick={(e)=>{ e.stopPropagation(); startEdit(c) }} style={btnSecondary}>Edit</button>
                            <button onClick={(e)=>{ e.stopPropagation(); remove(c.id) }} style={dangerBtn}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------- Styles ----------
const inp: React.CSSProperties = {
  background:"#0b1020", border:"1px solid #1f2937", color:"#e5e7eb",
  padding:"8px 10px", borderRadius:10, fontSize:14
}
const btnPrimary: React.CSSProperties = {
  background:"#6366f1", border:"1px solid #4f46e5", color:"white",
  padding:"8px 12px", borderRadius:10, fontSize:14, cursor:"pointer"
}
const btnSecondary: React.CSSProperties = {
  background:"#374151", border:"1px solid #4b5563", color:"white",
  padding:"6px 10px", borderRadius:10, fontSize:13, cursor:"pointer"
}
const dangerBtn: React.CSSProperties = {
  background:"#ef4444", border:"1px solid #dc2626",
  color:"white", 
  padding:"6px 10px", 
  borderRadius:10, 
  fontSize:13, 
  cursor:"pointer", 
  marginLeft:8
}
const th: React.CSSProperties = { textAlign:"left", padding:"10px 12px", fontWeight:600, fontSize:13, verticalAlign:"top" }
const td: React.CSSProperties = { padding:"10px 12px", fontSize:14, color:"#e5e7eb", verticalAlign:"top" }

// ---------- Utils ----------
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c] as string))
}
