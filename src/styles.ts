// src/styles.ts
import type { CSSProperties } from "react"
import {
  colors, space, radii, fonts, layout, shadows, transitions,
  card, cardHover, inp, btnPrimary, btnSecondary, dangerBtn,
  th, td, mutedText, textGradient, glow,
  appWrap as appWrapBase,
  container as containerBase
} from "./theme"

// Use light theme colors by default
const currentColors = colors.light

// Export the current colors for components to use
export { currentColors as colors }

// Enhanced app wrapper with gradient background
export const appWrap: CSSProperties = {
  ...appWrapBase,
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",
  background: currentColors.bg,
  color: currentColors.text,
  position: "relative",
}

// Enhanced container with better spacing
export const container: CSSProperties = {
  ...containerBase,
  maxWidth: layout.maxWidth,
  width: "100%",
  margin: "0 auto",
  padding: `${space.xl}px ${space.lg}px`,
  position: "relative",
  zIndex: 1,
}

// Re-export the enhanced theme
export {
  space, radii, fonts, layout, shadows, transitions,
  card, cardHover, inp, btnPrimary, btnSecondary, dangerBtn,
  th, td, mutedText, textGradient, glow
}

// Enhanced shadow utilities
export const shadowMd: CSSProperties = { boxShadow: shadows.md }
export const shadowLg: CSSProperties = { boxShadow: shadows.lg }
export const shadowXl: CSSProperties = { boxShadow: shadows.xl }

// Enhanced focus ring
export const focusRing = (c: string = currentColors.primarySolid): CSSProperties => ({
  outline: "none",
  boxShadow: `0 0 0 3px ${c}40`,
  border: `1px solid ${c}`,
})

// Disabled state
export const disabled: CSSProperties = { 
  opacity: 0.6, 
  cursor: "not-allowed",
  pointerEvents: "none",
}

// Loading state
export const loading: CSSProperties = {
  opacity: 0.7,
  pointerEvents: "none",
}

// Animated card for cocktail items
export const cocktailCard: CSSProperties = {
  ...cardHover({
    position: "relative",
    overflow: "hidden",
  }),
}

// Special cocktail badge - modern blue
export const specialBadge: CSSProperties = {
  background: currentColors.specialSolid,
  color: "#ffffff",
  padding: `${space.xs}px ${space.sm}px`,
  borderRadius: radii.sm,
  fontSize: fonts.caption,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
}

// Ology recipe badge - black
export const ologyBadge: CSSProperties = {
  background: currentColors.primary,
  color: "#ffffff",
  padding: `${space.xs}px ${space.sm}px`,
  borderRadius: radii.sm,
  fontSize: fonts.caption,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
}

// Price display - black
export const priceDisplay: CSSProperties = {
  color: currentColors.primary,
  fontWeight: 800,
  fontSize: fonts.large,
  letterSpacing: "0.5px",
}

// Ingredient list styling
export const ingredientList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
}
