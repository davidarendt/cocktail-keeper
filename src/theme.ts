// src/theme.ts
import type { CSSProperties } from "react"

/** ---- Tokens (edit these to change the whole look) ---- */
export const colors = {
  bg: "#0a0a0a",
  text: "#e5e7eb",
  muted: "#9ca3af",
  panel: "#111827",
  border: "#1f2937",

  inputBg: "#0b1020",

  primary: "#6366f1",
  primaryBorder: "#4f46e5",

  danger: "#ef4444",
  dangerBorder: "#dc2626",

  special: "#a7f3d0",
} as const

export const space = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
} as const

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
} as const

export const fonts = {
  base: 14,
  small: 12,
  h1: 28,
  label: 13,
} as const

export const layout = {
  maxWidth: 1120,
} as const

/** ---- Small helpers ---- */
// IMPORTANT: type param as string so TS doesn't narrow to the literal of colors.border
export const border = (c: string = colors.border) => `1px solid ${c}`

export const card = (overrides?: CSSProperties): CSSProperties => ({
  background: colors.panel,
  border: border(),
  borderRadius: radii.lg,
  padding: space.lg,
  ...overrides,
})

/** ---- Ready-to-use common styles ---- */
export const inp: CSSProperties = {
  background: colors.inputBg,
  border: border(),
  color: colors.text,
  padding: `${space.sm}px ${space.md}px`,
  borderRadius: radii.md,
  fontSize: fonts.base,
}

export const btnPrimary: CSSProperties = {
  background: colors.primary,
  border: border(colors.primaryBorder),
  color: "white",
  padding: `${space.sm}px ${space.md + 2}px`,
  borderRadius: radii.md,
  fontSize: fonts.base,
  cursor: "pointer",
}

export const btnSecondary: CSSProperties = {
  background: "#374151",
  border: border("#4b5563"),
  color: "white",
  padding: `${space.xs}px ${space.md - 2}px`,
  borderRadius: radii.md,
  fontSize: fonts.label,
  cursor: "pointer",
}

export const dangerBtn: CSSProperties = {
  background: colors.danger,
  border: border(colors.dangerBorder),
  color: "white",
  padding: `${space.xs}px ${space.md - 2}px`,
  borderRadius: radii.md,
  fontSize: fonts.label,
  cursor: "pointer",
  marginLeft: 8,
}

export const th: CSSProperties = {
  textAlign: "left",
  padding: `${space.lg}px ${space.md + 2}px`,
  fontWeight: 600,
  fontSize: fonts.small,
  verticalAlign: "top",
}

export const td: CSSProperties = {
  padding: `${space.lg}px ${space.md + 2}px`,
  fontSize: fonts.base,
  color: colors.text,
  verticalAlign: "top",
}

/** Muted text helper */
export const mutedText: CSSProperties = { color: colors.muted }

/** Top-level page wrapper */
export const appWrap: CSSProperties = {
  minHeight: "100vh",
  background: colors.bg,
  color: colors.text,
  fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Arial",
}

/** Container width */
export const container: CSSProperties = {
  maxWidth: layout.maxWidth,
  margin: "0 auto",
  padding: 24,
}
