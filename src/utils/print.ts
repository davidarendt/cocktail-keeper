// src/utils/print.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrintCocktail } from "@/types"

type PrintOptions = {
  /** "A5" | "HalfLetter" | "Letter" — default "A5" */
  page?: "A5" | "HalfLetter" | "Letter"
  /** "portrait" | "landscape" — default "portrait" */
  orientation?: "portrait" | "landscape"
  /** CSS margin (e.g., "14mm") — default "14mm" */
  margin?: string
  /** Document title override. Defaults to cocktail name. */
  title?: string
}

export async function printOnePager(
  supabase: SupabaseClient,
  c: PrintCocktail,
  opts: PrintOptions = {}
): Promise<void> {
  const page = opts.page ?? "A5"
  const orientation = opts.orientation ?? "portrait"
  const margin = opts.margin ?? "14mm"
  const title = opts.title ?? c.name

  const pageSize = computePageSize(page, orientation)

  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("amount, unit, position, ingredient:ingredients(name)")
    .eq("cocktail_id", c.id)
    .order("position", { ascending: true })

  if (error) {
    alert("Could not load specs: " + error.message)
    return
  }

  const lines = (data || []).map((r: any) =>
    `${normalizeAmount(r.amount)} ${r.unit ?? ""} ${r.ingredient?.name ?? ""}`.trim()
  )

  const w = window.open("", "_blank", "width=980,height=720,noopener")
  if (!w) { alert("Popup blocked. Please allow popups for this site to print."); return }

  w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${pageSize}; margin: ${margin}; }
    :root { --ink: #111; --muted: #555; --border: #ddd; }
    * { box-sizing: border-box; }
    body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial; color: var(--ink); margin: 0; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .muted { color: var(--muted); font-size: 12px; }
    .row { margin: 6px 0; }
    .box { border: 1px solid var(--border); border-radius: 8px; padding: 10px; }
    ul { margin: 8px 0 12px; padding-left: 18px; }
    li { margin: 3px 0; }
    .footer { margin-top: 10px; font-size: 12px; color: var(--muted); }
    @media print { .noprint { display: none; } }
    .actions { position: fixed; right: 12px; top: 12px; }
    .btn { font: inherit; font-size: 12px; padding: 6px 10px; border-radius: 8px; border: 1px solid #bbb; background: #f3f4f6; cursor: pointer; margin-left: 8px; }
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

  <script> setTimeout(() => { window.print() }, 50); </script>
</body>
</html>
  `)
  w.document.close()
}

function computePageSize(page: "A5" | "HalfLetter" | "Letter", orientation: "portrait" | "landscape"): string {
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
