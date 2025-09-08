// src/styles.ts
import type { CSSProperties } from "react"
import {
  colors, space, radii, fonts, layout,
  border, card, inp, btnPrimary, btnSecondary, dangerBtn,
  th, td, mutedText, appWrap, container as containerBase
} from "./theme"

// Make the page wider + comfy padding on all devices
export const container: CSSProperties = {
  ...containerBase,
  maxWidth: 1280,     // was ~900; fills more of large screens
  width: "100%",
  margin: "0 auto",
  padding: 16,        // better on mobile but fine on desktop
}

// Re-export everything else unchanged
export {
  colors, space, radii, fonts, layout,
  border, card, inp, btnPrimary, btnSecondary, dangerBtn,
  th, td, mutedText, appWrap
}

// Optional extras
export const shadowMd: CSSProperties = { boxShadow: "0 6px 16px rgba(0,0,0,.25)" }
export const focusRing = (c: string = "#6366f1"): CSSProperties => ({
  outline: "none",
  boxShadow: `0 0 0 3px ${c}44`,   // fixed: needs to be a string template
})
export const disabled: CSSProperties = { opacity: 0.6, cursor: "not-allowed" }
