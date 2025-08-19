import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

type Cocktail = { id: string; name: string }

export default function App() {
  const [envOk, setEnvOk] = useState({ url: false, key: false })
  const [status, setStatus] = useState<"idle"|"ok"|"error">("idle")
  const [err, setErr] = useState("")
  const [rows, setRows] = useState<Cocktail[]>([])

  useEffect(() => {
    setEnvOk({
      url: !!import.meta.env.VITE_SUPABASE_URL,
      key: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    })
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from("cocktails")
          .select("id,name")
          .limit(10)
        if (error) throw error
        setRows(data || [])
        setStatus("ok")
      } catch (e: any) {
        setErr(e.message || String(e))
        setStatus("error")
      }
    })()
  }, [])

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#ffffff", fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial" }}>
      <div style={{ maxWidth: 900, margin:"0 auto", padding:24 }}>
        <h1 style={{ fontSize:28, fontWeight:800, marginBottom:6 }}>Cocktail Keeper — Debug</h1>

        <div style={{ marginBottom:12, fontSize:12, color:"#cbd5e1" }}>
          ENV → URL: <b>{String(envOk.url)}</b>, KEY: <b>{String(envOk.key)}</b>
        </div>

        {status === "idle" && <div>Loading…</div>}

        {status === "error" && (
          <div style={{ background:"#1f2937", border:"1px solid #374151", padding:12, borderRadius:12, color:"#fecaca", marginBottom:12 }}>
            Error: {err}
          </div>
        )}

        {status === "ok" && (
          <>
            <div style={{ marginBottom:8 }}>Rows: <b>{rows.length}</b></div>
            <ul>
              {rows.map(r => <li key={r.id}>{r.name}</li>)}
            </ul>
            {rows.length === 0 && <div style={{ color:"#cbd5e1" }}>No cocktails found. Seed a couple rows and refresh.</div>}
          </>
        )}
      </div>
    </div>
  )
}
