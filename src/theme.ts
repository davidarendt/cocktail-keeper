// src/theme.ts
import type { CSSProperties } from "react"

/** ---- Ology Brewing Design System ---- */
export const colors = {
  // Ology brand colors - clean white background with warm accents
  bg: "#ffffff",
  bgSolid: "#ffffff",
  text: "#1a1a1a",
  muted: "#6b6b6b",
  panel: "#fafaf9",
  panelHover: "#f5f5f4",
  border: "#e5e5e5",
  borderHover: "#d4d4d4",

  // Subtle glass effect for cards
  glass: "#fafaf9",
  glassBorder: "#e5e5e5",

  // Input styling
  inputBg: "#ffffff",
  inputBorder: "#d4d4d4",
  inputFocus: "rgba(184, 134, 11, 0.3)",

  // Ology gold primary color
  primary: "#d4a574",
  primarySolid: "#d4a574",
  primaryHover: "#c89558",
  primaryBorder: "#b8860b",

  // Deep brown accent
  accent: "#5c4033",
  accentSolid: "#5c4033",

  // Status colors (muted to match Ology aesthetic)
  success: "#22c55e",
  successSolid: "#22c55e",
  danger: "#dc2626",
  dangerSolid: "#dc2626",
  dangerBorder: "#b91c1c",
  warning: "#f59e0b",
  warningSolid: "#f59e0b",

  // Special cocktail highlighting - subtle gold
  special: "#fef3c7",
  specialSolid: "#fbbf24",

  // Text gradients (using Ology colors)
  textGradient: "#5c4033",
  textGradientAccent: "#d4a574",
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const

export const fonts = {
  base: 14,
  small: 12,
  large: 16,
  h1: 32,
  h2: 24,
  h3: 20,
  label: 13,
  caption: 11,
} as const

export const layout = {
  maxWidth: 1400,
  headerHeight: 80,
  sidebarWidth: 280,
} as const

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 2px 4px 0 rgba(0, 0, 0, 0.08)",
  lg: "0 4px 8px 0 rgba(0, 0, 0, 0.1)",
  xl: "0 8px 16px 0 rgba(0, 0, 0, 0.12)",
  glow: "0 0 15px rgba(212, 165, 116, 0.3)",
  glowAccent: "0 0 15px rgba(92, 64, 51, 0.2)",
} as const

export const transitions = {
  fast: "150ms ease-out",
  normal: "250ms ease-out",
  slow: "350ms ease-out",
  bounce: "300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
} as const

/** ---- Ology Component Styles ---- */

// Clean card with subtle shadow
export const card = (overrides?: CSSProperties): CSSProperties => ({
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: space.lg,
  boxShadow: shadows.sm,
  transition: `all ${transitions.normal}`,
  ...overrides,
})

// Enhanced card with hover effects
export const cardHover = (overrides?: CSSProperties): CSSProperties => ({
  ...card(overrides),
  cursor: "pointer",
})

// Modern input with focus states
export const inp: CSSProperties = {
  background: colors.inputBg,
  border: `1px solid ${colors.inputBorder}`,
  color: colors.text,
  padding: `${space.md}px ${space.lg}px`,
  borderRadius: radii.md,
  fontSize: fonts.base,
  transition: `all ${transitions.fast}`,
  outline: "none",
}

// Ology gold primary button
export const btnPrimary: CSSProperties = {
  background: colors.primary,
  border: "none",
  color: "#ffffff",
  padding: `${space.md}px ${space.xl}px`,
  borderRadius: radii.md,
  fontSize: fonts.base,
  fontWeight: 600,
  cursor: "pointer",
  transition: `all ${transitions.fast}`,
  boxShadow: shadows.sm,
}

// Clean secondary button
export const btnSecondary: CSSProperties = {
  background: "#ffffff",
  border: `1px solid ${colors.border}`,
  color: colors.text,
  padding: `${space.sm}px ${space.lg}px`,
  borderRadius: radii.md,
  fontSize: fonts.label,
  fontWeight: 500,
  cursor: "pointer",
  transition: `all ${transitions.fast}`,
}

// Clean danger button
export const dangerBtn: CSSProperties = {
  background: colors.danger,
  border: "none",
  color: "white",
  padding: `${space.sm}px ${space.lg}px`,
  borderRadius: radii.md,
  fontSize: fonts.label,
  fontWeight: 500,
  cursor: "pointer",
  transition: `all ${transitions.fast}`,
  boxShadow: shadows.sm,
}

// Modern table headers
export const th: CSSProperties = {
  textAlign: "left",
  padding: `${space.lg}px ${space.lg}px`,
  fontWeight: 600,
  fontSize: fonts.small,
  color: colors.muted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  verticalAlign: "top",
  borderBottom: `1px solid ${colors.border}`,
}

// Enhanced table cells
export const td: CSSProperties = {
  padding: `${space.lg}px ${space.lg}px`,
  fontSize: fonts.base,
  color: colors.text,
  verticalAlign: "top",
  borderBottom: `1px solid ${colors.border}`,
}

// Text gradient helper
export const textGradient = (gradient: string = colors.textGradient): CSSProperties => ({
  background: gradient,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
})

// Muted text helper
export const mutedText: CSSProperties = { 
  color: colors.muted,
  fontSize: fonts.small,
}

// Glow effect helper
export const glow = (color: string = colors.primarySolid): CSSProperties => ({
  boxShadow: `0 0 20px ${color}40`,
})

// Top-level page wrapper with gradient background
export const appWrap: CSSProperties = {
  minHeight: "100vh",
  background: colors.bg,
  color: colors.text,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  lineHeight: 1.6,
}

// Enhanced container
export const container: CSSProperties = {
  maxWidth: layout.maxWidth,
  margin: "0 auto",
  padding: `${space.xl}px ${space.lg}px`,
}
