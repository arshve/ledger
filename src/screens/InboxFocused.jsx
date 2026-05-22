import { useState } from 'react'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { CATS, formatIDR } from '../data/expenses'

function MiniRow({ icon, label, value, onClick, chev }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 2px', borderTop: '1px solid var(--line)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Icon name={icon} size={14} />
      <span style={{ fontSize: 13, color: 'var(--ink-3)', flex: '0 0 auto' }}>{label}</span>
      <span style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{value}</span>
      {chev && <Icon name="chevR" size={14} />}
    </div>
  )
}

export default function InboxFocused({ pending, idx, onConfirm, onReject, onViewSource, onViewDetail, onViewEdit, theme, onToggleTheme }) {
  const expense = pending[idx]
  const cat = expense ? CATS[expense.cat] : null

  if (!expense) return null

  return (
    <>
      {/* topbar with progress */}
      <div style={{ padding: '8px var(--pad) 0', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginRight: -8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
            Review
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>
              {idx + 1} / {pending.length}
            </span>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} style={{ padding: 6 }} />
          </div>
        </div>
        {/* progress segments */}
        <div style={{ display: 'flex', gap: 3 }}>
          {pending.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 2, borderRadius: 1,
                background: i < idx ? 'var(--ink-3)' : i === idx ? 'var(--accent)' : 'var(--line-2)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="screen-body"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px var(--pad) 12px' }}
      >
        {/* hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: '8px 0 0' }}>
          {/* category + when */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={cat.icon} size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{expense.time}</span>
            </div>
          </div>

          {/* amount */}
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>You spent</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 16, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>Rp</span>
              <span className="amt" style={{ fontSize: 64, lineHeight: 0.95, letterSpacing: '-0.045em' }}>
                {new Intl.NumberFormat('id-ID').format(expense.amount)}
              </span>
            </div>
            <div style={{ marginTop: 14, fontSize: 18, fontWeight: 500, letterSpacing: '-0.015em' }}>
              at {expense.merchant}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{expense.place}</div>
          </div>

          {/* compact details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
            <MiniRow icon="card" label="Paid with" value={expense.method} />
            <MiniRow icon="pin" label="Where" value={expense.loc || '—'} />
            <MiniRow icon="mail" label="Source" value="BCA email" onClick={onViewSource} chev />
          </div>
        </div>

        {/* actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn reject"
              onClick={onReject}
              style={{ flex: 1, height: 56, borderRadius: 14, gap: 6 }}
            >
              <Icon name="x" size={18} />
              <span>Not me</span>
            </button>
            <button
              className="btn confirm"
              onClick={onConfirm}
              style={{ flex: 2, height: 56, borderRadius: 14 }}
            >
              <Icon name="check" size={18} />
              <span>Confirm</span>
            </button>
          </div>
          <button className="btn ghost" onClick={onViewEdit || onViewDetail} style={{ height: 36, fontSize: 13 }}>
            <Icon name="edit" size={14} />
            Edit details first
          </button>
        </div>
      </div>
    </>
  )
}

export function InboxDone({ onViewHistory, onViewInsights, onRefresh }) {
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = async () => {
    if (spinning) return
    setSpinning(true)
    try { await onRefresh?.() } finally { setSpinning(false) }
  }

  return (
    <div
      className="screen-body"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--pad)', textAlign: 'center', gap: 12 }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={24} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
        All caught up
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 240, lineHeight: 1.45, margin: 0 }}>
        Nothing pending right now. New expenses will appear here when OpenClaw finds them.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button className="btn outline" style={{ height: 36, fontSize: 13 }} onClick={onViewHistory}>View history</button>
        <button className="btn primary" style={{ height: 36, fontSize: 13 }} onClick={onViewInsights}>Open insights</button>
      </div>
      <button
        onClick={handleRefresh}
        style={{
          marginTop: 4, background: 'transparent', border: 'none', color: 'var(--ink-3)',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit', padding: '6px 10px', borderRadius: 8,
        }}
      >
        <span style={{ display: 'inline-block', animation: spinning ? 'spin 0.7s linear infinite' : 'none' }}>
          <Icon name="arrUp" size={14} />
        </span>
        {spinning ? 'Checking…' : 'Check for new'}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
