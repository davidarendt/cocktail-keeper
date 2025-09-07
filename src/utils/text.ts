// src/utils/text.ts

/** Non-empty string (after trim) */
export function ng(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0
}

/** Escape HTML for safe injection into string templates */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] as string)
  )
}

/** Normalize user search input (lowercase + strip spaces) */
export function normalizeSearchTerm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "")
}

/** Split to lowercase words for word-start matching */
export function splitWords(s: string): string[] {
  return s.toLowerCase().trim().split(/\s+/).filter(Boolean)
}

/**
 * Simple relevance score:
 *  - 0: exact/startsWith
 *  - +0: any word startsWith
 *  - +1: contains (or contains when spaces removed)
 *  - +100/+200 penalties when not matched by the above
 */
export function scoreMatch(name: string, term: string): number {
  const n = name.toLowerCase()
  const t = term.toLowerCase().trim()
  const tC = normalizeSearchTerm(t)
  const words = splitWords(n)

  const starts = n.startsWith(t) ? 0 : 100
  const wordStart = words.some((w) => w.startsWith(t)) ? 0 : 50
  const contains = n.includes(t) || normalizeSearchTerm(n).includes(tC) ? 1 : 200

  return starts + wordStart + contains
}

/** "$12.00" or "—" when null/undefined */
export function formatPrice(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—"
  const n = Number(v)
  return isFinite(n) ? `$${n.toFixed(2)}` : "—"
}
