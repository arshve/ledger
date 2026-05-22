import { useEffect } from 'react'

function inEditTarget(e) {
  const tag = e.target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable
}

export default function useHotkeys({ onConfirm, onReject, onEdit, onEsc, enabled = true }) {
  useEffect(() => {
    const handler = e => {
      // Esc always fires regardless of enabled/focus — it's a cancel action
      if (e.key === 'Escape') { onEsc?.(); return }
      if (!enabled || inEditTarget(e)) return
      if (e.key === 'Enter')                   { e.preventDefault(); onConfirm?.() }
      else if (e.key === 'x' || e.key === 'X') { e.preventDefault(); onReject?.()  }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); onEdit?.()    }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onConfirm, onReject, onEdit, onEsc])
}
