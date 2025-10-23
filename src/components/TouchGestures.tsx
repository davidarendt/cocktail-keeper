// src/components/TouchGestures.tsx
import React, { useRef, useEffect } from 'react'

interface TouchGesturesProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinch?: (scale: number) => void
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function TouchGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  children,
  className,
  style
}: TouchGesturesProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchMoveRef = useRef<{ x: number; y: number } | null>(null)
  const lastPinchDistanceRef = useRef<number | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
        }
        touchMoveRef.current = null
      } else if (e.touches.length === 2) {
        // Pinch gesture
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
        lastPinchDistanceRef.current = distance
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && touchStartRef.current) {
        const touch = e.touches[0]
        touchMoveRef.current = {
          x: touch.clientX,
          y: touch.clientY
        }
      } else if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
        // Pinch gesture
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
        const scale = distance / lastPinchDistanceRef.current
        if (onPinch && Math.abs(scale - 1) > 0.1) {
          onPinch(scale)
        }
        lastPinchDistanceRef.current = distance
      }
    }

    const handleTouchEnd = () => {
      if (touchStartRef.current && touchMoveRef.current) {
        const deltaX = touchMoveRef.current.x - touchStartRef.current.x
        const deltaY = touchMoveRef.current.y - touchStartRef.current.y
        const deltaTime = Date.now() - touchStartRef.current.time
        
        // Only trigger swipe if it's fast enough and far enough
        if (deltaTime < 300 && (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50)) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0 && onSwipeRight) {
              onSwipeRight()
            } else if (deltaX < 0 && onSwipeLeft) {
              onSwipeLeft()
            }
          } else {
            // Vertical swipe
            if (deltaY > 0 && onSwipeDown) {
              onSwipeDown()
            } else if (deltaY < 0 && onSwipeUp) {
              onSwipeUp()
            }
          }
        }
      }
      
      touchStartRef.current = null
      touchMoveRef.current = null
      lastPinchDistanceRef.current = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinch])

  return (
    <div
      ref={elementRef}
      className={className}
      style={style}
    >
      {children}
    </div>
  )
}
