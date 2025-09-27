// src/components/PrintDesigner.tsx
import React, { useState, useRef, useEffect } from "react"
import { btnPrimary, btnSecondary, colors, shadows } from "../styles"
import type { PrintCocktail } from "../types"

type PrintLayout = {
  pageSize: "Letter" | "A4" | "HalfLetter"
  orientation: "portrait" | "landscape"
  margin: number
  columns: 1 | 2
  gap: number
}

type CocktailElement = {
  id: string
  type: "name" | "method" | "glass" | "ingredients" | "garnish" | "notes" | "price"
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontWeight: "normal" | "bold"
  color: string
  visible: boolean
}

type PrintDesign = {
  layout: PrintLayout
  elements: CocktailElement[]
  backgroundColor: string
  borderColor: string
  borderWidth: number
}

type Props = {
  cocktails: PrintCocktail[]
  onClose: () => void
  onPrint: (design: PrintDesign) => void
}

const defaultDesign: PrintDesign = {
  layout: {
    pageSize: "Letter",
    orientation: "landscape",
    margin: 20,
    columns: 2,
    gap: 15
  },
  elements: [
    { id: "name", type: "name", x: 10, y: 10, width: 80, height: 15, fontSize: 18, fontWeight: "bold", color: "#000000", visible: true },
    { id: "method", type: "method", x: 10, y: 30, width: 40, height: 10, fontSize: 12, fontWeight: "normal", color: "#666666", visible: true },
    { id: "glass", type: "glass", x: 55, y: 30, width: 40, height: 10, fontSize: 12, fontWeight: "normal", color: "#666666", visible: true },
    { id: "ingredients", type: "ingredients", x: 10, y: 45, width: 80, height: 30, fontSize: 13, fontWeight: "normal", color: "#000000", visible: true },
    { id: "garnish", type: "garnish", x: 10, y: 80, width: 40, height: 8, fontSize: 11, fontWeight: "normal", color: "#333333", visible: true },
    { id: "notes", type: "notes", x: 55, y: 80, width: 40, height: 8, fontSize: 11, fontWeight: "normal", color: "#333333", visible: true },
    { id: "price", type: "price", x: 10, y: 90, width: 20, height: 8, fontSize: 12, fontWeight: "bold", color: "#000000", visible: true }
  ],
  backgroundColor: "#ffffff",
  borderColor: "#dddddd",
  borderWidth: 1
}

