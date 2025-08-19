import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import type { Session } from "@supabase/supabase-js"

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
  // auth + role
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<"viewer" | "editor">("viewer")
  const [email, setEmail] = useState("")

  // data + ui
  const [rows, setRows] = useState<Cocktail[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>("")

  // add form state
  const [name, setName] = useState("")
  const [method, setMethod] = useState<"Stir" | "Shake">("Shake")
  const [glass, setGlass] = useState("")
  const [price, setPrice] = useState<string>("")

  // ------ AUTH ------
  useEffect(() => {
    // initial session
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    // subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // fetch role when session changes
    ;(async () => {
      if (!session) {
        setRole("viewer")
        return
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single()
      if (error) {
        // if profile row doesn't exist you'll stay viewer
        setRole("viewer")
      } else {
        setRole((data?.role as any) || "viewer")
      }
    })()
  }, [session])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert("Check your email for the magic link.")
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // ------ DATA ------
  async function load() {
    setLoading(true)
    setErr("")
    const { data, error } = await supabase
      .from("cocktails")
      .select("id,name,method,glass,price,last_special_at")
      .order("last_special_at", { ascending: false })
      .limit(200)
    if (error) setErr(error.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addCocktail(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    if (!name.trim()) {
      setErr("Name required")
      return
    }
    const toInsert = {
      name: name.trim(),
      method,
      glass: glass.trim() || null,
      price: price === "" ? null : Number(price),
      dirty_dump: false,
    }
    const { data, error } = await supabase.from("cocktails").insert([toInsert]).select()
    if (error) {
      setErr(error.message)
      return
    }
    setName("")
    setGlass("")
    setPrice("")
    setRows(prev => [...(data || []), ...prev])
  }

  async function del(id: string) {
    if (!confirm("Delete this cocktail?")) return
    const { error } = await supabase.from("cocktails").delete().eq("id", id)
    if (error) {
      setErr(error.message)
      return
    }
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Arial" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Cocktail Keeper</h1>

        {/* AUTH BAR */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          {session ? (
            <>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                Signed in as {session.user.email} • role: <b>{role}</b>
              </span>
              <button onClick={signOut} style={btnSecondary}>Sign out</button>
            </>
          ) : (
            <form onSubmit={signIn} style={{ display: "flex", gap: 8 }}>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email"
                style={inp}
              />
              <button type="submit" style={btnPrimary}>Send magic link</button>
            </form>
          )}
        </div>

        {/* INFO FOR VIEWERS */}
        {role !== "editor" && (
          <div style={{ background: "#0f172a", border: "1px solid #1f2937", padding: 10, borderRadius: 10, marginBottom: 12, fontSize: 13, color: "#cbd5e1" }}>
            View-only mode. Ask an admin to set your profile role to <b>editor</b> if you need to make changes.
          </div>
        )}

        {/* ERROR BOX */}
        {err && (
          <div style={{ background: "#1f2937", border: "1px solid #374151", padding: 12, borderRadius: 12, color: "#fecaca", marginBottom: 12 }}>
            {err}
          </div>
        )}

        {/* ADD FORM (editors only) */}
        {role === "editor" && (
          <form onSubmit={addCocktail} style={{ display: "grid", gap: 8, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inp} />
              <select value={method} onChange={e => setMethod(e.target.value as any)} style={inp}>
                <option>Shake</option>
                <option>Stir</option>
              </select>
              <input value={glass} onChange={e => setGlass(e.target.value)} placeholder="Glass" style={inp} />
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inp} />
              <button type="submit" style={btnPrimary}>Add</button>
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Tip: name + method are enough to start.</div>
          </form>
        )}

        {/* LIST */}
        {loading ? (
          <div>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No cocktails yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#111827", border: "1px solid #1f2937", borderRadius: 12, overflow: "hidden" }}>
            <thead style={{ background: "#0f172a", color: "#cbd5e1" }}>
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
                <tr key={c.id} style={{ borderTop: "1px solid #1f2937" }}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.method}</td>
                  <td style={td}>{c.glass || "—"}</td>
                  <td style={td}>{c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {role === "editor" && (
                      <button onClick={() => del(c.id)} style={dangerBtn}>Delete</button>
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

const inp: React.CSSProperties = {
  background: "#0b1020",
  border: "1px solid #1f2937",
  color: "#e5e7eb",
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 14,
}

const btnPrimary: React.CSSProperties = {
  background: "#6366f1",
  border: "1px solid #4f46e5",
  color: "white",
  padding: "8px 12px",
  borderRadius: 10,
  fontSize: 14,
  cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  background: "#374151",
  border: "1px solid #4b5563",
  color: "white",
  padding: "6px 10px",
  borderRadius: 10,
  fontSize: 13,
  cursor: "pointer",
}

const dangerBtn: React.CSSProperties = {
  background: "#ef4444",
  border: "1px solid #dc2626",
  color: "white",
  padding: "6px 10px",
  borderRadius: 10,
  fontSize: 13,
  cursor: "pointer",
}

const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontWeight: 600, fontSize: 13 }
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 14, color: "#e5e7eb" }
