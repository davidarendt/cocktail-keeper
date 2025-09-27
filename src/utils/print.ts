// src/utils/print.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrintCocktail } from "../types"
import { escapeHtml } from "./text"

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

export async function printMultipleCocktails(
  supabase: SupabaseClient,
  cocktails: PrintCocktail[],
  opts: PrintOptions = {}
): Promise<void> {
  if (cocktails.length === 0) {
    alert("No cocktails selected for printing")
    return
  }

  const page = opts.page ?? "Letter"
  const orientation = opts.orientation ?? "landscape"
  const margin = opts.margin ?? "6mm"
  const title = opts.title ?? `${cocktails.length} Cocktails`
  const autoPrint = opts.autoPrint ?? true

  const pageSize = computePageSize(page, orientation)

  // Fetch ingredients for all cocktails
  const cocktailData = await Promise.all(
    cocktails.map(async (c) => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("amount, unit, position, ingredient:ingredients(name)")
        .eq("cocktail_id", c.id)
        .order("position", { ascending: true })

      if (error) {
        console.error(`Error loading ingredients for ${c.name}:`, error)
        return { ...c, lines: ["Error loading ingredients"] }
      }

      const lines = (data || []).map((r: any) =>
        `${normalizeAmount(r.amount)} ${r.unit ?? ""} ${r.ingredient?.name ?? ""}`.trim()
      )

      return {
        ...c,
        lines: lines.length > 0 ? lines : ["No ingredients found"]
      }
    })
  )

  const htmlContent = generateMultiCocktailHTML(cocktailData, pageSize, margin, title)

  // Try to open popup window
  const w = window.open("", "_blank", "width=1200,height=800,noopener")
  if (!w) { 
    // Fallback: use current window for printing
    console.log("Popup blocked, using fallback print method...")
    printInCurrentWindow(htmlContent, title)
    return 
  }
  
  console.log("Multi-cocktail print window opened, writing content...")
  w.document.write(htmlContent)
  w.document.close()
  
  // Auto-print on window load if enabled
  if (autoPrint) {
    w.addEventListener('load', () => {
      console.log("Window loaded, triggering print...")
      w.print()
    })
    
    // Fallback: if load event doesn't fire, try after a short delay
    setTimeout(() => {
      if (w.document.readyState === 'complete') {
        console.log("Window ready via timeout, triggering print...")
        w.print()
      }
    }, 100)
  }
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

  console.log("Recipe data:", data)
  console.log("Generated lines:", lines)
  console.log("Cocktail data:", c)

  // Fallback if no ingredients found
  if (lines.length === 0) {
    lines.push("No ingredients found")
  }

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

  // Try to open popup window
  const w = window.open("", "_blank", "width=980,height=720,noopener")
  if (!w) { 
    // Fallback: use current window for printing
    console.log("Popup blocked, using fallback print method...")
    printInCurrentWindow(htmlContent, title)
    return 
  }
  
  console.log("Print window opened, writing content...")
  console.log("HTML content preview:", htmlContent.substring(0, 200) + "...")
  w.document.write(htmlContent)
  w.document.close()
  console.log("HTML content written and document closed")
  
  // Auto-print on window load if enabled
  if (autoPrint) {
    w.addEventListener('load', () => {
      console.log("Window loaded, triggering print...")
      w.print()
    })
    
    // Fallback: if load event doesn't fire, try after a short delay
    setTimeout(() => {
      if (w.document.readyState === 'complete') {
        console.log("Window ready via timeout, triggering print...")
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

/** Generate HTML for multi-cocktail print layout */
function generateMultiCocktailHTML(
  cocktailData: Array<PrintCocktail & { lines: string[] }>,
  pageSize: string,
  margin: string,
  title: string
): string {
  // Group cocktails into pairs for 2-per-page layout
  const pairs: Array<Array<PrintCocktail & { lines: string[] }>> = []
  for (let i = 0; i < cocktailData.length; i += 2) {
    pairs.push(cocktailData.slice(i, i + 2))
  }

  const pages = pairs.map((pair) => {
    const leftCocktail = pair[0]
    const rightCocktail = pair[1] || null

    return `
      <div class="page">
        <div class="cocktail-left">
          ${generateCocktailHTML(leftCocktail)}
        </div>
        ${rightCocktail ? `
          <div class="cocktail-right">
            ${generateCocktailHTML(rightCocktail)}
          </div>
        ` : ''}
      </div>
    `
  }).join('')

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    @page { 
      size: ${pageSize}; 
      margin: ${margin}; 
    }
    :root { 
      --ink: #111; 
      --muted: #555; 
      --border: #ddd; 
      --accent: #667eea;
    }
    * { box-sizing: border-box; }
    body { 
      font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial; 
      color: var(--ink); 
      margin: 0; 
      padding: 0;
      line-height: 1.3; 
      background: white;
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    
    .page {
      width: 100%;
      height: 100vh;
      display: flex;
      page-break-after: always;
      gap: 8mm;
      padding: 0;
    }
    
    .cocktail-left, .cocktail-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      background: #fafafa;
    }
    
    .cocktail-right {
      border-left: 2px solid var(--accent);
    }
    
    .cocktail-header {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    
    .cocktail-name {
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
      margin: 0 0 4px 0;
    }
    
    .cocktail-meta {
      font-size: 12px;
      color: var(--muted);
      margin: 0;
    }
    
    .cocktail-specs {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .specs-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .ingredients-list {
      list-style: none;
      padding: 0;
      margin: 0 0 12px 0;
      flex: 1;
    }
    
    .ingredients-list li {
      font-size: 13px;
      color: var(--ink);
      margin: 3px 0;
      padding: 2px 0;
    }
    
    .cocktail-details {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }
    
    .detail-row {
      font-size: 11px;
      color: var(--muted);
      margin: 2px 0;
    }
    
    .detail-label {
      font-weight: 600;
      color: var(--ink);
    }
    
    .actions {
      position: fixed;
      right: 8px;
      top: 8px;
      z-index: 1000;
    }
    
    .btn {
      font: inherit;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #bbb;
      background: #f3f4f6;
      cursor: pointer;
      margin-left: 6px;
    }
    
    @media print { 
      .noprint { display: none; }
      .page { height: 100%; }
    }
  </style>
</head>
<body>
  <div class="actions noprint">
    <button class="btn" onclick="window.print()">Print</button>
    <button class="btn" onclick="window.close()">Close</button>
  </div>

  ${pages}
</body>
</html>
  `
}

/** Generate HTML for a single cocktail */
function generateCocktailHTML(cocktail: PrintCocktail & { lines: string[] }): string {
  return `
    <div class="cocktail-header">
      <h1 class="cocktail-name">${escapeHtml(cocktail.name)}</h1>
      <p class="cocktail-meta">
        ${escapeHtml(cocktail.method || "")}${cocktail.glass ? " • " + escapeHtml(cocktail.glass) : ""}
      </p>
    </div>
    
    <div class="cocktail-specs">
      <h3 class="specs-title">Specs</h3>
      <ul class="ingredients-list">
        ${cocktail.lines.map(line => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
    </div>
    
    <div class="cocktail-details">
      ${cocktail.garnish ? `<div class="detail-row"><span class="detail-label">Garnish:</span> ${escapeHtml(cocktail.garnish)}</div>` : ""}
      ${cocktail.notes ? `<div class="detail-row"><span class="detail-label">Notes:</span> ${escapeHtml(cocktail.notes)}</div>` : ""}
      <div class="detail-row">
        <span class="detail-label">Price:</span> 
        ${cocktail.price != null ? `$${Number(cocktail.price).toFixed(2)}` : "—"}
      </div>
      ${cocktail.last_special_on ? `<div class="detail-row"><span class="detail-label">Special:</span> ${escapeHtml(cocktail.last_special_on)}</div>` : ""}
    </div>
  `
}

/** Fallback print method when popups are blocked */
function printInCurrentWindow(htmlContent: string, _title: string): void {
  // Create a temporary iframe for printing
  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.left = '-9999px'
  iframe.style.top = '-9999px'
  iframe.style.width = '1px'
  iframe.style.height = '1px'
  
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (iframeDoc) {
    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()
    
    // Wait for content to load, then print
    setTimeout(() => {
      iframe.contentWindow?.print()
      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 100)
  }
}

/** helpers */
function normalizeAmount(a: any): string {
  const n = Number(a)
  if (!isFinite(n)) return String(a ?? "")
  return Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, "")
}
