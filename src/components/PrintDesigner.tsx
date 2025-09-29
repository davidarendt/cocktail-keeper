// src/components/PrintDesigner.tsx
import React, { useState, useRef, useCallback } from "react"
import { btnPrimary, btnSecondary, colors, shadows } from "../styles"
import type { PrintCocktail } from "../types"

type BlockType = "name" | "method" | "glass" | "ingredients" | "garnish" | "notes" | "price" | "divider"

type Block = {
  id: string
  type: BlockType
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontWeight: "normal" | "bold"
  color: string
  backgroundColor: string
  borderColor: string
  borderWidth: number
  padding: number
  textAlign: "left" | "center" | "right"
  visible: boolean
}

type PrintLayout = {
  pageSize: "Letter" | "A4" | "HalfLetter"
  orientation: "portrait" | "landscape"
  margin: number
  columns: 1 | 2
  gap: number
}

type PrintDesign = {
  layout: PrintLayout
  blocks: Block[]
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
  blocks: [
    { id: "name-1", type: "name", x: 10, y: 10, width: 80, height: 15, fontSize: 18, fontWeight: "bold", color: "#000000", backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0, padding: 4, textAlign: "left", visible: true },
    { id: "method-1", type: "method", x: 10, y: 30, width: 40, height: 10, fontSize: 12, fontWeight: "normal", color: "#666666", backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0, padding: 2, textAlign: "left", visible: true },
    { id: "glass-1", type: "glass", x: 55, y: 30, width: 40, height: 10, fontSize: 12, fontWeight: "normal", color: "#666666", backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0, padding: 2, textAlign: "left", visible: true },
    { id: "ingredients-1", type: "ingredients", x: 10, y: 45, width: 80, height: 30, fontSize: 13, fontWeight: "normal", color: "#000000", backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0, padding: 4, textAlign: "left", visible: true },
    { id: "garnish-1", type: "garnish", x: 10, y: 80, width: 40, height: 8, fontSize: 11, fontWeight: "normal", color: "#333333", backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0, padding: 2, textAlign: "left", visible: true },
    { id: "price-1", type: "price", x: 55, y: 80, width: 40, height: 8, fontSize: 12, fontWeight: "bold", color: "#000000", backgroundColor: "transparent", borderColor: "transparent", borderWidth: 0, padding: 2, textAlign: "right", visible: true }
  ],
  backgroundColor: "#ffffff",
  borderColor: "#dddddd",
  borderWidth: 1
}

const blockTemplates: { [key in BlockType]: Partial<Block> } = {
  name: { width: 80, height: 15, fontSize: 18, fontWeight: "bold", color: "#000000", textAlign: "left" },
  method: { width: 40, height: 10, fontSize: 12, fontWeight: "normal", color: "#666666", textAlign: "left" },
  glass: { width: 40, height: 10, fontSize: 12, fontWeight: "normal", color: "#666666", textAlign: "left" },
  ingredients: { width: 80, height: 30, fontSize: 13, fontWeight: "normal", color: "#000000", textAlign: "left" },
  garnish: { width: 40, height: 8, fontSize: 11, fontWeight: "normal", color: "#333333", textAlign: "left" },
  notes: { width: 40, height: 8, fontSize: 11, fontWeight: "normal", color: "#333333", textAlign: "left" },
  price: { width: 20, height: 8, fontSize: 12, fontWeight: "bold", color: "#000000", textAlign: "right" },
  divider: { width: 80, height: 2, fontSize: 1, fontWeight: "normal", color: "#cccccc", backgroundColor: "#cccccc", textAlign: "center" }
}

