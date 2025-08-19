import { useEffect, useMemo, useState } from "react"
import { supabase } from "./supabaseClient"
import type { Session } from "@supabase/supabase-js"

// ---------- Types ----------
type Unit = "oz" | "barspoon" | "dash" | "drop" | "ml"

type Cocktail = {
  id: string
  name: string
  method: "Stir" | "Shake"
  dirty_dump: boolean
  glass: string | null
  ice: string | null
  garnish: string | null
  notes: string | null
  price: number | null
  on_menu: boolean
  last_special_at: string | null
  photo_url: string | null
  tags: string | null
}

type IngredientLine = {
  ingredientName: string
  amount: string
  unit: Unit
  position: number
}

// ---------- App ----------
export default function App() {
  // Auth + role
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<"viewer" | "editor">("viewer")
  const [email, setEmail] = useState("")

  // Data + UI
  const [rows, setRows] = useState<Cocktail[]>([])
  const [specsMap, setSpecsMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>("")

  // Filters/search/view
  const [q, setQ] = useState("") // ingredient search (fuzzy)
  const [fMethod, setFMethod] = useState<"Any" | "Stir" | "Shake" | "Dirty dump">("Any")
  const [fGlass, setFGlass] = useState("")
  const [specialOnly, setSpecialOnly] = useState(false)
  const [view, setView] = useState<"cards" | "list">("cards")

  // Modal form state
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form fields (full set)
  const [name, setName] = useState("")
  const [method, setMethod] = useState<"Stir" | "Shake">("Shake")
  const [dirtyDump, setDirtyDump] = useState(false)
  const [glass, setGlass] = useState("")
  const [ice, setIce] = useState("")
  const [garnish, setGarnish] = useState("")
  const [notes, setNotes] = useState("")
  const [price, setPrice] = useState<string>("")
  const [onMenu, setOnMenu] = useState(false)
  const [markSpecialNow, setMarkSpecialNow] = useState(false)
  const [tags, setTags] = useState("") // comma-separated
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Ingredient lines
  const [lines, setLines] = useState<IngredientLine[]>([{ ingredientName: "", amount: "", unit: "oz", position: 1 }])
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
      setRole(((data?.role as any) || "viewer") as "viewer" | "editor")
    })()
  }, [session])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert("Check your email for the magic link.")
  }
  async function signOut() { await supabase.auth.signOut() }

  // ---------- LOAD ----------
  async function buildSpecs(ids: string[]) {
    if (ids.length === 0) { setSpecsMap({}); return }
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("cocktail_id, amount, unit, position, ingredient:ingredients(name)")
      .in("cocktail_id", ids)
      .order("position", { ascending: true })
    const map: Record<string, string[]> = {}
    ;(data || []).forEach((r: any) => {
      const s = `${r.amount} ${r.unit} ${r.ingredient?.name || ""}`.trim()
      const id = r.cocktail_id as string
      if (!map[id]) map[id] = []
      map[id].push(s)
    })
    setSpecsMap(map)
  }

  async function load() {
    setLoading(true); setErr("")
    let q1 = supabase.from("cocktails").select("*").order("last_special_at", { ascending: false }).limit(500)
    if (fMethod === "Stir" || fMethod === "Shake") q1 = q1.eq("method", fMethod)
    if (fMethod === "Dirty dump") q1 = q1.eq("dirty_dump", true)
    if (fGlass.trim()) q1 = q1.eq("glass", fGlass.trim())
    if (specialOnly) q1 = q1.not("last_special_at", "is", null)
    const { data: base, error } = await q1
    if (error) { setErr(error.message); setLoading(false); return }

    let finalRows = base || []
    if (q.trim()) {
      const term = q.trim().toLowerCase()
      const { data: rec } = await supabase
        .from("recipe_ingredients")
        .select("cocktail_id, ingredient:ingredients(name)")
        .limit(5000)
      const ids = new Set(
        (rec || [])
          .filter(r => {
            const n = (r as any).ingredient?.name?.toLowerCase() || ""
            return n.includes(term) || n.includes(`${term} juice`) || n.replace(/\s+/g, "").includes(term.replace(/\s+/g, ""))
          })
          .map(r => (r as any).cocktail_id)
      )
      finalRows = finalRows.filter(c => ids.has(c.id))
    }

    setRows(finalRows)
    await buildSpecs(finalRows.map(r => r.id))
    setLoading(false)
  }

  useEffect(() => { load() }, [q, fMethod, fGlass, specialOnly])

  // ---------- Form helpers ----------
  function resetForm() {
    setEditingId(null)
    setName(""); setMethod("Shake"); setDirtyDump(false)
    setGlass(""); setIce(""); setGarnish(""); setNotes("")
    setPrice(""); setOnMenu(false); setMarkSpecialNow(false)
    setTags(""); setPhotoUrl(null); setPhotoFile(null)
    setLines([{ ingredientName: "", amount: "", unit: "oz", position: 1 }])
  }

  async function startEdit(c: Cocktail) {
    resetForm()
    setEditingId(c.id)
    setName(c.name); setMethod(c.method); setDirtyDump(!!c.dirty_dump)
    setGlass(c.glass || ""); setIce(c.ice || ""); setGarnish(c.garnish || ""); setNotes(c.notes || "")
    setPrice(c.price == null ? "" : String(c.price))
    setOnMenu(!!c.on_menu); setTags(c.tags || ""); setPhotoUrl(c.photo_url || null)
    setOpenForm(true)
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("amount, unit, position, ingredient:ingredients(name)")
      .eq("cocktail_id", c.id)
      .order("position", { ascending: true })
    const mapped: IngredientLine[] = (data || []).map((r: any, i: number) => ({
      ingredientName: r.ingredient?.name || "",
      amount: String(r.amount ?? ""),
      unit: (r.unit || "oz") as Unit,
      position: r.position ?? i + 1
    }))
    setLines(mapped.length ? mapped : [{ ingredientName: "", amount: "", unit: "oz", position: 1 }])
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handlePhotoUploadIfNeeded(cocktailName: string) {
    if (!photoFile) return photoUrl || null
    const ext = (photoFile.name.split(".").pop() || "jpg").toLowerCase()
    const path = `photos/${slugify(cocktailName)}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("cocktail-photos").upload(path, photoFile, { upsert: true })
    if (error) { setErr(error.message); return photoUrl || null }
    const { data } = supabase.storage.from("cocktail-photos").getPublicUrl(path)
    return data.publicUrl || null
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    if (!name.trim()) { setErr("Name required"); return }

    const photoPublicUrl = await handlePhotoUploadIfNeeded(name.trim())

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
      tags: tags.trim() || null,
      photo_url: photoPublicUrl,
      last_special_at: markSpecialNow ? new Date().toISOString() : undefined
    }

    const { data: up, error } = await supabase.from("cocktails").upsert(cocktail, { onConflict: "name" }).select().single()
    if (error || !up) { setErr(error?.message || "Save failed"); return }
    const cocktailId = up.id as string

    // Replace recipe lines
    await supabase.from("recipe_ingredients").delete().eq("cocktail_id", cocktailId)

    let pos = 1
    for (const ln of lines) {
      const ingName = ln.ingredientName.trim()
      const amt = ln.amount === "" ? NaN : Number(ln.amount)
      if (!ingName || !isFinite(amt)) continue
      await supabase.from("ingredients").upsert({ name: ingName }, { onConflict: "name" })
      const { data: ingId } = await supabase.from("ingredients").select("id").eq("name", ingName).single()
      if (!ingId) continue
      await supabase.from("recipe_ingredients").insert({
        cocktail_id: cocktailId,
        ingredient_id: ingId.id,
        amount: amt,
        unit: ln.unit,
        position: pos++
      })
    }

    await load()
    setOpenForm(false)
    resetForm()
  }

  async function remove(cId: string) {
    if (!confirm("Delete this cocktail?")) return
    const { error } = await supabase.from("cocktails").delete().eq("id", cId)
    if (error) { setErr(error.message); return }
    setRows(prev => prev.filter(r => r.id !== cId))
    const m = { ...specsMap }; delete m[cId]; setSpecsMap(m)
  }

  async function fetchIngSuggest(s: string, rowIndex: number) {
    setSuggestFor(rowIndex)
    if (!s.trim()) { setIngSuggest([]); return }
    const { data } = await supabase.from("ingredients").select("name").ilike("name", `%${s.trim()}%`).limit(10)
    setIngSuggest((data || []).map(d => d.name))
  }

  // ---------- Render ----------
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Arial" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Cocktail Keeper</h1>

        {/* Auth bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
          {session ? (
            <>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                Signed in as {session.user.email} • role: <b>{role}</b>
              </span>
              <button onClick={signOut} style={btnSecondary}>Sign out</button>
            </>
          ) : (
            <form onSubmit={signIn} style={{ display: "flex", gap: 8 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email" style={inp} />
              <button type="submit" style={btnPrimary}>Send magic link</button>
            </form>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto auto", gap: 8, marginBottom: 12 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by ingredient (e.g., lime)" style={inp} />
          <select value={fMethod} onChange={e => setFMethod(e.target.value as any)} style={inp}>
            <option>Any</option>
            <option>Shake</option>
            <option>Stir</option>
            <option>Dirty dump</option>
          </select>
          <input value={fGlass} onChange={e => setFGlass(e.target.value)} placeholder="Glass filter" style={inp} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={specialOnly} onChange={e => setSpecialOnly(e.target.checked)} /> Special only
          </label>
          <button onClick={() => setView(v => v === "cards" ? "list" : "cards")} style={btnSecondary}>
            {view === "cards" ? "List" : "Cards"}
          </button>
          {role === "editor" && (
            <button
              onClick={() => { resetForm(); setOpenForm(true) }}
              style={btnPrimary}>
              New Cocktail
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No results.</div>
        ) : view === "cards" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
            {rows.map(c => (
              <div
                key={c.id}
                onClick={() => role === "editor" ? startEdit(c) : undefined}
                style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12, cursor: role === "editor" ? "pointer" : "default" }}
              >
                {c.photo_url && (
                  <img src={c.photo_url} alt={c.name} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {c.method}{c.dirty_dump ? ", dirty dump" : ""}{c.glass ? ` • ${c.glass}` : ""}
                    </div>
                    {specsMap[c.id]?.length ? (
                      <ul style={{ marginTop: 8, paddingLeft: 18, color: "#cbd5e1", fontSize: 13 }}>
                        {specsMap[c.id].slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    ) : null}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, color: "#cbd5e1" }}>
                    {c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}
                    {c.last_special_at ? <div style={{ color: "#a7f3d0" }}>Special</div> : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={(e) => { e.stopPropagation(); printOnePager(c) }} style={btnSecondary}>Print</button>
                  {role === "editor" && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(c) }} style={btnSecondary}>Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); remove(c.id) }} style={dangerBtn}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#111827", border: "1px solid #1f2937", borderRadius: 12, overflow: "hidden" }}>
            <thead style={{ background: "#0f172a", color: "#cbd5e1" }}>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Method</th>
                <th style={th}>Glass</th>
                <th style={th}>Specs</th>
                <th style={th}>Price</th>
                <th style={th}>Special</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} onClick={() => role === "editor" ? startEdit(c) : undefined} style={{ borderTop: "1px solid #1f2937", cursor: role === "editor" ? "pointer" : "default" }}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.method}{c.dirty_dump ? " (dirty dump)" : ""}</td>
                  <td style={td}>{c.glass || "—"}</td>
                  <td style={td} title={specsMap[c.id]?.join(" • ") || ""}>
                    {(specsMap[c.id] || []).slice(0, 3).join(" • ")}
                  </td>
                  <td style={td}>{c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}</td>
                  <td style={td}>{c.last_special_at ? "Yes" : "No"}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button onClick={(e) => { e.stopPropagation(); printOnePager(c) }} style={btnSecondary}>Print</button>
                    {role === "editor" && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(c) }} style={btnSecondary}>Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); remove(c.id) }} style={dangerBtn}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* MODAL FORM */}
        {openForm && role === "editor" && (
          <div style={modalBackdrop} onClick={() => setOpenForm(false)}>
            <div style={modalCard} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 800 }}>{editingId ? "Edit cocktail" : "New cocktail"}</div>
                <button onClick={() => { setOpenForm(false); resetForm() }} style={btnSecondary}>Close</button>
              </div>

              {err && <div style={{ background: "#1f2937", border: "1px solid #374151", padding: 10, borderRadius: 10, color: "#fecaca", marginBottom: 10 }}>{err}</div>}

              <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inp} />
                  <select value={method} onChange={e => setMethod(e.target.value as any)} style={inp}>
                    <option>Shake</option>
                    <option>Stir</option>
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <input type="checkbox" checked={dirtyDump} onChange={e => setDirtyDump(e.target.checked)} /> Dirty dump
                  </label>
                  <input value={glass} onChange={e => setGlass(e.target.value)} placeholder="Glass" style={inp} />
                  <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inp} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input value={ice} onChange={e => setIce(e.target.value)} placeholder="Ice" style={inp} />
                  <input value={garnish} onChange={e => setGarnish(e.target.value)} placeholder="Garnish" style={inp} />
                  <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma separated)" style={inp} />
                </div>

                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" style={{ ...inp, minHeight: 80, resize: "vertical" }} />

                {/* Photo */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} style={inp} />
                  <input value={photoUrl || ""} onChange={e => setPhotoUrl(e.target.value || null)} placeholder="Photo URL (optional)" style={inp} />
                </div>
                {photoUrl && <img src={photoUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10 }} />}

                {/* Ingredients */}
                <div style={{ fontWeight: 700, marginTop: 6 }}>Ingredients</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {lines.map((ln, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr .8fr .8fr auto", gap: 8 }}>
                      <div style={{ position: "relative" }}>
                        <input
                          value={ln.ingredientName}
                          onChange={e => {
                            const v = e.target.value
                            setLines(prev => prev.map((x, idx) => idx === i ? { ...x, ingredientName: v } : x))
                            fetchIngSuggest(v, i)
                          }}
                          onFocus={() => fetchIngSuggest(ln.ingredientName, i)}
                          placeholder="Ingredient (e.g., Lime juice)"
                          style={inp}
                        />
                        {suggestFor === i && ingSuggest.length > 0 && (
                          <div style={{ position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, background: "#0b1020", border: "1px solid #1f2937", borderRadius: 10, padding: 6 }}>
                            {ingSuggest.map(s => (
                              <div key={s}
                                onMouseDown={() => {
                                  setLines(prev => prev.map((x, idx) => idx === i ? { ...x, ingredientName: s } : x))
                                  setSuggestFor(null); setIngSuggest([])
                                }}
                                style={{ padding: "6px 8px", cursor: "pointer" }}>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <input value={ln.amount} onChange={e => setLines(prev => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))}
                        placeholder="Amount" type="number" step="0.01" style={inp} />
                      <select value={ln.unit} onChange={e => setLines(prev => prev.map((x, idx) => idx === i ? { ...x, unit: e.target.value as Unit } : x))} style={inp}>
                        <option value="oz">oz</option>
                        <option value="barspoon">barspoon</option>
                        <option value="dash">dash</option>
                        <option value="drop">drop</option>
                        <option value="ml">ml</option>
                      </select>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, position: idx + 1 })))}
                          style={btnSecondary}>Remove</button>
                        {i === lines.length - 1 && (
                          <button type="button" onClick={() => setLines(prev => [...prev, { ingredientName: "", amount: "", unit: "oz", position: prev.length + 1 }])}
                            style={btnSecondary}>Add row</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <input type="checkbox" checked={onMenu} onChange={e => setOnMenu(e.target.checked)} /> On menu
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <input type="checkbox" checked={markSpecialNow} onChange={e => setMarkSpecialNow(e.target.checked)} /> Mark as Special now
                  </label>
                  <div style={{ flex: 1 }} />
                  <button type="submit" style={btnPrimary}>{editingId ? "Save changes" : "Create cocktail"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Styles ----------
const inp: React.CSSProperties = {
  background: "#0b1020", border: "1px solid #1f2937", color: "#e5e7eb",
  padding: "8px 10px", borderRadius: 10, fontSize: 14
}
const btnPrimary: React.CSSProperties = {
  background: "#6366f1", border: "1px solid #4f46e5", color: "white",
  padding: "8px 12px", borderRadius: 10, fontSize: 14, cursor: "pointer"
}
const btnSecondary: React.CSSProperties = {
  background: "#374151", border: "1px solid #4b5563", color: "white",
  padding: "6px 10px", borderRadius: 10, fontSize: 13, cursor: "pointer"
}
const dangerBtn: React.CSSProperties = {
  background: "#ef4444", border: "1px solid #dc2626", color: "white",
  padding: "6px 10px", borderRadius: 10, fontSize: 13, cursor: "pointer", marginLeft: 8
}
const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontWeight: 600, fontSize: 13 }
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 14, color: "#e5e7eb" }
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-start",
  justifyContent: "center", padding: 20, zIndex: 50
}
const modalCard: React.CSSProperties = {
  width: "min(1100px, 100%)", background: "#0f172a", border: "1px solid #1f2937",
  borderRadius: 12, padding: 14, maxHeight: "90vh", overflow: "auto"
}

// ---------- Utils ----------
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] as string))
}

// ---------- Print ----------
async function printOnePager(c: Cocktail) {
  const { data } = await supabase
    .from("recipe_ingredients")
    .select("amount, unit, position, ingredient:ingredients(name)")
    .eq("cocktail_id", c.id)
    .order("position", { ascending: true })
  const lines = (data || []).map((r: any) => `${r.amount} ${r.unit} ${r.ingredient?.name || ""}`)
  const w = window.open("", "_blank", "width=800,height=1000")
  if (!w) return
  w.document.write(`
    <html>
    <head>
      <title>${escapeHtml(c.name)}</title>
      <style>
        @page { size: A5; margin: 14mm; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #111; }
        h1 { margin: 0 0 6px; font-size: 22px; }
        .muted { color: #555; font-size: 12px; }
        ul { margin: 8px 0 12px; padding-left: 18px; }
        li { margin: 3px 0; }
        .row { margin: 6px 0; }
        .box { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
        img { max-width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin: 8px 0; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(c.name)}</h1>
      <div class="muted">${c.method}${c.dirty_dump ? " • Dirty dump" : ""}${c.glass ? " • " + escapeHtml(c.glass) : ""}</div>
      ${c.photo_url ? `<img src="${escapeHtml(c.photo_url)}" />` : ""}
      <div class="row box">
        <strong>Specs</strong>
        <ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
        ${c.garnish ? `<div><strong>Garnish:</strong> ${escapeHtml(c.garnish)}</div>` : ""}
        ${c.notes ? `<div class="row"><strong>Notes:</strong> ${escapeHtml(c.notes)}</div>` : ""}
      </div>
      <div class="muted">Price: ${c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}${c.last_special_at ? " • Special" : ""}</div>
      <script>window.print();</script>
    </body>
    </html>
  `)
  w.document.close()
}
