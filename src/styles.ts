// src/styles.ts
import type { CSSProperties } from "react"

// Re-export everything you already have in theme.ts
export {
  colors, space, radii, fonts, layout,
  border, card,
  inp, btnPrimary, btnSecondary, dangerBtn,
  th, td, mutedText, appWrap, container
} from "./theme"

// Optional extras you can use anywhere
export const shadowMd: CSSProperties = { boxShadow: "0 6px 16px rgba(0,0,0,.25)" }
export const focusRing = (c: string = "#6366f1"): CSSProperties => ({
  outline: "none",
  boxShadow: `0 0 0 3px ${c}44`
})
export const disabled: CSSProperties = { opacity: 0.6, cursor: "not-allowed" }
