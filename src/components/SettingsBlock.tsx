// src/components/SettingsBlock.tsx
import React from "react"
import { inp, btnPrimary, btnSecondary, dangerBtn, th, td, colors } from "../styles"
import type { Kind, CatalogItemRow as CatalogItem } from "../types"

type Props = {
  catalog: CatalogItem[]
  catLoading: boolean
  newName: Partial<Record<Kind, string>>
  onNewNameChange: (k: Kind, v: string) => void
  addCatalog: (k: Kind) => void
  renameCatalog: (i: CatalogItem) => void
  toggleCatalog: (i: CatalogItem) => void
  deleteCatalog: (i: CatalogItem) => void
  mergeCatalog: (source: CatalogItem, target: CatalogItem) => void
  onDragStart: (e: React.DragEvent<HTMLTableRowElement>, id: string) => void
  onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void
  onDrop: (k: Kind, id: string) => void
  draggingId: string | null
  selectedKind: Kind
}

export function SettingsBlock({
  catalog,
  catLoading,
  newName,
  onNewNameChange,
  addCatalog,
  renameCatalog,
  toggleCatalog,
  deleteCatalog,
  mergeCatalog,
  onDragStart,
  onDragOver,
  onDrop,
  draggingId,
  selectedKind
}: Props) {
  const [mergeMode, setMergeMode] = React.useState(false)
  const [selectedForMerge, setSelectedForMerge] = React.useState<CatalogItem | null>(null)
  
  const list = [...catalog.filter(c => c.kind === selectedKind)].sort((a,b)=> a.position - b.position)

  const handleMergeClick = (item: CatalogItem) => {
    if (!selectedForMerge) {
      setSelectedForMerge(item)
    } else if (selectedForMerge.id === item.id) {
      setSelectedForMerge(null)
    } else {
      mergeCatalog(selectedForMerge, item)
      setSelectedForMerge(null)
      setMergeMode(false)
    }
  }

  const cancelMerge = () => {
    setSelectedForMerge(null)
    setMergeMode(false)
  }

  return (
    <div>
      <p style={{ color: colors.muted, marginBottom: 12 }}>
        Drag to reorder. Add/Rename/Activate items below. Disabled items won't appear in forms/filters.
      </p>

      {/* Merge Mode Controls */}
      <div style={{ 
        background: colors.panel, 
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 16,
        border: `1px solid ${colors.border}`
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: colors.text }}>🔄 Merge Items</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: colors.muted }}>
              {mergeMode ? 
                (selectedForMerge ? 
                  `Select target item to merge "${selectedForMerge.name}" into:` :
                  "Select source item to merge:") :
                "Combine similar items without breaking cocktails"
              }
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {mergeMode ? (
              <>
                <button onClick={cancelMerge} style={btnSecondary}>
                  Cancel
                </button>
                {selectedForMerge && (
                  <button onClick={cancelMerge} style={btnPrimary}>
                    Clear Selection
                  </button>
                )}
              </>
            ) : (
              <button onClick={() => setMergeMode(true)} style={btnPrimary}>
                Start Merge
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          background: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 12,
          marginBottom: 16
        }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <strong style={{ textTransform:"capitalize" }}>{selectedKind}</strong>
          <div style={{ display:"flex", gap:8 }}>
            <input
              value={newName[selectedKind] || ""}
              onChange={e=> onNewNameChange(selectedKind, e.target.value)}
              placeholder={`Add ${selectedKind}…`}
              style={inp}
            />
            <button onClick={()=>addCatalog(selectedKind)} style={btnPrimary}>Add</button>
          </div>
        </div>

        {catLoading ? (
          <div>Loading…</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Active</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={(e)=>onDragStart(e, item.id)}
                  onDragOver={onDragOver}
                  onDrop={()=>onDrop(selectedKind, item.id)}
                  style={{
                    borderTop: `1px solid ${colors.border}`,
                    cursor: "grab",
                    opacity: draggingId===item.id ? 0.6 : 1
                  }}
                >
                  <td style={td}>{item.name}</td>
                  <td style={td}>
                    <label style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={()=>toggleCatalog(item)}
                      /> {item.active ? "Active" : "Inactive"}
                    </label>
                  </td>
                  <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                    {mergeMode ? (
                      <button 
                        onClick={() => handleMergeClick(item)}
                        style={{
                          ...btnPrimary,
                          background: selectedForMerge?.id === item.id ? colors.accent : 
                                     selectedForMerge && selectedForMerge.id !== item.id ? colors.primarySolid : 
                                     colors.glass,
                          color: selectedForMerge?.id === item.id || (selectedForMerge && selectedForMerge.id !== item.id) ? "white" : colors.text,
                          border: `2px solid ${selectedForMerge?.id === item.id ? colors.accent : colors.border}`
                        }}
                      >
                        {selectedForMerge?.id === item.id ? "Selected" : 
                         selectedForMerge ? "Merge Into" : "Select"}
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={()=>renameCatalog(item)} style={btnSecondary}>Rename</button>
                        <button onClick={()=>deleteCatalog(item)} style={dangerBtn}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td style={{ ...td, color: colors.muted }} colSpan={3}>No items</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