export function PrintDesigner({ cocktails, onClose, onPrint }: Props) {
  const [design, setDesign] = useState<PrintDesign>(defaultDesign)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const updateElement = (elementId: string, updates: Partial<CocktailElement>) => {
    setDesign(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    }))
  }

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault()
    setSelectedElement(elementId)
    setDragging(true)
    
    const element = design.elements.find(el => el.id === elementId)
    if (element && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging && selectedElement && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const newX = Math.max(0, Math.min(90, e.clientX - rect.left - dragOffset.x))
      const newY = Math.max(0, Math.min(90, e.clientY - rect.top - dragOffset.y))
      
      updateElement(selectedElement, { x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    setDragging(false)
  }

  const renderElement = (element: CocktailElement, cocktail: PrintCocktail) => {
    if (!element.visible) return null

    let content = ""
    switch (element.type) {
      case "name":
        content = cocktail.name
        break
      case "method":
        content = cocktail.method || ""
        break
      case "glass":
        content = cocktail.glass || ""
        break
      case "ingredients":
        content = "2 oz Gin\n1 oz Lemon\n0.5 oz Simple" // Placeholder
        break
      case "garnish":
        content = cocktail.garnish || ""
        break
      case "notes":
        content = cocktail.notes || ""
        break
      case "price":
        content = cocktail.price ? `$${cocktail.price.toFixed(2)}` : ""
        break
    }

    return (
      <div
        key={element.id}
        style={{
          position: "absolute",
          left: `${element.x}%`,
          top: `${element.y}%`,
          width: `${element.width}%`,
          height: `${element.height}%`,
          fontSize: `${element.fontSize}px`,
          fontWeight: element.fontWeight,
          color: element.color,
          border: selectedElement === element.id ? "2px dashed #007bff" : "1px dashed transparent",
          cursor: "move",
          padding: "2px",
          whiteSpace: "pre-wrap",
          overflow: "hidden"
        }}
        onMouseDown={(e) => handleMouseDown(e, element.id)}
      >
        {content}
      </div>
    )
  }

  const getPageDimensions = () => {
    const { pageSize, orientation } = design.layout
    const aspectRatio = orientation === "landscape" ? 11/8.5 : 8.5/11
    
    if (pageSize === "A4") {
      return orientation === "landscape" ? { width: 400, height: 283 } : { width: 283, height: 400 }
    } else if (pageSize === "HalfLetter") {
      return orientation === "landscape" ? { width: 300, height: 200 } : { width: 200, height: 300 }
    } else { // Letter
      return orientation === "landscape" ? { width: 400, height: 300 } : { width: 300, height: 400 }
    }
  }

  const pageDimensions = getPageDimensions()

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.8)",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header */}
      <div style={{
        background: colors.panel,
        padding: "16px",
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h2 style={{ margin: 0, color: colors.text }}>Print Designer</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onPrint(design)} style={btnPrimary}>
            🖨️ Print
          </button>
          <button onClick={onClose} style={btnSecondary}>
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Panel - Controls */}
        <div style={{
          width: 300,
          background: colors.panel,
          borderRight: `1px solid ${colors.border}`,
          padding: 16,
          overflowY: "auto"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: colors.text }}>Layout Settings</h3>
          
          {/* Page Settings */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, color: colors.text }}>Page Size</label>
            <select 
              value={design.layout.pageSize}
              onChange={(e) => setDesign(prev => ({
                ...prev,
                layout: { ...prev.layout, pageSize: e.target.value as any }
              }))}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: `1px solid ${colors.border}` }}
            >
              <option value="Letter">Letter (8.5" x 11")</option>
              <option value="A4">A4 (210mm x 297mm)</option>
              <option value="HalfLetter">Half Letter (5.5" x 8.5")</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, color: colors.text }}>Orientation</label>
            <select 
              value={design.layout.orientation}
              onChange={(e) => setDesign(prev => ({
                ...prev,
                layout: { ...prev.layout, orientation: e.target.value as any }
              }))}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: `1px solid ${colors.border}` }}
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, color: colors.text }}>Columns</label>
            <select 
              value={design.layout.columns}
              onChange={(e) => setDesign(prev => ({
                ...prev,
                layout: { ...prev.layout, columns: parseInt(e.target.value) as any }
              }))}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: `1px solid ${colors.border}` }}
            >
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
            </select>
          </div>

          {/* Element Selection */}
          <h3 style={{ margin: "20px 0 16px 0", color: colors.text }}>Elements</h3>
          {design.elements.map(element => (
            <div key={element.id} style={{
              padding: 8,
              marginBottom: 8,
              background: selectedElement === element.id ? colors.accent + "20" : "transparent",
              border: `1px solid ${selectedElement === element.id ? colors.accent : colors.border}`,
              borderRadius: 4,
              cursor: "pointer"
            }} onClick={() => setSelectedElement(element.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: colors.text, textTransform: "capitalize" }}>{element.type}</span>
                <input
                  type="checkbox"
                  checked={element.visible}
                  onChange={(e) => updateElement(element.id, { visible: e.target.checked })}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {selectedElement === element.id && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 12, color: colors.muted }}>Font Size</label>
                    <input
                      type="range"
                      min="8"
                      max="24"
                      value={element.fontSize}
                      onChange={(e) => updateElement(element.id, { fontSize: parseInt(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                    <span style={{ fontSize: 12, color: colors.muted }}>{element.fontSize}px</span>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: 12, color: colors.muted }}>Font Weight</label>
                    <select
                      value={element.fontWeight}
                      onChange={(e) => updateElement(element.id, { fontWeight: e.target.value as any })}
                      style={{ width: "100%", padding: 4, fontSize: 12 }}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: 12, color: colors.muted }}>Color</label>
                    <input
                      type="color"
                      value={element.color}
                      onChange={(e) => updateElement(element.id, { color: e.target.value })}
                      style={{ width: "100%", height: 32 }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Center Panel - Canvas */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div
            ref={canvasRef}
            style={{
              width: pageDimensions.width,
              height: pageDimensions.height,
              background: design.backgroundColor,
              border: `${design.borderWidth}px solid ${design.borderColor}`,
              position: "relative",
              boxShadow: shadows.lg,
              cursor: dragging ? "grabbing" : "default"
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {cocktails.slice(0, design.layout.columns).map((cocktail, index) => (
              <div
                key={cocktail.id}
                style={{
                  position: "absolute",
                  left: index === 0 ? "5%" : "50%",
                  top: "5%",
                  width: "40%",
                  height: "90%",
                  border: "1px dashed #ccc",
                  padding: 10
                }}
              >
                {design.elements.map(element => renderElement(element, cocktail))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div style={{
          width: 250,
          background: colors.panel,
          borderLeft: `1px solid ${colors.border}`,
          padding: 16,
          overflowY: "auto"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: colors.text }}>Page Properties</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, color: colors.text }}>Background Color</label>
            <input
              type="color"
              value={design.backgroundColor}
              onChange={(e) => setDesign(prev => ({ ...prev, backgroundColor: e.target.value }))}
              style={{ width: "100%", height: 40 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, color: colors.text }}>Border Color</label>
            <input
              type="color"
              value={design.borderColor}
              onChange={(e) => setDesign(prev => ({ ...prev, borderColor: e.target.value }))}
              style={{ width: "100%", height: 40 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, color: colors.text }}>Border Width</label>
            <input
              type="range"
              min="0"
              max="5"
              value={design.borderWidth}
              onChange={(e) => setDesign(prev => ({ ...prev, borderWidth: parseInt(e.target.value) }))}
              style={{ width: "100%" }}
            />
            <span style={{ fontSize: 12, color: colors.muted }}>{design.borderWidth}px</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, color: colors.text }}>Margin</label>
            <input
              type="range"
              min="5"
              max="50"
              value={design.layout.margin}
              onChange={(e) => setDesign(prev => ({
                ...prev,
                layout: { ...prev.layout, margin: parseInt(e.target.value) }
              }))}
              style={{ width: "100%" }}
            />
            <span style={{ fontSize: 12, color: colors.muted }}>{design.layout.margin}px</span>
          </div>
        </div>
      </div>
    </div>
  )
}
