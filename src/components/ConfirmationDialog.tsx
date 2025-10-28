// src/components/ConfirmationDialog.tsx
import { btnPrimary, btnSecondary, colors, card, shadows } from "../styles"

type Props = {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}: Props) {
  if (!isOpen) return null

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        ...card({ marginBottom: 0 }),
        background: colors.panel,
        backdropFilter: "blur(10px)",
        border: `1px solid ${colors.border}`,
        boxShadow: shadows.xl,
        maxWidth: 400,
        width: "100%",
        padding: 24
      }}>
        <h3 style={{
          margin: "0 0 16px 0",
          fontSize: 18,
          fontWeight: 700,
          color: colors.text
        }}>
          {title}
        </h3>
        
        <p style={{
          margin: "0 0 24px 0",
          fontSize: 14,
          color: colors.muted,
          lineHeight: 1.5
        }}>
          {message}
        </p>
        
        <div style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onCancel}
            style={btnSecondary}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...btnPrimary,
              background: colors.danger,
              boxShadow: shadows.lg
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
