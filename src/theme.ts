// src/theme.ts
import type { CSSProperties } from "react"

/** ---- Modern Design System Tokens ---- */
export const colors = {
  // Base colors with sophisticated gradients
  bg: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
  bgSolid: "#0f0f23",
  text: "#f8fafc",
  muted: "#94a3b8",
  panel: "rgba(255, 255, 255, 0.05)",
  panelHover: "rgba(255, 255, 255, 0.08)",
  border: "rgba(255, 255, 255, 0.1)",
  borderHover: "rgba(255, 255, 255, 0.2)",

  // Glass morphism
  glass: "rgba(255, 255, 255, 0.1)",
  glassBorder: "rgba(255, 255, 255, 0.2)",

  // Input styling
  inputBg: "rgba(255, 255, 255, 0.05)",
  inputBorder: "rgba(255, 255, 255, 0.1)",
  inputFocus: "rgba(99, 102, 241, 0.3)",

  // Primary colors with gradients
  primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  primarySolid: "#667eea",
  primaryHover: "linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)",
  primaryBorder: "#5a67d8",

  // Accent colors
  accent: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  accentSolid: "#f093fb",

  // Status colors
  success: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
  successSolid: "#4ade80",
  danger: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
  dangerSolid: "#f87171",
  dangerBorder: "#dc2626",
  warning: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
  warningSolid: "#fbbf24",

  // Special cocktail highlighting
  special: "linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)",
  specialSolid: "#a7f3d0",

  // Text gradients
  textGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  textGradientAccent: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
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
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  glow: "0 0 20px rgba(99, 102, 241, 0.3)",
  glowAccent: "0 0 20px rgba(240, 147, 251, 0.3)",
} as const

export const transitions = {
  fast: "150ms ease-out",
  normal: "250ms ease-out",
  slow: "350ms ease-out",
  bounce: "300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
} as const

/** ---- Modern Component Styles ---- */

// Glass morphism card with backdrop blur
export const card = (overrides?: CSSProperties): CSSProperties => ({
  background: colors.panel,
  backdropFilter: "blur(10px)",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  padding: space.lg,
  boxShadow: shadows.md,
  transition: `all ${transitions.normal}`,
  ...overrides,
})

// Enhanced card with hover effects
export const cardHover = (overrides?: CSSProperties): CSSProperties => ({
  ...card(overrides),
  cursor: "pointer",
  "&:hover": {
    background: colors.panelHover,
    border: `1px solid ${colors.borderHover}`,
    transform: "translateY(-2px)",
    boxShadow: shadows.lg,
  },
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
  "&:focus": {
    border: `1px solid ${colors.primarySolid}`,
    boxShadow: `0 0 0 3px ${colors.inputFocus}`,
  },
  "&::placeholder": {
    color: colors.muted,
  },
}

// Gradient primary button
export const btnPrimary: CSSProperties = {
  background: colors.primary,
  border: "none",
  color: "white",
  padding: `${space.md}px ${space.xl}px`,
  borderRadius: radii.md,
  fontSize: fonts.base,
  fontWeight: 600,
  cursor: "pointer",
  transition: `all ${transitions.fast}`,
  boxShadow: shadows.sm,
  "&:hover": {
    background: colors.primaryHover,
    transform: "translateY(-1px)",
    boxShadow: shadows.md,
  },
  "&:active": {
    transform: "translateY(0)",
  },
}

// Glass morphism secondary button
export const btnSecondary: CSSProperties = {
  background: colors.glass,
  border: `1px solid ${colors.glassBorder}`,
  color: colors.text,
  padding: `${space.sm}px ${space.lg}px`,
  borderRadius: radii.md,
  fontSize: fonts.label,
  fontWeight: 500,
  cursor: "pointer",
  transition: `all ${transitions.fast}`,
  backdropFilter: "blur(10px)",
  "&:hover": {
    background: colors.panelHover,
    border: `1px solid ${colors.borderHover}`,
    transform: "translateY(-1px)",
  },
}

// Gradient danger button
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
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: shadows.md,
  },
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
