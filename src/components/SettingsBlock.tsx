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
  onDragStart: (e: React.DragEvent<HTMLTableRowElement>, id: string) => void
  onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void
  onDrop: (k: Kind, id: string) => void
  draggingId: string | null
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
  onDragStart,
  onDragOver,
  onDrop,
  draggingId
}: Props) {
  const kinds: Kind[] = ["method","glass","ice","garnish"]

  return (
    <div>
      <p style={{ color: colors.muted, marginBottom: 12 }}>
        Drag to reorder. Add/Rename/Activate items below. Disabled items won’t appear in forms/filters.
      </p>

      {kinds.map(kind => {
        const list = [...catalog.filter(c => c.kind === kind)].sort((a,b)=> a.position - b.position)
        return (
          <div
            key={kind}
            style={{
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <strong style={{ textTransform:"capitalize" }}>{kind}</strong>
              <div style={{ display:"flex", gap:8 }}>
                <input
                  value={newName[kind] || ""}
                  onChange={e=> onNewNameChange(kind, e.target.value)}
                  placeholder={`Add ${kind}…`}
                  style={inp}
                />
                <button onClick={()=>addCatalog(kind)} style={btnPrimary}>Add</button>
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
                      onDrop={()=>onDrop(kind, item.id)}
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
                        <button onClick={()=>renameCatalog(item)} style={btnSecondary}>Rename</button>
                        <button onClick={()=>deleteCatalog(item)} style={dangerBtn}>Delete</button>
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
        )
      })}
    </div>
  )
}
