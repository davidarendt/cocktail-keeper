import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

type Cocktail = {
  id: string
  name: string
  method: "Stir" | "Shake"
  glass: string | null
  price: number | null
  dirty_dump?: boolean
  last_special_at?: string | null
}

export default function App() {
  const [rows, setRows] = useState<Cocktail[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>("")

  // form state
  const [name, setName] = useState("")
  const [method, setMethod] = useState<"Stir" | "Shake">("Shake")
  const [glass, setGlass] = useState("")
  const [price, setPrice] = useState<string>("")

  async function load() {
    setLoading(true); setErr("")
    const { data, error } = await supabase
      .from("cocktails")
      .select("id,name,method,glass,price,last_special_at")
      .order("last_special_at", { ascending: false })
      .limit(100)
    if (error) setErr(error.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addCocktail(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    if (!name.trim()) { setErr("Name required"); return }
    const toInsert = {
      name: name.trim(),
      method,
      glass: glass.trim() || null,
      price: price === "" ? null : Number(price),
      dirty_dump: false
    }
    const { data, error } = await supabase
      .from("cocktails")
      .insert([toInsert])
      .select()
    if (error) { setErr(error.message); return }
    setName(""); setGlass(""); setPrice("")
    // prepend new rows and refresh order
    setRows(prev => [...(data || []), ...prev])
  }

  async function del(id: string) {
    if (!confirm("Delete this cocktail?")) return
    const { error } = await supabase.from("cocktails").delete().eq("id", id)
    if (error) { setErr(error.message); return }
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#e5e7eb", fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial" }}>
      <div style={{ maxWidth: 960, margin:"0 auto", padding:24 }}>
        <h1 style={{ fontSize:28, fontWeight:800, marginBottom:10 }}>Cocktail Keeper</h1>

        {/* Error box */}
        {err && (
          <div style={{ background:"#1f2937", border:"1px solid #374151", padding:12, borderRadius:12, color:"#fecaca", marginBottom:12 }}>
            {err}
          </div>
        )}

        {/* Add form */}
        <form onSubmit={addCocktail} style={{ display:"grid", gap:8, background:"#111827", border:"1px solid #1f2937", borderRadius:12, padding:12, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8 }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" style={inp} />
            <select value={method} onChange={e=>setMethod(e.target.value as any)} style={inp}>
              <option>Shake</option>
              <option>Stir</option>
            </select>
            <input value={glass} onChange={e=>setGlass(e.target.value)} placeholder="Glass" style={inp} />
            <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inp} />
            <button type="submit" style={btn}>Add</button>
          </div>
          <div style={{ fontSize:12, color:"#9ca3af" }}>Tip: name + method are enough to start.</div>
        </form>

        {/* List */}
        {loading ? (
          <div>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color:"#9ca3af" }}>No cocktails yet. Add one above.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", background:"#111827", border:"1px solid #1f2937", borderRadius:12, overflow:"hidden" }}>
            <thead style={{ background:"#0f172a", color:"#cbd5e1" }}>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Method</th>
                <th style={th}>Glass</th>
                <th style={th}>Price</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} style={{ borderTop:"1px solid #1f2937" }}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.method}</td>
                  <td style={td}>{c.glass || "—"}</td>
                  <td style={td}>{c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}</td>
                  <td style={{ ...td, textAlign:"right" }}>
                    <button onClick={()=>del(c.id)} style={dangerBtn}>Delete</button>
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

const inp: React.CSSProperties = {
  background:"#0b1020", border:"1px solid #1f2937", color:"#e5e7eb",
  padding:"8px 10px", borderRadius:10, fontSize:14
}
const btn: React.CSSProperties = {
  background:"#6366f1", border:"1px solid #4f46e5", color:"white",
  padding:"8px 12px", borderRadius:10, fontSize:14, cursor:"pointer"
}
const dangerBtn: React.CSSProperties = {
  background:"#ef4444", border:"1px solid #dc2626", color:"white",
  padding:"6px 10px", borderRadius:10, fontSize:13, cursor:"pointer"
}
const th: React.CSSProperties = { textAlign:"left", padding:"10px 12px", fontWeight:600, fontSize:13 }
const td: React.CSSProperties = { padding:"10px 12px", fontSize:14, color:"#e5e7eb" }
