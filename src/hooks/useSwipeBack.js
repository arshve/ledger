import { useRef, useCallback } from 'react'

/* iOS-style swipe-right to go back. Call onSwipeBack when threshold met. */
export default function useSwipeBack({ onSwipeBack, enabled = true, threshold = 80 }) {
  const touchRef = useRef(null)

  const onTouchStart = useCallback(e => {
    if (!enabled) return
    const t = e.touches[0]
    touchRef.current = { startX: t.clientX, startY: t.clientY }
  }, [enabled])

  const onTouchEnd = useCallback(e => {
    if (!enabled || !touchRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.startX
    const dy = t.clientY - touchRef.current.startY
    // Only swipe-right, more horizontal than vertical, starting from left edge
    if (dx > threshold && Math.abs(dx) > Math.abs(dy) && touchRef.current.startX < 40) {
      onSwipeBack?.()
    }
    touchRef.current = null
  }, [enabled, threshold, onSwipeBack])

  return { onTouchStart, onTouchEnd }
}
