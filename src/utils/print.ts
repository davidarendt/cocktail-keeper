// src/utils/print.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrintCocktail } from "../types"

type PrintOptions = {
  /** "A5" | "HalfLetter" | "Letter" | "HalfLetterLandscape" — default "HalfLetterLandscape" */
  page?: "A5" | "HalfLetter" | "Letter" | "HalfLetterLandscape"
  /** "portrait" | "landscape" — default "landscape" */
  orientation?: "portrait" | "landscape"
  /** CSS margin (e.g., "14mm") — default "8mm" */
  margin?: string
  /** Document title override. Defaults to cocktail name. */
  title?: string
  /** Auto-print immediately when opened */
  autoPrint?: boolean
}

export async function printOnePager(
  supabase: SupabaseClient,
  c: PrintCocktail,
  opts: PrintOptions = {}
): Promise<void> {
  const page = opts.page ?? "HalfLetterLandscape"
  const orientation = opts.orientation ?? "landscape"
  const margin = opts.margin ?? "8mm"
  const title = opts.title ?? c.name
  const autoPrint = opts.autoPrint ?? true

  const pageSize = computePageSize(page, orientation)

  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("amount, unit, position, ingredient:ingredients(name)")
    .eq("cocktail_id", c.id)
    .order("position", { ascending: true })

  if (error) {
    console.error("PrintOnePager: Could not load recipe ingredients:", error)
    alert("Could not load recipe ingredients: " + error.message)
    return
  }

  const lines = (data || []).map((r: any) =>
    `${normalizeAmount(r.amount)} ${r.unit ?? ""} ${r.ingredient?.name ?? ""}`.trim()
  )

  // Fallback if no ingredients found
  if (lines.length === 0) {
    lines.push("No ingredients found")
  }

  const w = window.open("", "_blank", "width=980,height=720,noopener")
  if (!w) { alert("Popup blocked. Please allow popups for this site to print."); return }

  const htmlContent = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${pageSize}; margin: ${margin}; }
    :root { --ink: #111; --muted: #555; --border: #ddd; }
    * { box-sizing: border-box; }
    body { 
      font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial; 
      color: var(--ink); 
      margin: 0; 
      padding: 20px;
      line-height: 1.2; 
      background: white;
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    h1 { margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #000; }
    .muted { color: var(--muted); font-size: 11px; margin-bottom: 8px; }
    .row { margin: 4px 0; }
    .box { border: 1px solid var(--border); border-radius: 6px; padding: 8px; margin-bottom: 8px; background: #f9f9f9; }
    ul { margin: 6px 0 8px; padding-left: 16px; }
    li { margin: 2px 0; font-size: 13px; color: #000; }
    .footer { margin-top: 8px; font-size: 10px; color: var(--muted); }
    @media print { .noprint { display: none; } }
    .actions { position: fixed; right: 8px; top: 8px; z-index: 1000; }
    .btn { font: inherit; font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid #bbb; background: #f3f4f6; cursor: pointer; margin-left: 6px; }
  </style>
</head>
<body>
  <div class="actions noprint">
    <button class="btn" onclick="window.print()">Print</button>
    <button class="btn" onclick="window.close()">Close</button>
  </div>

  <h1>${escapeHtml(c.name)}</h1>
  <div class="muted">
    ${escapeHtml(c.method || "")}${c.glass ? " • " + escapeHtml(c.glass) : ""}
  </div>

  <div class="row box">
    <strong>Specs</strong>
    <ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
    ${c.garnish ? `<div><strong>Garnish:</strong> ${escapeHtml(c.garnish)}</div>` : ""}
    ${c.notes ? `<div class="row"><strong>Notes:</strong> ${escapeHtml(c.notes)}</div>` : ""}
  </div>

  <div class="footer">
    Price: ${c.price != null ? `$${Number(c.price).toFixed(2)}` : "—"}
    ${c.last_special_on ? " • Special: " + escapeHtml(c.last_special_on) : ""}
  </div>

  <script>
    ${autoPrint ? `setTimeout(() => { window.print() }, 50);` : ''}
  </script>
</body>
</html>
  `

  w.document.write(htmlContent)
  w.document.close()
  
  // Auto-print on window load if enabled
  if (autoPrint) {
    w.addEventListener('load', () => {
      w.print()
    })
    
    // Fallback: if load event doesn't fire, try after a short delay
    setTimeout(() => {
      if (w.document.readyState === 'complete') {
        w.print()
      }
    }, 100)
  }
}

function computePageSize(page: "A5" | "HalfLetter" | "Letter" | "HalfLetterLandscape", orientation: "portrait" | "landscape"): string {
  if (page === "HalfLetterLandscape") {
    // Half of 8.5x11 in landscape: 5.5" x 8.5"
    return "5.5in 8.5in"
  }
  if (page === "HalfLetter") {
    // portrait 5.5" x 8.5", landscape 8.5" x 5.5"
    return orientation === "landscape" ? "8.5in 5.5in" : "5.5in 8.5in"
  }
  if (page === "Letter") {
    return orientation === "landscape" ? "Letter landscape" : "Letter"
  }
  // A5 supports "A5 landscape"
  return orientation === "landscape" ? "A5 landscape" : "A5"
}

/** helpers */
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] as string)
  )
}
function normalizeAmount(a: any): string {
  const n = Number(a)
  if (!isFinite(n)) return String(a ?? "")
  return Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, "")
}
