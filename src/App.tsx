import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import type { Session } from "@supabase/supabase-js"

type Unit = "oz"|"barspoon"|"dash"|"drop"|"ml"

type Cocktail = {
  id: string
  name: string
  method: "Stir"|"Shake"
  dirty_dump: boolean
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

export default function App() {
  // auth
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<"viewer"|"editor">("viewer")
  const [email, setEmail] = useState("")

  // data + specs
  const [rows, setRows] = useState<Cocktail[]>([])
  const [specs, setSpecs] = useState<Record<string, string[]>>({}) // cocktail_id -> ["2 oz Gin", ...]
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>("")

  // filters / search / view
  const [q, setQ] = useState("") // ingredient search
  const [fMethod, setFMethod] = useState<"Any"|"Stir"|"Shake"|"Dirty dump">("Any")
  const [fGlass, setFGlass] = useState("")
  const [specialOnly, setSpecialOnly] = useState(false)
  const [view, setView] = useState<"cards"|"list">("cards")

  // form open/close + fields
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [method, setMethod] = useState<"Stir"|"Shake">("Shake")
  const [dirtyDump, setDirtyDump] = useState(false)
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

  // ---------- LOAD ----------
  useEffect(() => { load() }, [q, fMethod, fGlass, specialOnly])

  async function load() {
    setLoading(true); setErr("")
    let query = supabase.from("cocktails").select("*").order("last_special_at",{ascending:false}).limit(500)
    if (fMethod === "Stir" || fMethod === "Shake") query = query.eq("method", fMethod)
    if (fMethod === "Dirty dump") query = query.eq("dirty_dump", true)
    if (fGlass.trim()) query = query.eq("glass", fGlass.trim())
    if (specialOnly) query = query.not("last_special_at","is",null)
    const { data: base, error } = await query
    if (error) { setErr(error.message); setLoading(false); return }
    let finalRows = base || []

    // Ingredient search (fuzzy, e.g. "lime" matches "lime juice")
    if (q.trim() && finalRows.length) {
      const ids = finalRows.map(c=>c.id)
      const { data: rec } = await supabase
        .from("recipe_ingredients")
        .select("cocktail_id, ingredient:ingredients(name)")
        .in("cocktail_id", ids)
      const term = q.trim().toLowerCase().replace(/\s+/g,"")
      const matchIds = new Set(
        (rec || []).filter((r:any) => {
          const n = (r.ingredient?.name || "").toLowerCase()
          return n.includes(q.trim().toLowerCase()) || n.includes(`${q.trim().toLowerCase()} juice`) || n.replace(/\s+/g,"").includes(term)
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

  // ---------- ING TYPEAHEAD ----------
  async function fetchIngSuggest(s: string, rowIndex: number) {
    setSuggestFor(rowIndex)
    if (!s.trim()) { setIngSuggest([]); return }
    const { data } = await supabase.from("ingredients").select("name").ilike("name", `%${s.trim()}%`).limit(10)
    setIngSuggest((data||[]).map(d=>d.name))
  }

  // ---------- FORM HELPERS ----------
  function resetForm() {
    setEditingId(null)
    setName(""); setMethod("Shake"); setDirtyDump(false)
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
    setMethod(c.method)
    setDirtyDump(c.dirty_dump)
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

    const cocktail = {
      id: editingId ?? undefined,
      name: name.trim(),
      method,
      dirty_dump: !!dirtyDump,
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
        <div class="muted">${c.method}${c.dirty_dump ? " • Dirty dump" : ""}${c.glass ? " • "+escapeHtml(c.glass) : ""}</div>
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

  // ---------- RENDER ----------
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#e5e7eb", fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial" }}>
      <div style={{ maxWidth: 1120, margin:"0 auto", padding:24 }}>
        <h1 style={{ fontSize:28, fontWeight:800, marginBottom:10 }}>Cocktail Keeper</h1>

        {/* AUTH BAR */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", marginBottom:12 }}>
          {session ? (
            <>
              <span style={{ fontSize:12, color:"#9ca3af" }}>
                Signed in as {session.user.email} • role: <b>{role}</b>
              </span>
              <button onClick={signOut} style={btnSecondary}>Sign out</button>
            </>
          ) : (
            <form onSubmit={signIn} style={{ display:"flex", gap:8 }}>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email" style={inp} />
              <button type="submit" style={btnPrimary}>Send magic link</button>
            </form>
          )}
        </div>

        {/* CONTROLS */}
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr auto", gap:8, marginBottom:12 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by ingredient (e.g., lime)" style={inp} />
          <select value={fMethod} onChange={e=>setFMethod(e.target.value as any)} style={inp}>
            <option>Any</option><option>Shake</option><option>Stir</option><option>Dirty dump</option>
          </select>
          <input value={fGlass} onChange={e=>setFGlass(e.target.value)} placeholder="Glass filter" style={inp} />
          <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
            <input type="checkbox" checked={specialOnly} onChange={e=>setSpecialOnly(e.target.checked)} /> Special only
          </label>
          <div style={{ textAlign:"right" }}>
            <button onClick={()=>setView(v=> v==="cards" ? "list" : "cards")} style={btnSecondary}>
              {view==="cards" ? "List" : "Cards"}
            </button>
          </div>
        </div>

        {/* Show the error bar */}
        {err && (
          <div style={{ background:"#1f2937", border:"1px solid #374151", padding:12, borderRadius:12, color:"#fecaca", marginBottom:12 }}>
            {err}
          </div>
        )}

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

            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:8, marginBottom:8 }}>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" style={inp} />
              <select value={method} onChange={e=>setMethod(e.target.value as any)} style={inp}>
                <option>Shake</option><option>Stir</option>
              </select>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                <input type="checkbox" checked={dirtyDump} onChange={e=>setDirtyDump(e.target.checked)} /> Dirty dump
              </label>
              <input value={glass} onChange={e=>setGlass(e.target.value)} placeholder="Glass" style={inp} />
              <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inp} />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
              <input value={ice} onChange={e=>setIce(e.target.value)} placeholder="Ice" style={inp} />
              <input value={garnish} onChange={e=>setGarnish(e.target.value)} placeholder="Garnish" style={inp} />
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                <input type="checkbox" checked={onMenu} onChange={e=>setOnMenu(e.target.checked)} /> On menu
              </label>
            </div>

            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" style={{ ...inp, minHeight:60, resize:"vertical" }} />

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
                      placeholder="Ingredient (e.g., Lime juice)" style={inp}
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

            <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:12 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                <input type="checkbox" checked={markSpecialNow} onChange={e=>setMarkSpecialNow(e.target.checked)} /> Mark as Special now
              </label>
              <div style={{ flex:1 }} />
              <button type="submit" style={btnPrimary}>{editingId ? "Save changes" : "Create cocktail"}</button>
              <button type="button" onClick={()=>{ resetForm(); setFormOpen(false) }} style={btnSecondary}>Cancel</button>
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
                    <div style={{ fontSize:12, color:"#9ca3af" }}>{c.method}{c.dirty_dump ? ", dirty dump" : ""}{c.glass ? ` • ${c.glass}` : ""}</div>
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
                  <td style={td}>{c.method}{c.dirty_dump ? " (dirty dump)" : ""}</td>
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
  background:"#ef4444", border:"1px solid #dc2626", color:"white",
  padding:"6px 10px", borderRadius:10, fontSize:13, cursor:"pointer", marginLeft:8
}
const th: React.CSSProperties = { textAlign:"left", padding:"10px 12px", fontWeight:600, fontSize:13, verticalAlign:"top" }
const td: React.CSSProperties = { padding:"10px 12px", fontSize:14, color:"#e5e7eb", verticalAlign:"top" }

// ---------- Utils ----------
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c] as string))
}
