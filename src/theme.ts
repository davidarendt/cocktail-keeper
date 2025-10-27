// src/theme.ts
import type { CSSProperties } from "react"

/** ---- Ology Modern Design System ---- */
export const colors = {
  // Light mode colors
  light: {
    // Ultra-modern Ology palette - inspired by the logo's stark contrast
    bg: "#ffffff",
    bgSolid: "#ffffff",
    text: "#000000",
    muted: "#4a4a4a",
    panel: "#f8f9fa",
    panelHover: "#f1f3f4",
    border: "#e1e5e9",
    borderHover: "#c7d2da",

    // Clean glass effect
    glass: "#f8f9fa",
    glassBorder: "#e1e5e9",

    // Input styling
    inputBg: "#ffffff",
    inputBorder: "#c7d2da",
    inputFocus: "rgba(0, 0, 0, 0.1)",

    // Modern black primary (matching logo)
    primary: "#000000",
    primarySolid: "#000000",
    primaryHover: "#333333",
    primaryBorder: "#000000",

    // Sophisticated accent - deep charcoal
    accent: "#1a1a1a",
    accentSolid: "#1a1a1a",

    // Status colors (refined)
    success: "#16a34a",
    successSolid: "#16a34a",
    danger: "#dc2626",
    dangerSolid: "#dc2626",
    dangerBorder: "#b91c1c",
    warning: "#d97706",
    warningSolid: "#d97706",

    // Special cocktail highlighting - subtle modern accent
    special: "#f0f9ff",
    specialSolid: "#0ea5e9",

    // Text gradients (modern black)
    textGradient: "#000000",
    textGradientAccent: "#1a1a1a",
  },
  
  // Dark mode colors
  dark: {
    // Dark mode palette
    bg: "#2a2a2a",
    bgSolid: "#2a2a2a",
    text: "#ffffff",
    muted: "#a0a0a0",
    panel: "#1a1a1a",
    panelHover: "#2a2a2a",
    border: "#333333",
    borderHover: "#4a4a4a",

    // Clean glass effect
    glass: "#1a1a1a",
    glassBorder: "#333333",

    // Input styling
    inputBg: "#1a1a1a",
    inputBorder: "#4a4a4a",
    inputFocus: "rgba(255, 255, 255, 0.1)",

    // Modern white primary (inverted from logo)
    primary: "#ffffff",
    primarySolid: "#ffffff",
    primaryHover: "#e0e0e0",
    primaryBorder: "#ffffff",

    // Sophisticated accent - light gray
    accent: "#e0e0e0",
    accentSolid: "#e0e0e0",

    // Status colors (refined)
    success: "#22c55e",
    successSolid: "#22c55e",
    danger: "#ef4444",
    dangerSolid: "#ef4444",
    dangerBorder: "#dc2626",
    warning: "#f59e0b",
    warningSolid: "#f59e0b",

    // Special cocktail highlighting - subtle modern accent
    special: "#1e3a8a",
    specialSolid: "#3b82f6",

    // Text gradients (modern white)
    textGradient: "#ffffff",
    textGradientAccent: "#e0e0e0",
  }
}

// Export current colors (will be updated by theme toggle)
export const currentColors = colors.light

// Export the main colors object for backward compatibility
export { colors as colorThemes }

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
  sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  glow: "0 0 20px rgba(0, 0, 0, 0.15)",
  glowAccent: "0 0 15px rgba(26, 26, 26, 0.2)",
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
  background: colors.light.panel,
  border: `1px solid ${colors.light.border}`,
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
  background: colors.light.inputBg,
  border: `1px solid ${colors.light.inputBorder}`,
  color: colors.light.text,
  padding: `${space.md}px ${space.lg}px`,
  borderRadius: radii.md,
  fontSize: fonts.base,
  transition: `all ${transitions.fast}`,
  outline: "none",
}

// Modern black primary button (matching logo)
export const btnPrimary: CSSProperties = {
  background: colors.light.primary,
  border: "none",
  color: "#ffffff",
  padding: `${space.md}px ${space.xl}px`,
  borderRadius: radii.sm,
  fontSize: fonts.base,
  fontWeight: 700,
  cursor: "pointer",
  transition: `all ${transitions.fast}`,
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

// Modern secondary button
export const btnSecondary: CSSProperties = {
  background: "#ffffff",
  border: `2px solid ${colors.light.primary}`,
  color: colors.light.primary,
  padding: `${space.sm}px ${space.lg}px`,
  borderRadius: radii.sm,
  fontSize: fonts.label,
  fontWeight: 600,
  cursor: "pointer",
  transition: `all ${transitions.fast}`,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
}

// Clean danger button
export const dangerBtn: CSSProperties = {
  background: colors.light.danger,
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
  fontWeight: 800,
  fontSize: fonts.small,
  color: colors.light.primary,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  verticalAlign: "top",
  borderBottom: `2px solid ${colors.light.primary}`,
}

// Enhanced table cells
export const td: CSSProperties = {
  padding: `${space.lg}px ${space.lg}px`,
  fontSize: fonts.base,
  color: colors.light.text,
  verticalAlign: "top",
  borderBottom: `1px solid ${colors.light.border}`,
}

// Text gradient helper
export const textGradient = (gradient: string = colors.light.textGradient): CSSProperties => ({
  background: gradient,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
})

// Muted text helper
export const mutedText: CSSProperties = { 
  color: colors.light.muted,
  fontSize: fonts.small,
}

// Glow effect helper
export const glow = (color: string = colors.light.primarySolid): CSSProperties => ({
  boxShadow: `0 0 20px ${color}40`,
})

// Top-level page wrapper with gradient background
export const appWrap: CSSProperties = {
  minHeight: "100vh",
  background: colors.light.bg,
  color: colors.light.text,
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  lineHeight: 1.6,
}

// Enhanced container
export const container: CSSProperties = {
  maxWidth: layout.maxWidth,
  margin: "0 auto",
  padding: `${space.xl}px ${space.lg}px`,
}
