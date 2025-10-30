// src/components/BatchedItemForm.tsx
import { useState } from "react"
import { inp, btnPrimary, btnSecondary, colors, card, textGradient, shadows } from "../styles"
import type { Unit, BatchedItem } from "../types"

type Props = {
  // mode
  editingId: string | null
  // form values
  name: string; setName: (v: string) => void
  description: string; setDescription: (v: string) => void
  batchSize: string; setBatchSize: (v: string) => void
  batchUnit: string; setBatchUnit: (v: string) => void
  yieldAmount: string; setYieldAmount: (v: string) => void
  yieldUnit: string; setYieldUnit: (v: string) => void
  costPerBatch: string; setCostPerBatch: (v: string) => void
  shelfLifeDays: string; setShelfLifeDays: (v: string) => void
  storageNotes: string; setStorageNotes: (v: string) => void
  recipeNotes: string; setRecipeNotes: (v: string) => void
  isActive: boolean; setIsActive: (v: boolean) => void
  // dropdown data
  units: string[]
  // actions
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export function BatchedItemForm(props: Props) {
  const {
    editingId,
    name, setName, description, setDescription,
    batchSize, setBatchSize, batchUnit, setBatchUnit,
    yieldAmount, setYieldAmount, yieldUnit, setYieldUnit,
    costPerBatch, setCostPerBatch, shelfLifeDays, setShelfLifeDays,
    storageNotes, setStorageNotes, recipeNotes, setRecipeNotes,
    isActive, setIsActive, units,
    onClose, onSubmit
  } = props

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
          {editingId ? "✏️ Edit Batched Item" : "🏭 Create New Batched Item"}
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
            {editingId ? "💾 Save Changes" : "🏭 Create Item"}
          </button>
        </div>
      </div>

      {/* Basic Information */}
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
            🏭 Item Name
          </label>
          <input 
            value={name} 
            onChange={e=>setName(e.target.value)} 
            placeholder="e.g., Vanilla Simple Syrup" 
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
            💰 Cost per Batch
          </label>
          <input 
            value={costPerBatch} 
            onChange={e=>setCostPerBatch(e.target.value)} 
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
            📅 Shelf Life (Days)
          </label>
          <input 
            value={shelfLifeDays} 
            onChange={e=>setShelfLifeDays(e.target.value)} 
            placeholder="30" 
            type="number" 
            min="1"
            style={inp} 
          />
        </div>
      </div>

      {/* Description */}
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
          📝 Description
        </label>
        <textarea 
          value={description} 
          onChange={e=>setDescription(e.target.value)} 
          placeholder="Brief description of this batched item..." 
          style={{ 
            ...inp, 
            minHeight: 80, 
            height: 80,
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: 1.5,
            width: "100%"
          }} 
        />
      </div>

      {/* Batch Information */}
      <div style={{ 
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
          📊 Batch Information
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
              Batch Size
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={batchSize}
                onChange={(e)=>setBatchSize(e.target.value)}
                placeholder="1" 
                type="number" 
                step="0.01" 
                min="0"
                style={{ ...inp, flex: 1 }}
              />
              <select
                value={batchUnit}
                onChange={(e)=>setBatchUnit(e.target.value)}
                style={{ ...inp, minWidth: 80 }}
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
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
              Yield Amount
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={yieldAmount}
                onChange={(e)=>setYieldAmount(e.target.value)}
                placeholder="1" 
                type="number" 
                step="0.01" 
                min="0"
                style={{ ...inp, flex: 1 }}
              />
              <select
                value={yieldUnit}
                onChange={(e)=>setYieldUnit(e.target.value)}
                style={{ ...inp, minWidth: 80 }}
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Sections */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
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
            🧪 Recipe Notes
          </label>
          <textarea 
            value={recipeNotes} 
            onChange={e=>setRecipeNotes(e.target.value)} 
            placeholder="Instructions, tips, variations..." 
            style={{ 
              ...inp, 
              minHeight: 100, 
              height: 100,
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
              width: "100%"
            }} 
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
            🏠 Storage Notes
          </label>
          <textarea 
            value={storageNotes} 
            onChange={e=>setStorageNotes(e.target.value)} 
            placeholder="Storage conditions, containers, labeling..." 
            style={{ 
              ...inp, 
              minHeight: 100, 
              height: 100,
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
              width: "100%"
            }} 
          />
        </div>
      </div>

      {/* Active Status */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 8,
        marginBottom: 24,
        padding: 16,
        background: colors.panel,
        borderRadius: 8,
        border: `1px solid ${colors.border}`
      }}>
        <input 
          type="checkbox" 
          checked={isActive} 
          onChange={e=>setIsActive(e.target.checked)} 
          style={{ 
            width: 16, 
            height: 16,
            accentColor: colors.primarySolid
          }} 
        />
        <label style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: colors.text,
          cursor: "pointer"
        }}>
          ✅ Active (this item is currently being made/available)
        </label>
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
          {editingId ? "💾 Save Changes" : "🏭 Create Item"}
        </button>
      </div>
    </form>
  )
}
