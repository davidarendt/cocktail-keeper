// src/components/CocktailForm.tsx
import React, { useState } from "react"
import { inp, btnPrimary, btnSecondary, colors, card } from "../styles"
import type { Unit, IngredientLine } from "../types"


type Props = {
  // mode
  editingId: string | null
  // dropdown data
  methods: string[]
  glasses: string[]
  ices: string[]
  garnishes: string[]
  // form values
  name: string;          setName: (v: string) => void
  method: string;        setMethod: (v: string) => void
  glass: string;         setGlass: (v: string) => void
  ice: string;           setIce: (v: string) => void
  garnish: string;       setGarnish: (v: string) => void
  notes: string;         setNotes: (v: string) => void
  price: string;         setPrice: (v: string) => void
  specialDate: string;   setSpecialDate: (v: string) => void
  lines: IngredientLine[]; setLines: (updater: (prev: IngredientLine[]) => IngredientLine[]) => void
  // actions
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  // ingredient suggestions (App will supply the query function; this component manages UI + keyboard)
  onQueryIngredients: (term: string) => Promise<string[]>
}

const unitOptions: Unit[] = ["oz","barspoon","dash","drop","ml"]

export function CocktailForm(props: Props) {
  const {
    editingId,
    methods, glasses, ices, garnishes,
    name, setName, method, setMethod, glass, setGlass, ice, setIce, garnish, setGarnish,
    notes, setNotes, price, setPrice, specialDate, setSpecialDate,
    lines, setLines,
    onClose, onSubmit,
    onQueryIngredients,
  } = props

  // local suggestion state
  const [ingSuggest, setIngSuggest] = useState<string[]>([])
  const [suggestFor, setSuggestFor] = useState<number | null>(null)
  const [ingOpen, setIngOpen] = useState(false)
  const [ingIndex, setIngIndex] = useState(-1)

  // fetch suggestions when the active row text changes
  async function fetchSuggest(term: string, rowIndex: number) {
    setSuggestFor(rowIndex)
    const t = term.trim()
    if (!t) { setIngSuggest([]); setIngOpen(false); setIngIndex(-1); return }
    const results = await onQueryIngredients(t)
    setIngSuggest(results)
    setIngOpen(true)
    setIngIndex(results.length ? 0 : -1)
  }

  function applySuggestion(idx: number) {
    if (idx < 0 || idx >= ingSuggest.length || suggestFor == null) return
    const pick = ingSuggest[idx]
    setLines(prev => prev.map((ln, i) => i === suggestFor ? { ...ln, ingredientName: pick } : ln))
    setIngOpen(false); setIngIndex(-1); setSuggestFor(null)
  }

  function handleIngKeyDown(e: React.KeyboardEvent<HTMLInputElement>, row: number) {
    if (!ingOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setSuggestFor(row); setIngOpen(true); setIngIndex(ingSuggest.length ? 0 : -1)
      e.preventDefault(); return
    }
    if (!ingOpen) return
    if (e.key === "ArrowDown") {
      e.preventDefault(); setIngIndex(prev => Math.min(prev + 1, ingSuggest.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setIngIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      if (ingIndex >= 0) { e.preventDefault(); applySuggestion(ingIndex) }
    } else if (e.key === "Escape") {
      setIngOpen(false); setIngIndex(-1); setSuggestFor(null)
    }
  }

  return (
    <form onSubmit={onSubmit} style={card({ marginBottom:16 })}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <strong>{editingId ? "Edit cocktail" : "Create cocktail"}</strong>
        <div style={{ display:"flex", gap:8 }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Close</button>
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
          <option value="" disabled>Glass…</option>
          {glasses.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={ice} onChange={e=>setIce(e.target.value)} style={inp}>
          <option value="" disabled>Ice…</option>
          {ices.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={garnish} onChange={e=>setGarnish(e.target.value)} style={inp}>
          <option value="" disabled>Garnish…</option>
          {garnishes.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Notes / price / special date */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes" style={{ ...inp, minHeight:60, resize:"vertical" }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" type="number" step="0.01" style={inp} />
          <input value={specialDate} onChange={e=>setSpecialDate(e.target.value)} type="date" style={inp} />
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
                onChange={async (e) => {
                  const v = e.target.value
                  setLines(prev => prev.map((x,idx)=> idx===i ? { ...x, ingredientName:v } : x))
                  await fetchSuggest(v, i)
                }}
                onFocus={() => fetchSuggest(ln.ingredientName, i)}
                onKeyDown={(e)=>handleIngKeyDown(e, i)}
                placeholder="Ingredient (e.g., Fresh Lemon Juice)" style={inp}
              />
              {(suggestFor===i && ingOpen && ingSuggest.length>0) && (
                <div style={{
                  position:"absolute", zIndex:10, top:"100%", left:0, right:0,
                  background: colors.bg, border:`1px solid ${colors.border}`, borderRadius:10,
                  padding:6, maxHeight:220, overflowY:"auto"
                }}>
                  {ingSuggest.map((s, idx) => (
                    <div key={s}
                      onMouseDown={()=>{ applySuggestion(idx) }}
                      onMouseEnter={()=> setIngIndex(idx)}
                      style={{
                        padding:"6px 8px",
                        cursor:"pointer",
                        background: idx===ingIndex ? "#1f2937" : "transparent",
                        borderRadius:8
                      }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              value={ln.amount}
              onChange={(e)=>setLines(prev=> prev.map((x,idx)=> idx===i ? { ...x, amount:e.target.value } : x))}
              placeholder="Amount" type="number" step="0.01" style={inp}
            />
            <select
              value={ln.unit}
              onChange={(e)=>setLines(prev=> prev.map((x,idx)=> idx===i ? { ...x, unit:e.target.value as Unit } : x))}
              style={inp}
            >
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
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
  )
}
