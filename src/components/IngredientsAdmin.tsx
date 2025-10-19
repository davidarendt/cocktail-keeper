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

  // Check if search term exists in current results
  const searchTerm = q.trim().toLowerCase()
  const exactMatch = items.find(item => item.name.toLowerCase() === searchTerm)
  const hasExactMatch = exactMatch !== undefined
  const canAddNew = searchTerm.length > 0 && !hasExactMatch

  function handleAddFromSearch() {
    const n = q.trim()
    if (n && !hasExactMatch) {
      onAdd(n)
      setQ("") // Clear search after adding
    }
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    const n = newName.trim()
    if (n) onAdd(n)
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      {/* Manage list */}
      <div style={card()}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search ingredients or type new ingredient name..."
              style={{ ...inp, flex: 1 }}
            />
            {canAddNew && (
              <button 
                type="button"
                onClick={handleAddFromSearch}
                style={{
                  ...btnPrimary,
                  background: colors.accent,
                  whiteSpace: "nowrap"
                }}
              >
                ➕ Add "{q.trim()}"
              </button>
            )}
          </div>
          
          {canAddNew && (
            <div style={{ 
              padding: 8, 
              background: colors.glass, 
              borderRadius: 6, 
              border: `1px solid ${colors.glassBorder}`,
              fontSize: 12,
              color: colors.muted
            }}>
              💡 "{q.trim()}" not found. Click "Add" to create it.
            </div>
          )}
          
          {hasExactMatch && searchTerm.length > 0 && (
            <div style={{ 
              padding: 8, 
              background: colors.panel, 
              borderRadius: 6, 
              border: `1px solid ${colors.border}`,
              fontSize: 12,
              color: colors.text
            }}>
              ✅ "{exactMatch.name}" already exists
            </div>
          )}
        </div>

        {/* Legacy add form - keep for backward compatibility */}
        <form onSubmit={submitAdd} style={{ display: "flex", gap: 8, marginBottom: 12, padding: 12, background: colors.glass, borderRadius: 8, border: `1px solid ${colors.glassBorder}` }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Or add ingredient manually..."
            style={inp}
          />
          <button type="submit" style={btnSecondary}>Add Manually</button>
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
                    <span style={{ margin: "0 8px" }}></span>
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
