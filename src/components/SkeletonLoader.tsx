// src/components/SkeletonLoader.tsx
import { colors, card } from "../styles"

interface SkeletonLoaderProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  style?: React.CSSProperties
}

export function SkeletonLoader({ 
  width = "100%", 
  height = 20, 
  borderRadius = 4,
  className,
  style
}: SkeletonLoaderProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${colors.panel} 25%, ${colors.border} 50%, ${colors.panel} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        ...style,
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

// Skeleton for cocktail cards
export function CocktailCardSkeleton() {
  return (
    <div style={{
      ...card(),
      background: colors.glass,
      border: `1px solid ${colors.glassBorder}`,
      padding: 20,
      marginBottom: 16
    }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <SkeletonLoader width={40} height={40} borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <SkeletonLoader width="80%" height={20} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="60%" height={16} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <SkeletonLoader width="100%" height={14} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="90%" height={14} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="70%" height={14} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <SkeletonLoader width={60} height={24} borderRadius={12} />
        <SkeletonLoader width={80} height={24} borderRadius={12} />
      </div>
    </div>
  )
}

// Skeleton for ingredient list
export function IngredientListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SkeletonLoader width={20} height={20} borderRadius="50%" />
          <SkeletonLoader width="60%" height={16} />
          <SkeletonLoader width={40} height={16} />
        </div>
      ))}
    </div>
  )
}
