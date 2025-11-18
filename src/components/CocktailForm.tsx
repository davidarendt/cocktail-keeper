// src/components/CocktailForm.tsx
import React, { useState } from "react"
import { inp, btnPrimary, btnSecondary, colors, card, textGradient, shadows } from "../styles"
import type { Unit, IngredientLine, Tag, DevelopmentStatus } from "../types"


type Props = {
  // mode
  editingId: string | null
  // dropdown data
  methods: string[]
  glasses: string[]
  ices: string[]
  availableTags: Tag[]
  units: string[]
  // form values
  name: string;          setName: (v: string) => void
  method: string;        setMethod: (v: string) => void
  glass: string;         setGlass: (v: string) => void
  ice: string;           setIce: (v: string) => void
  notes: string;         setNotes: (v: string) => void
  price: string;         setPrice: (v: string) => void
  specialDate: string;   setSpecialDate: (v: string) => void
  isOlogyRecipe: boolean; setOlogyRecipe: (v: boolean) => void
  developmentStatus: DevelopmentStatus; setDevelopmentStatus: React.Dispatch<React.SetStateAction<DevelopmentStatus>>
  lines: IngredientLine[]; setLines: (updater: (prev: IngredientLine[]) => IngredientLine[]) => void
  selectedTags: string[]; setSelectedTags: (v: string[] | ((prev: string[]) => string[])) => void
  // photo
  photoUrl?: string | null
  // actions
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onUploadPhoto: (file: File) => void
  onDeletePhoto?: () => void
  // ingredient suggestions (App will supply the query function; this component manages UI + keyboard)
  onQueryIngredients: (term: string) => Promise<string[]>
  // catalog management
  onAddCatalogItem: (kind: "method" | "glass" | "ice", name: string) => Promise<void>
  onAddTag: (name: string, color: string) => Promise<void>
}

// Units are supplied from App (admin-manageable)

