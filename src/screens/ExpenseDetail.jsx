import { useState } from 'react'
import Icon from '../components/Icon'
import ExpenseForm from '../components/ExpenseForm'
import { CATS, formatIDR } from '../data/expenses'
import useHotkeys from '../hooks/useHotkeys'

function DetailRow({ label, value, icon, onClick, chevron }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 14px', background: 'var(--bg)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
        <Icon name={icon} size={14} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{value}</span>
      </div>
      {chevron && <Icon name="chevR" size={16} />}
    </div>
  )
}

export default function ExpenseDetail({ expense, onBack, onConfirm, onReject, onViewSource, onEdit, initialEditing = false }) {
  const [editing, setEditing] = useState(initialEditing)

  useHotkeys({
    enabled: !editing,
    onConfirm,
    onReject,
    onEdit: () => setEditing(true),
    onEsc: editing ? () => setEditing(false) : null,
  })

  if (!expense) return null
  const cat = CATS[expense.cat] || CATS.food

  const handleSave = (updated) => {
    onEdit(updated)
    setEditing(false)
  }

  return (
    <>
      {/* topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-2)', fontSize: 14, padding: '6px 6px 6px 4px', cursor: 'pointer' }}
        >
          <Icon name="chevL" size={18} />
          Inbox
        </button>
        <button
          onClick={() => setEditing(e => !e)}
          style={{ background: 'transparent', border: 'none', color: editing ? 'var(--accent)' : 'var(--ink-2)', padding: 6, cursor: 'pointer', display: 'flex' }}
        >
          <Icon name="edit" size={18} />
        </button>
      </div>

      <div className="screen-body" style={{ padding: '0 var(--pad) 16px' }}>
        {/* hero amount */}
        <div style={{ padding: '24px 4px 28px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <span className={`pill dot ${expense.status === 'pending' ? 'accent' : 'success'}`}>
            {expense.status === 'pending' ? 'Pending review' : 'Confirmed'}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>Rp</span>
            <span className="amt" style={{ fontSize: 52, lineHeight: 1, letterSpacing: '-0.04em' }}>
              {new Intl.NumberFormat('id-ID').format(expense.amount)}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.015em' }}>{expense.merchant}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{expense.place}</div>
        </div>

        {editing ? (
          <ExpenseForm
            expense={expense}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {/* fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              <DetailRow label="Category" value={cat.label} icon={cat.icon} />
              <DetailRow label="Payment" value={expense.method} icon="card" />
              <DetailRow label="When" value={expense.time} icon="clock" />
              {expense.loc && expense.loc !== '—' && (
                <DetailRow label="Location" value={expense.loc} icon="pin" />
              )}
              <DetailRow label="Source" value="Receipt email · BCA" icon="mail" onClick={onViewSource} chevron />
            </div>

            {/* note */}
            <div style={{ marginTop: 16, padding: 'var(--pad)', background: 'var(--surface)', borderRadius: 'var(--card-radius)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
                <Icon name="note" size={12} />
                Note
              </div>
              <div style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                {expense.note || 'Add a note…'}
              </div>
            </div>

            {/* actions (pending only) */}
            {expense.status === 'pending' && (
              <>
                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button className="btn reject" onClick={onReject} aria-label="Reject" style={{ height: 44, padding: '0 16px' }}>
                    <Icon name="x" size={18} />
                  </button>
                  <button className="btn confirm" onClick={onConfirm}>
                    <Icon name="check" size={18} />
                    Confirm expense
                  </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>
                  Press E to edit · ↵ confirm · X reject
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
