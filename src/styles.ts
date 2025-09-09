// src/styles.ts
import type { CSSProperties } from "react"
import {
  colors, space, radii, fonts, layout, shadows, transitions,
  card, cardHover, inp, btnPrimary, btnSecondary, dangerBtn,
  th, td, mutedText, textGradient, glow,
  appWrap as appWrapBase,
  container as containerBase
} from "./theme"

// Enhanced app wrapper with gradient background
export const appWrap: CSSProperties = {
  ...appWrapBase,
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",
  background: colors.bg,
  color: colors.text,
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
  colors, space, radii, fonts, layout, shadows, transitions,
  card, cardHover, inp, btnPrimary, btnSecondary, dangerBtn,
  th, td, mutedText, textGradient, glow
}

// Enhanced shadow utilities
export const shadowMd: CSSProperties = { boxShadow: shadows.md }
export const shadowLg: CSSProperties = { boxShadow: shadows.lg }
export const shadowXl: CSSProperties = { boxShadow: shadows.xl }

// Enhanced focus ring
export const focusRing = (c: string = colors.primarySolid): CSSProperties => ({
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

// Special cocktail badge
export const specialBadge: CSSProperties = {
  background: colors.special,
  color: colors.bgSolid,
  padding: `${space.xs}px ${space.sm}px`,
  borderRadius: radii.full,
  fontSize: fonts.caption,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  boxShadow: shadows.sm,
}

// Price display
export const priceDisplay: CSSProperties = {
  ...textGradient(colors.accent),
  fontWeight: 700,
  fontSize: fonts.large,
}

// Ingredient list styling
export const ingredientList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
}
