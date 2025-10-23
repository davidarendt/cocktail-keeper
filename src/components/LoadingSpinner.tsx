// src/components/LoadingSpinner.tsx
import { colors } from "../styles"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  color?: string
  text?: string
}

export function LoadingSpinner({ size = "md", color = colors.primarySolid, text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32
  }

  const spinnerSize = sizeMap[size]

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 20
    }}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `2px solid ${color}20`,
          borderTop: `2px solid ${color}`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}
      />
      {text && (
        <p style={{
          color: colors.muted,
          fontSize: 14,
          margin: 0,
          textAlign: "center"
        }}>
          {text}
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
