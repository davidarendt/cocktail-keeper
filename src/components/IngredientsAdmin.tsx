// src/components/IngredientsAdmin.tsx
import React from "react"
import { inp, btnPrimary, btnSecondary, dangerBtn, th, td, card, colors } from "../styles"
import type { Ingredient } from "../types"

type Props = {
  // list
  items: Ingredient[]
  loading: boolean

  // search box
  q: string
  setQ: (v: string) => void

  // add box
  newName: string
  setNewName: (v: string) => void
  onAdd: (name: string) => void

  // item actions
  onRename: (it: Ingredient) => void
  onDelete: (it: Ingredient) => void

  // merge panel
  mergeFrom: string
  setMergeFrom: (v: string) => void
  mergeTo: string
  setMergeTo: (v: string) => void
  onMerge: (from: string, to: string) => void
  mergeBusy?: boolean
  mergeMsg?: string
}

export function IngredientsAdmin({
  items,
  loading,
  q, setQ,
  newName, setNewName, onAdd,
  onRename, onDelete,
  mergeFrom, setMergeFrom,
  mergeTo, setMergeTo,
  onMerge, mergeBusy = false, mergeMsg = ""
}: Props) {

  function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = newName.trim()
    if (n) onAdd(n)
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      {/* Manage list */}
      <div style={card()}>
        <form onSubmit={submitAdd} style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search ingredients…"
            style={{ ...inp, flex:1 }}
          />
          <input
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            placeholder="New ingredient"
            style={inp}
          />
          <button type="submit" style={btnPrimary}>Add</button>
        </form>

        {loading ? (
          <div>Loading…</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Ingredient</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} style={{ borderTop:`1px solid ${colors.border}` }}>
                  <td style={td}>{it.name}</td>
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    <button onClick={()=>onRename(it)} style={btnSecondary}>Rename</button>
                    <button onClick={()=>onDelete(it)} style={dangerBtn}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td style={{ ...td, color: colors.muted }} colSpan={2}>No ingredients</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Merge panel */}
      <div style={card()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <strong>Merge ingredients</strong>
          <span style={{ fontSize:12, color: colors.muted }}>Convert all uses of “From” → “Into”</span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 1fr auto", gap:8, alignItems:"center" }}>
          <div>
            <input
              list="all-ingredients"
              value={mergeFrom}
              onChange={e=>setMergeFrom(e.target.value)}
              placeholder="From (e.g., Lemon Juice)"
              style={inp}
            />
          </div>
          <div style={{ textAlign:"center", color: colors.muted }}>→</div>
          <div>
            <input
              list="all-ingredients"
              value={mergeTo}
              onChange={e=>setMergeTo(e.target.value)}
              placeholder="Into (e.g., Fresh Lemon Juice)"
              style={inp}
            />
          </div>
          <div>
            <button
              onClick={()=>{ const a = mergeFrom; setMergeFrom(mergeTo); setMergeTo(a) }}
              style={btnSecondary}
              title="Swap"
            >
              Swap
            </button>
          </div>
        </div>

        <datalist id="all-ingredients">
          {items.map(i => <option key={i.id} value={i.name} />)}
        </datalist>

        <div style={{ marginTop:10, display:"flex", gap:8, alignItems:"center" }}>
          <button
            onClick={()=> onMerge(mergeFrom.trim(), mergeTo.trim())}
            disabled={mergeBusy}
            style={btnPrimary}
          >
            {mergeBusy ? "Merging…" : "Merge"}
          </button>
          {mergeMsg && <span style={{ fontSize:13, color:"#cbd5e1" }}>{mergeMsg}</span>}
        </div>
      </div>
    </div>
  )
}
