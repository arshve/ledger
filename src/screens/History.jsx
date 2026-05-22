import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { CATS, formatIDR, formatIDRShort } from '../data/expenses'
import { groupLabel } from '../lib/date'

function fmtMonth(ym) {
  const [y, m] = ym.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}

// ── Swipe-to-delete row ────────────────────────────────────────

function SwipeRow({ id, openId, onOpen, onDelete, onClick, children }) {
  const containerRef = useRef(null)
  const rowRef       = useRef(null)
  const offsetRef    = useRef(0)
  const gestureRef   = useRef(null)
  const onOpenRef    = useRef(onOpen)
  const [confirming, setConfirming] = useState(false)
  const SNAP = 80

  useEffect(() => { onOpenRef.current = onOpen }, [onOpen])

  // Close when another row opens
  useEffect(() => {
    if (openId !== id && rowRef.current && offsetRef.current !== 0) {
      rowRef.current.style.transition = 'transform 0.2s ease'
      rowRef.current.style.transform  = 'translateX(0)'
      offsetRef.current = 0
      setConfirming(false)
    }
  }, [openId, id])

  useEffect(() => {
    const container = containerRef.current
    const row       = rowRef.current
    if (!container || !row) return

    const onStart = e => {
      gestureRef.current = {
        startX:      e.touches[0].clientX,
        startY:      e.touches[0].clientY,
        startOffset: offsetRef.current,
        tracking:    null,
      }
    }

    const onMove = e => {
      const g = gestureRef.current
      if (!g) return
      const dx = e.touches[0].clientX - g.startX
      const dy = e.touches[0].clientY - g.startY
      if (g.tracking === null) g.tracking = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (g.tracking === 'x') {
        e.preventDefault()
        const next = Math.min(0, Math.max(g.startOffset + dx, -SNAP))
        offsetRef.current = next
        row.style.transition = 'none'
        row.style.transform  = `translateX(${next}px)`
      }
    }

    const onEnd = () => {
      const g = gestureRef.current
      if (!g) return
      gestureRef.current = null
      if (g.tracking !== 'x') return
      if (offsetRef.current < -SNAP / 2) {
        row.style.transition = 'transform 0.2s ease'
        row.style.transform  = `translateX(${-SNAP}px)`
        offsetRef.current    = -SNAP
        onOpenRef.current(id)
      } else {
        row.style.transition = 'transform 0.2s ease'
        row.style.transform  = 'translateX(0)'
        offsetRef.current    = 0
        setConfirming(false)
      }
    }

    container.addEventListener('touchstart', onStart, { passive: true })
    container.addEventListener('touchmove',  onMove,  { passive: false })
    container.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      container.removeEventListener('touchstart', onStart)
      container.removeEventListener('touchmove',  onMove)
      container.removeEventListener('touchend',   onEnd)
    }
  }, [id])

  const handleDeleteTap = e => {
    e.stopPropagation()
    if (confirming) { onDelete() } else { setConfirming(true) }
  }

  const handleRowClick = () => {
    if (openId === id) {
      rowRef.current.style.transition = 'transform 0.2s ease'
      rowRef.current.style.transform  = 'translateX(0)'
      offsetRef.current = 0
      setConfirming(false)
      onOpenRef.current(null)
    } else {
      onClick?.()
    }
  }

  // Inner strip is (100% + SNAP) wide; row takes 100%, delete takes SNAP.
  // overflow:hidden on the outer clips the delete until the strip translates left.
  return (
    <div ref={containerRef} style={{ overflow: 'hidden' }}>
      <div
        ref={rowRef}
        style={{ display: 'flex', width: `calc(100% + ${SNAP}px)` }}
      >
        {/* row content — always 100% of visible container */}
        <div
          style={{ flex: `0 0 calc(100% - ${SNAP}px)`, background: 'var(--bg)' }}
          onClick={handleRowClick}
        >
          {children}
        </div>
        {/* delete action — revealed by sliding left */}
        <div style={{
          flex: `0 0 ${SNAP}px`,
          background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button onClick={handleDeleteTap} style={{
            background: 'transparent', border: 'none', color: '#fff',
            fontSize: confirming ? 11 : 13, fontWeight: 700, cursor: 'pointer',
            padding: 0, height: '100%', width: '100%', fontFamily: 'inherit',
          }}>
            {confirming ? 'Sure?' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function History({ confirmed, theme, onToggleTheme, onSelect, onDelete }) {
  const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7)
  const allMonths    = [...new Set(confirmed.map(e => e.date.slice(0, 7)))].sort().reverse()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [showPicker,    setShowPicker]    = useState(false)
  const [openSwipeId,   setOpenSwipeId]   = useState(null)

  const filtered   = confirmed.filter(e => e.date.startsWith(selectedMonth))
  const total      = filtered.reduce((s, e) => s + e.amount, 0)

  const groups = {}
  filtered.forEach(e => {
    if (!groups[e.date]) groups[e.date] = []
    groups[e.date].push(e)
  })

  const months = allMonths.length > 0 ? allMonths : [currentMonth]

  return (
    <>
      <div className="shdr" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1>History</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: -8 }}>
            {/* month picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPicker(v => !v)}
                style={{
                  background: showPicker ? 'var(--surface-2)' : 'transparent',
                  border: 'none', color: 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 13, padding: '6px 8px', cursor: 'pointer',
                  fontFamily: 'inherit', borderRadius: 8,
                }}
              >
                <Icon name="filter" size={14} />
                {fmtMonth(selectedMonth)}
              </button>
              {showPicker && (
                <>
                  {/* backdrop */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setShowPicker(false)}
                  />
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 12, overflow: 'hidden', zIndex: 100, minWidth: 150,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}>
                    {months.map(ym => (
                      <button
                        key={ym}
                        onClick={() => { setSelectedMonth(ym); setShowPicker(false) }}
                        style={{
                          display: 'block', width: '100%', padding: '12px 16px',
                          background: ym === selectedMonth ? 'var(--surface-2)' : 'transparent',
                          border: 'none', textAlign: 'left', fontSize: 14,
                          color: ym === selectedMonth ? 'var(--ink)' : 'var(--ink-2)',
                          fontWeight: ym === selectedMonth ? 600 : 400,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {fmtMonth(ym)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
          </div>
        </div>
        <div className="sub">{filtered.length} confirmed · {formatIDRShort(total)}</div>
      </div>

      <div className="screen-body" onClick={() => { setShowPicker(false); setOpenSwipeId(null) }}>
        {Object.entries(groups).map(([date, list]) => {
          const dayTotal = list.reduce((s, e) => s + e.amount, 0)
          return (
            <div key={date}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px var(--pad) 6px', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
                  {groupLabel(list[0].occurred_at)}
                </span>
                <span className="amt-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatIDRShort(dayTotal)}</span>
              </div>
              {list.map(e => {
                const cat = CATS[e.cat] || CATS.food
                return (
                  <SwipeRow
                    key={e.id}
                    id={e.id}
                    openId={openSwipeId}
                    onOpen={setOpenSwipeId}
                    onDelete={() => { onDelete?.(e.id); setOpenSwipeId(null) }}
                    onClick={() => onSelect?.(e)}
                  >
                    <div className="row">
                      <div className="cat-dot"><Icon name={cat.icon} size={14} /></div>
                      <div className="body">
                        <span className="merchant">{e.merchant}</span>
                        <span className="meta">
                          <span>{e.place}</span>
                          <span className="sep" />
                          <span>{e.method}</span>
                        </span>
                      </div>
                      <div className="right">
                        <span className="amt" style={{ fontSize: 15 }}>{formatIDR(e.amount)}</span>
                      </div>
                    </div>
                  </SwipeRow>
                )
              })}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '60px var(--pad)', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            No confirmed expenses for {fmtMonth(selectedMonth)}.
          </div>
        )}
      </div>
    </>
  )
}
