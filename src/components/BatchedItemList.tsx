// src/components/BatchedItemList.tsx
import { btnPrimary, btnSecondary, dangerBtn, colors, card, shadows, textGradient } from "../styles"
import type { BatchedItem, Role } from "../types"

type Props = {
  items: BatchedItem[]
  role: Role
  onEdit: (item: BatchedItem) => void
  onDelete: (id: string) => void
  onAddNew: () => void
}

export function BatchedItemList({ items, role, onEdit, onDelete, onAddNew }: Props) {
  const canEdit = role === "editor" || role === "admin"

  if (items.length === 0) {
    return (
      <div style={{
        ...card({ marginBottom: 24 }),
        background: colors.glass,
        backdropFilter: "blur(10px)",
        border: `1px solid ${colors.glassBorder}`,
        boxShadow: shadows.lg,
        textAlign: "center",
        padding: 48
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16,
          opacity: 0.5
        }}>
          🏭
        </div>
        <h3 style={{
          margin: "0 0 8px 0",
          fontSize: 20,
          fontWeight: 700,
          color: colors.text
        }}>
          No Batched Items Yet
        </h3>
        <p style={{
          margin: "0 0 24px 0",
          color: colors.muted,
          fontSize: 14
        }}>
          Start by creating your first house-made ingredient or specialty item.
        </p>
        {canEdit && (
          <button onClick={onAddNew} style={{
            ...btnPrimary,
            background: colors.accent,
            boxShadow: shadows.lg
          }}>
            🏭 Create First Item
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 700,
          ...textGradient(colors.textGradient)
        }}>
          🏭 Batched Items ({items.length})
        </h2>
        {canEdit && (
          <button onClick={onAddNew} style={{
            ...btnPrimary,
            background: colors.accent,
            boxShadow: shadows.lg
          }}>
            ➕ Add New Item
          </button>
        )}
      </div>

      {/* Items Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: 20
      }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              ...card({ marginBottom: 0 }),
              background: colors.glass,
              backdropFilter: "blur(10px)",
              border: `1px solid ${colors.glassBorder}`,
              boxShadow: shadows.lg,
              transition: "all 0.2s ease",
              opacity: item.is_active ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)"
              e.currentTarget.style.boxShadow = shadows.xl
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = shadows.lg
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: "0 0 4px 0",
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.text,
                  lineHeight: 1.2
                }}>
                  {item.name}
                </h3>
                {!item.is_active && (
                  <div style={{
                    fontSize: 11,
                    color: colors.muted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    ⏸️ Inactive
                  </div>
                )}
              </div>
              {canEdit && (
                <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
                  <button
                    onClick={() => onEdit(item)}
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: "6px 10px"
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    style={{
                      ...dangerBtn,
                      fontSize: 11,
                      padding: "6px 10px"
                    }}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p style={{
                margin: "0 0 12px 0",
                fontSize: 13,
                color: colors.muted,
                lineHeight: 1.4
              }}>
                {item.description}
              </p>
            )}

            {/* Batch Info */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
              padding: 12,
              background: colors.panel,
              borderRadius: 8,
              border: `1px solid ${colors.border}`
            }}>
              <div>
                <div style={{
                  fontSize: 10,
                  color: colors.muted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4
                }}>
                  Batch Size
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text
                }}>
                  {item.batch_size && item.batch_unit 
                    ? `${item.batch_size} ${item.batch_unit}`
                    : "—"
                  }
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: 10,
                  color: colors.muted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4
                }}>
                  Yield
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text
                }}>
                  {item.yield_amount && item.yield_unit 
                    ? `${item.yield_amount} ${item.yield_unit}`
                    : "—"
                  }
                </div>
              </div>
            </div>

            {/* Cost & Shelf Life */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12
            }}>
              <div>
                <div style={{
                  fontSize: 10,
                  color: colors.muted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4
                }}>
                  Cost per Batch
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text
                }}>
                  {item.cost_per_batch 
                    ? `$${Number(item.cost_per_batch).toFixed(2)}`
                    : "—"
                  }
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: 10,
                  color: colors.muted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4
                }}>
                  Shelf Life
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text
                }}>
                  {item.shelf_life_days 
                    ? `${item.shelf_life_days} days`
                    : "—"
                  }
                </div>
              </div>
            </div>

            {/* Notes */}
            {(item.recipe_notes || item.storage_notes) && (
              <div style={{
                fontSize: 11,
                color: colors.muted,
                lineHeight: 1.4
              }}>
                {item.recipe_notes && (
                  <div style={{ marginBottom: 4 }}>
                    <strong>Recipe:</strong> {item.recipe_notes}
                  </div>
                )}
                {item.storage_notes && (
                  <div>
                    <strong>Storage:</strong> {item.storage_notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