export function PrintDesigner({ cocktails, onClose, onPrint }: Props) {
  const [design, setDesign] = useState<PrintDesign>(defaultDesign)
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [draggedBlockType, setDraggedBlockType] = useState<BlockType | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    setDesign(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId ? { ...block, ...updates } : block
      )
    }))
  }

  const addBlock = (type: BlockType, x: number, y: number) => {
    const template = blockTemplates[type]
    const newBlock: Block = {
      id: `${type}-${Date.now()}`,
      type,
      x: Math.max(0, Math.min(90, x)),
      y: Math.max(0, Math.min(90, y)),
      width: template.width || 40,
      height: template.height || 10,
      fontSize: template.fontSize || 12,
      fontWeight: template.fontWeight || "normal",
      color: template.color || "#000000",
      backgroundColor: template.backgroundColor || "transparent",
      borderColor: template.borderColor || "transparent",
      borderWidth: template.borderWidth || 0,
      padding: 4,
      textAlign: template.textAlign || "left",
      visible: true
    }
    
    setDesign(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }))
  }

  const removeBlock = (blockId: string) => {
    setDesign(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== blockId)
    }))
    if (selectedBlock === blockId) {
      setSelectedBlock(null)
    }
  }

  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedBlock(blockId)
    setDragging(true)
    
    const block = design.blocks.find(b => b.id === blockId)
    if (block && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left - (block.x * rect.width / 100),
        y: e.clientY - rect.top - (block.y * rect.height / 100)
      })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (dragging && selectedBlock && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const newX = Math.max(0, Math.min(90, ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100))
      const newY = Math.max(0, Math.min(90, ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100))
      
      updateBlock(selectedBlock, { x: newX, y: newY })
    }
  }

  const handleCanvasMouseUp = () => {
    setDragging(false)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (draggedBlockType && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      addBlock(draggedBlockType, x, y)
      setDraggedBlockType(null)
    } else {
      setSelectedBlock(null)
    }
  }

  const handleBlockDragStart = (e: React.DragEvent, blockType: BlockType) => {
    setDraggedBlockType(blockType)
  }

  const renderBlock = (block: Block, cocktail: PrintCocktail) => {
    if (!block.visible) return null

    let content = ""
    switch (block.type) {
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
        content = cocktail.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`).join("\n")
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
      case "divider":
        content = "—"
        break
    }

    const isSelected = selectedBlock === block.id

    return (
      <div
        key={block.id}
        style={{
          position: "absolute",
          left: `${block.x}%`,
          top: `${block.y}%`,
          width: `${block.width}%`,
          height: `${block.height}%`,
          fontSize: `${block.fontSize}px`,
          fontWeight: block.fontWeight,
          color: block.color,
          backgroundColor: block.backgroundColor,
          border: block.borderWidth > 0 ? `${block.borderWidth}px solid ${block.borderColor}` : "none",
          padding: `${block.padding}px`,
          textAlign: block.textAlign,
          cursor: "move",
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          boxSizing: "border-box",
          // Selection styling
          outline: isSelected ? "2px solid #007bff" : "none",
          outlineOffset: isSelected ? "1px" : "0",
          backgroundColor: isSelected ? "rgba(0, 123, 255, 0.1)" : block.backgroundColor,
          // Resize handles for selected blocks
          ...(isSelected && {
            boxShadow: "0 0 0 1px #007bff, 0 0 0 3px rgba(0, 123, 255, 0.2)"
          })
        }}
        onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
      >
        {content}
        {isSelected && (
          <>
            {/* Resize handles */}
            <div style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              width: "8px",
              height: "8px",
              backgroundColor: "#007bff",
              border: "1px solid white",
              borderRadius: "50%",
              cursor: "nw-resize"
            }} />
            <div style={{
              position: "absolute",
              bottom: "-4px",
              right: "-4px",
              width: "8px",
              height: "8px",
              backgroundColor: "#007bff",
              border: "1px solid white",
              borderRadius: "50%",
              cursor: "se-resize"
            }} />
            <div style={{
              position: "absolute",
              top: "-4px",
              left: "-4px",
              width: "8px",
              height: "8px",
              backgroundColor: "#007bff",
              border: "1px solid white",
              borderRadius: "50%",
              cursor: "nw-resize"
            }} />
            <div style={{
              position: "absolute",
              bottom: "-4px",
              left: "-4px",
              width: "8px",
              height: "8px",
              backgroundColor: "#007bff",
              border: "1px solid white",
              borderRadius: "50%",
              cursor: "sw-resize"
            }} />
          </>
        )}
      </div>
    )
  }

  const getPageDimensions = () => {
    const { pageSize, orientation } = design.layout
    
    if (pageSize === "A4") {
      return orientation === "landscape" ? { width: 400, height: 283 } : { width: 283, height: 400 }
    } else if (pageSize === "HalfLetter") {
      return orientation === "landscape" ? { width: 300, height: 200 } : { width: 200, height: 300 }
    } else { // Letter
      return orientation === "landscape" ? { width: 400, height: 300 } : { width: 300, height: 400 }
    }
  }

  const pageDimensions = getPageDimensions()

  const selectedBlockData = selectedBlock ? design.blocks.find(b => b.id === selectedBlock) : null

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
        <h2 style={{ margin: 0, color: colors.text }}>Block-Based Print Designer</h2>
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
        {/* Left Panel - Block Library */}
        <div style={{
          width: 250,
          background: colors.panel,
          borderRight: `1px solid ${colors.border}`,
          padding: 16,
          overflowY: "auto"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: colors.text }}>Block Library</h3>
          <p style={{ fontSize: 12, color: colors.muted, marginBottom: 16 }}>
            Drag blocks to the canvas to add them
          </p>
          
          {Object.entries(blockTemplates).map(([type, template]) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleBlockDragStart(e, type as BlockType)}
              style={{
                padding: 12,
                marginBottom: 8,
                background: colors.background,
                border: `2px solid ${colors.border}`,
                borderRadius: 6,
                cursor: "grab",
                textAlign: "center",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.accent
                e.currentTarget.style.transform = "translateY(-2px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div style={{ 
                fontSize: 14, 
                fontWeight: "bold", 
                color: colors.text, 
                textTransform: "capitalize",
                marginBottom: 4
              }}>
                {type}
              </div>
              <div style={{ fontSize: 11, color: colors.muted }}>
                {template.width}% × {template.height}%
              </div>
            </div>
          ))}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: "0 0 12px 0", color: colors.text, fontSize: 14 }}>Layout Settings</h4>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, color: colors.text, fontSize: 12 }}>Page Size</label>
              <select 
                value={design.layout.pageSize}
                onChange={(e) => setDesign(prev => ({
                  ...prev,
                  layout: { ...prev.layout, pageSize: e.target.value as any }
                }))}
                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 4, border: `1px solid ${colors.border}` }}
              >
                <option value="Letter">Letter</option>
                <option value="A4">A4</option>
                <option value="HalfLetter">Half Letter</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, color: colors.text, fontSize: 12 }}>Orientation</label>
              <select 
                value={design.layout.orientation}
                onChange={(e) => setDesign(prev => ({
                  ...prev,
                  layout: { ...prev.layout, orientation: e.target.value as any }
                }))}
                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 4, border: `1px solid ${colors.border}` }}
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>
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
              cursor: draggedBlockType ? "crosshair" : "default"
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onClick={handleCanvasClick}
          >
            {/* Grid overlay for better alignment */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
              pointerEvents: "none",
              opacity: 0.3
            }} />
            
            {/* Render blocks */}
            {design.blocks.map(block => renderBlock(block, cocktails[0]))}
            
            {/* Drop zone indicator */}
            {draggedBlockType && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 123, 255, 0.1)",
                border: "2px dashed #007bff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#007bff",
                fontSize: 16,
                fontWeight: "bold"
              }}>
                Drop {draggedBlockType} block here
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Block Properties */}
        <div style={{
          width: 280,
          background: colors.panel,
          borderLeft: `1px solid ${colors.border}`,
          padding: 16,
          overflowY: "auto"
        }}>
          {selectedBlockData ? (
            <>
              <h3 style={{ margin: "0 0 16px 0", color: colors.text }}>Block Properties</h3>
              <div style={{ marginBottom: 16, padding: 12, background: colors.background, borderRadius: 6 }}>
                <div style={{ fontSize: 14, fontWeight: "bold", color: colors.text, textTransform: "capitalize" }}>
                  {selectedBlockData.type}
                </div>
                <div style={{ fontSize: 12, color: colors.muted }}>
                  ID: {selectedBlockData.id}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Visibility</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedBlockData.visible}
                    onChange={(e) => updateBlock(selectedBlockData.id, { visible: e.target.checked })}
                  />
                  <span style={{ fontSize: 12, color: colors.text }}>Show block</span>
                </label>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Font Size</label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={selectedBlockData.fontSize}
                  onChange={(e) => updateBlock(selectedBlockData.id, { fontSize: parseInt(e.target.value) })}
                  style={{ width: "100%" }}
                />
                <span style={{ fontSize: 12, color: colors.muted }}>{selectedBlockData.fontSize}px</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Font Weight</label>
                <select
                  value={selectedBlockData.fontWeight}
                  onChange={(e) => updateBlock(selectedBlockData.id, { fontWeight: e.target.value as any })}
                  style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 4, border: `1px solid ${colors.border}` }}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Text Color</label>
                <input
                  type="color"
                  value={selectedBlockData.color}
                  onChange={(e) => updateBlock(selectedBlockData.id, { color: e.target.value })}
                  style={{ width: "100%", height: 40 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Background Color</label>
                <input
                  type="color"
                  value={selectedBlockData.backgroundColor}
                  onChange={(e) => updateBlock(selectedBlockData.id, { backgroundColor: e.target.value })}
                  style={{ width: "100%", height: 40 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Text Alignment</label>
                <select
                  value={selectedBlockData.textAlign}
                  onChange={(e) => updateBlock(selectedBlockData.id, { textAlign: e.target.value as any })}
                  style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 4, border: `1px solid ${colors.border}` }}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Padding</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={selectedBlockData.padding}
                  onChange={(e) => updateBlock(selectedBlockData.id, { padding: parseInt(e.target.value) })}
                  style={{ width: "100%" }}
                />
                <span style={{ fontSize: 12, color: colors.muted }}>{selectedBlockData.padding}px</span>
              </div>

              <button
                onClick={() => removeBlock(selectedBlockData.id)}
                style={{
                  ...btnSecondary,
                  width: "100%",
                  background: "#dc3545",
                  color: "white",
                  border: "none"
                }}
              >
                🗑️ Delete Block
              </button>
            </>
          ) : (
            <>
              <h3 style={{ margin: "0 0 16px 0", color: colors.text }}>Page Properties</h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Background Color</label>
                <input
                  type="color"
                  value={design.backgroundColor}
                  onChange={(e) => setDesign(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  style={{ width: "100%", height: 40 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Border Color</label>
                <input
                  type="color"
                  value={design.borderColor}
                  onChange={(e) => setDesign(prev => ({ ...prev, borderColor: e.target.value }))}
                  style={{ width: "100%", height: 40 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, color: colors.text, fontSize: 12 }}>Border Width</label>
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

              <div style={{ marginTop: 20, padding: 12, background: colors.background, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: colors.muted, textAlign: "center" }}>
                  Click a block to edit its properties
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