export function CocktailForm(props: Props) {
  const {
    editingId,
    methods, glasses, ices, availableTags, units,
    name, setName, method, setMethod, glass, setGlass, ice, setIce,
    notes, setNotes, price, setPrice, specialDate, setSpecialDate, isOlogyRecipe, setOlogyRecipe,
    developmentStatus, setDevelopmentStatus,
    lines, setLines, selectedTags, setSelectedTags,
    photoUrl,
    onClose, onSubmit,
    onUploadPhoto,
    onDeletePhoto,
    onQueryIngredients,
    onAddCatalogItem,
    onAddTag,
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

  // Handle adding new catalog items
  async function handleAddNew(kind: "method" | "glass" | "ice") {
    const name = prompt(`Add new ${kind}:`)
    if (!name?.trim()) return
    
    try {
      await onAddCatalogItem(kind, name.trim())
      
      // Set the new item as selected
      switch (kind) {
        case "method":
          setMethod(name.trim())
          break
        case "glass":
          setGlass(name.trim())
          break
        case "ice":
          setIce(name.trim())
          break
      }
    } catch (error) {
      console.error("Failed to add catalog item:", error)
      alert("Failed to add new " + kind + ". Please try again.")
    }
  }

  // Handle tag toggling
  function toggleTag(tagId: string) {
    setSelectedTags((prev: string[]) => 
      prev.includes(tagId) 
        ? prev.filter((id: string) => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Handle adding new tags
  async function handleAddNewTag() {
    const name = prompt("Add new tag:")
    if (!name?.trim()) return
    
    try {
      await onAddTag(name.trim(), "#3B82F6")
    } catch (error) {
      console.error("Failed to add tag:", error)
      alert("Failed to add new tag. Please try again.")
    }
  }

  return (
    <form onSubmit={onSubmit} style={{
      ...card({ marginBottom: 24 }),
      background: colors.glass,
      backdropFilter: "blur(10px)",
      border: `1px solid ${colors.glassBorder}`,
      boxShadow: shadows.lg
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <h2 style={{ 
          margin: 0,
          fontSize: 24,
          fontWeight: 700,
          ...textGradient(colors.textGradient)
        }}>
          {editingId ? "✏️ Edit Cocktail" : "✨ Create New Cocktail"}
        </h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={onClose} style={btnSecondary}>
            ❌ Close
          </button>
          <button type="submit" style={{
            ...btnPrimary,
            background: colors.accent,
            boxShadow: shadows.lg
          }}>
            {editingId ? "💾 Save Changes" : "✨ Create Cocktail"}
          </button>
        </div>
      </div>

      {/* Enhanced Form Fields */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div>
          <label style={{ 
            display: "block", 
            fontSize: 12, 
            color: colors.muted, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            🍸 Cocktail Name
          </label>
          <input 
            value={name} 
            onChange={e=>setName(e.target.value)} 
            placeholder="Enter cocktail name..." 
            style={inp} 
            required
          />
        </div>
        
        <div>
          <label style={{ 
            display: "block", 
            fontSize: 12, 
            color: colors.muted, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            🔄 Method
          </label>
          <select value={method} onChange={e=>{
            if (e.target.value === "__add_new__") {
              handleAddNew("method")
            } else {
              setMethod(e.target.value)
            }
          }} style={inp} required>
            <option value="" disabled>Choose method...</option>
          {methods.map(m => <option key={m} value={m}>{m}</option>)}
          <option value="__add_new__" style={{ color: colors.accent, fontWeight: 600 }}>
            ➕ Add New Method...
          </option>
        </select>
        </div>
        
        <div>
          <label style={{ 
            display: "block", 
            fontSize: 12, 
            color: colors.muted, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            🥃 Glass
          </label>
        <select value={glass} onChange={e=>{
            if (e.target.value === "__add_new__") {
              handleAddNew("glass")
            } else {
              setGlass(e.target.value)
            }
          }} style={inp}>
            <option value="">Choose glass...</option>
          {glasses.map(g => <option key={g} value={g}>{g}</option>)}
          <option value="__add_new__" style={{ color: colors.accent, fontWeight: 600 }}>
            ➕ Add New Glass...
          </option>
        </select>
        </div>
        
        <div>
          <label style={{ 
            display: "block", 
            fontSize: 12, 
            color: colors.muted, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            🧊 Ice
          </label>
        <select value={ice} onChange={e=>{
            if (e.target.value === "__add_new__") {
              handleAddNew("ice")
            } else {
              setIce(e.target.value)
            }
          }} style={inp}>
            <option value="">Choose ice...</option>
          {ices.map(i => <option key={i} value={i}>{i}</option>)}
          <option value="__add_new__" style={{ color: colors.accent, fontWeight: 600 }}>
            ➕ Add New Ice...
          </option>
        </select>
        </div>
        
      </div>

      {/* Photo Section */}
      {editingId && (
        <div style={{ 
          marginTop: 24,
          marginBottom: 24,
          padding: 20,
          background: colors.panel,
          borderRadius: 12,
          border: `1px solid ${colors.border}`
        }}>
          <h3 style={{ 
            margin: "0 0 16px 0", 
            fontSize: 18,
            fontWeight: 700,
            ...textGradient(colors.textGradient)
          }}>
            📸 Photo
          </h3>
          
          {photoUrl ? (
            <div>
              <img
                src={photoUrl}
                alt={`${name} photo`}
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  marginBottom: 12
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{
                  ...btnSecondary,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "8px 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  📸 Replace Photo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) onUploadPhoto(file)
                    }}
                  />
                </label>
                {onDeletePhoto && (
                  <button
                    type="button"
                    onClick={onDeletePhoto}
                    style={{
                      ...btnSecondary,
                      fontSize: 14,
                      padding: "8px 16px",
                      background: "#DC2626",
                      color: "white",
                      border: "none"
                    }}
                  >
                    🗑️ Delete Photo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              padding: 40,
              border: `2px dashed ${colors.border}`,
              borderRadius: 8,
              textAlign: "center",
              background: colors.glass
            }}>
              <label style={{
                ...btnSecondary,
                cursor: "pointer",
                fontSize: 14,
                padding: "12px 24px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8
              }}>
                📸 Add Photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onUploadPhoto(file)
                  }}
                />
              </label>
              <p style={{
                margin: "16px 0 0 0",
                fontSize: 12,
                color: colors.muted
              }}>
                Upload an image for this cocktail
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ingredients Section - Moved to be first after basic fields */}
      <div style={{ 
        marginTop: 24,
        padding: 20,
        background: colors.panel,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        marginBottom: 24
      }}>
        <h3 style={{ 
          margin: "0 0 16px 0", 
          fontSize: 18,
          fontWeight: 700,
          ...textGradient(colors.textGradient)
        }}>
          🧪 Ingredients
        </h3>
        
        <div style={{ display: "grid", gap: 16 }}>
        {lines.map((ln, i) => (
            <div key={i} style={{ 
              display: "grid", 
              gridTemplateColumns: "2fr 1fr 1fr auto", 
              gap: 12,
              alignItems: "end",
              padding: 16,
              background: colors.glass,
              borderRadius: 8,
              border: `1px solid ${colors.glassBorder}`
            }}>
              <div style={{ position: "relative" }}>
                <label style={{ 
                  display: "block", 
                  fontSize: 11, 
                  color: colors.muted, 
                  marginBottom: 6,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  Ingredient
                </label>
              <input
                value={ln.ingredientName}
                onChange={async (e) => {
                  const v = e.target.value
                  setLines(prev => prev.map((x,idx)=> idx===i ? { ...x, ingredientName:v } : x))
                  await fetchSuggest(v, i)
                }}
                onFocus={() => fetchSuggest(ln.ingredientName, i)}
                onBlur={() => {
                  // Close dropdown when user tabs away
                  setIngOpen(false)
                  setIngIndex(-1)
                  setSuggestFor(null)
                }}
                onKeyDown={(e)=>handleIngKeyDown(e, i)}
                  placeholder="e.g., Fresh Lemon Juice" 
                  style={inp}
              />
              {(suggestFor===i && ingOpen && ingSuggest.length>0) && (
                <div style={{
                    position: "absolute", 
                    zIndex: 10, 
                    top: "100%", 
                    left: 0, 
                    right: 0,
                    background: colors.panel, 
                    border: `1px solid ${colors.border}`, 
                    borderRadius: 8,
                    padding: 8, 
                    maxHeight: 200, 
                    overflowY: "auto",
                    boxShadow: shadows.lg
                }}>
                  {ingSuggest.map((s, idx) => (
                    <div key={s}
                      onMouseDown={()=>{ applySuggestion(idx) }}
                      onMouseEnter={()=> setIngIndex(idx)}
                      style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          background: idx===ingIndex ? colors.primarySolid : "transparent",
                          color: idx===ingIndex ? "white" : colors.text,
                          borderRadius: 6,
                          fontSize: 13,
                          transition: "all 0.2s ease"
                      }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: 11, 
                  color: colors.muted, 
                  marginBottom: 6,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  Amount
                </label>
            <input
              value={ln.amount}
              onChange={(e)=>setLines(prev=> prev.map((x,idx)=> idx===i ? { ...x, amount:e.target.value } : x))}
                  placeholder="1.5" 
                  type="number" 
                  step="0.01" 
                  min="0"
                  style={inp}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: "block", 
                  fontSize: 11, 
                  color: colors.muted, 
                  marginBottom: 6,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  Unit
                </label>
            <select
              value={ln.unit}
              onChange={(e)=>setLines(prev=> prev.map((x,idx)=> idx===i ? { ...x, unit:e.target.value as Unit } : x))}
              style={inp}
            >
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "end", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <button 
                    type="button" 
                    onClick={()=>{
                      if (i > 0) {
                        setLines(prev => {
                          const newLines = [...prev]
                          // Swap with previous item
                          [newLines[i-1], newLines[i]] = [newLines[i], newLines[i-1]]
                          // Update positions
                          return newLines.map((x, idx) => ({ ...x, position: idx + 1 }))
                        })
                      }
                    }}
                    disabled={i === 0}
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: "6px 10px",
                      opacity: i === 0 ? 0.5 : 1,
                      cursor: i === 0 ? "not-allowed" : "pointer"
                    }}
                    title="Move up"
                  >
                    ⬆️
                  </button>
                  <button 
                    type="button" 
                    onClick={()=>{
                      if (i < lines.length - 1) {
                        setLines(prev => {
                          const newLines = [...prev]
                          // Swap with next item
                          [newLines[i], newLines[i+1]] = [newLines[i+1], newLines[i]]
                          // Update positions
                          return newLines.map((x, idx) => ({ ...x, position: idx + 1 }))
                        })
                      }
                    }}
                    disabled={i === lines.length - 1}
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: "6px 10px",
                      opacity: i === lines.length - 1 ? 0.5 : 1,
                      cursor: i === lines.length - 1 ? "not-allowed" : "pointer"
                    }}
                    title="Move down"
                  >
                    ⬇️
                  </button>
                </div>
                <button 
                  type="button" 
                  onClick={()=>{
                setLines(prev => prev.filter((_,idx)=> idx!==i).map((x,idx)=> ({...x, position: idx+1})))
                  }} 
                  style={{
                    ...btnSecondary,
                    fontSize: 11,
                    padding: "8px 12px"
                  }}
                  title="Delete ingredient"
                >
                  🗑️
                </button>
              {i===lines.length-1 && (
                  <button 
                    type="button" 
                    onClick={()=>{
                      const defaultUnit = units.length > 0 ? units[0] : "oz"
                      setLines(prev => [...prev, { ingredientName:"", amount:"", unit: defaultUnit, position: prev.length+1 }])
                    }} 
                    style={{
                      ...btnPrimary,
                      fontSize: 11,
                      padding: "8px 12px"
                    }}
                    title="Add ingredient"
                  >
                    ➕
                  </button>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Notes Section - Full Width */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ 
          display: "block", 
          fontSize: 12, 
          color: colors.muted, 
          marginBottom: 8,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          📝 Notes & Instructions
        </label>
        <textarea 
          value={notes} 
          onChange={e=>setNotes(e.target.value)} 
          placeholder="Add any special notes, instructions, serving suggestions, or additional details about this cocktail..." 
          style={{ 
            ...inp, 
            minHeight: 120, 
            height: 120,
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: 1.5,
            width: "100%"
          }} 
        />
      </div>

      {/* Tags Section */}
      {availableTags.length > 0 && (
        <div style={{ 
          marginBottom: 24,
          padding: 16,
          background: colors.panel,
          borderRadius: 12,
          border: `1px solid ${colors.glassBorder}`
        }}>
          <label style={{ 
            display: "block", 
            fontSize: 14, 
            fontWeight: 600, 
            color: colors.text, 
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            🏷️ Tags
          </label>
          <div style={{ 
            display: "flex", 
            gap: 8, 
            flexWrap: "wrap" 
          }}>
            {availableTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                style={{
                  ...btnSecondary,
                  fontSize: 12,
                  padding: "6px 12px",
                  background: selectedTags.includes(tag.id) ? colors.accent : colors.glass,
                  color: selectedTags.includes(tag.id) ? "white" : colors.text,
                  border: `1px solid ${selectedTags.includes(tag.id) ? colors.accent : colors.glassBorder}`,
                  borderRadius: 8,
                  minWidth: "auto",
                  transition: "all 0.2s ease"
                }}
              >
                🏷️ {tag.name}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddNewTag}
              style={{
                ...btnSecondary,
                fontSize: 12,
                padding: "6px 12px",
                background: colors.glass,
                color: colors.accent,
                border: `1px dashed ${colors.accent}`,
                borderRadius: 8,
                minWidth: "auto",
                transition: "all 0.2s ease"
              }}
            >
              ➕ Add New Tag
            </button>
          </div>
        </div>
      )}

      {/* Price, Special Date, and Ology Recipe (now below Tags) */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div>
          <label style={{ 
            display: "block", 
            fontSize: 12, 
            color: colors.muted, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            💰 Price
          </label>
          <input 
            value={price} 
            onChange={e=>setPrice(e.target.value)} 
            placeholder="0.00" 
            type="number" 
            step="0.01" 
            min="0"
            style={inp} 
          />
        </div>
        
        <div>
          <label style={{ 
            display: "block", 
            fontSize: 12, 
            color: colors.muted, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            ⭐ Special Date
          </label>
          <input 
            value={specialDate} 
            onChange={e=>setSpecialDate(e.target.value)} 
            type="date" 
            style={inp} 
          />
        </div>

        <div>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            fontSize: 12, 
            color: colors.muted, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            <input 
              type="checkbox" 
              checked={isOlogyRecipe} 
              onChange={e=>setOlogyRecipe(e.target.checked)} 
              style={{ 
                width: 16, 
                height: 16,
                accentColor: colors.primarySolid
              }} 
            />
            🍸 Ology Menu Item
          </label>
        </div>

        {/* Development status selector */}
        <div>
          <label style={{
            display: "block",
            fontSize: 12,
            color: colors.muted,
            marginBottom: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            🛠️ Development Status
          </label>
          <select
            value={developmentStatus}
            onChange={e => setDevelopmentStatus(e.target.value as DevelopmentStatus)}
            style={{
              ...inp,
              appearance: "auto",
              cursor: "pointer"
            }}
          >
            <option value="ready">Ready for Menu</option>
            <option value="in_progress">In Progress</option>
            <option value="untested">Un-Tested</option>
          </select>
          <p style={{
            marginTop: 6,
            fontSize: 12,
            color: colors.muted,
            lineHeight: 1.4
          }}>
            Use this to track cocktails that still need testing or refinement.
            They stay hidden from the main list by default but remain easy to find later.
          </p>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        paddingTop: 16,
        borderTop: `1px solid ${colors.border}`
      }}>
        <button type="submit" style={{
          ...btnPrimary,
          background: colors.accent,
          boxShadow: shadows.lg
        }}>
          {editingId ? "💾 Save Changes" : "✨ Create Cocktail"}
        </button>
      </div>

    </form>
  )
}
