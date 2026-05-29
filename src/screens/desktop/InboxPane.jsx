import { useState, useCallback } from 'react'
import Icon from '../../components/Icon'
import ExpenseForm from '../../components/ExpenseForm'
import { CATS, formatIDR } from '../../data/expenses'
import useHotkeys from '../../hooks/useHotkeys'

const KBD = ({ children }) => (
  <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 5px', border: '1px solid var(--line-2)', borderRadius: 4, background: 'var(--surface)', color: 'var(--ink-2)' }}>
    {children}
  </kbd>
)

function ExpRow({ expense, selected, onClick }) {
  const cat = CATS[expense.cat] || CATS.food
  const isPending = expense.status === 'pending'
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--row-pad-y) 16px',
      cursor: 'pointer', userSelect: 'none',
      background: selected ? 'var(--surface-2)' : 'transparent',
      borderLeft: `2px solid ${selected ? 'var(--accent)' : 'transparent'}`,
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-2)' }}>
        <Icon name={cat.icon} size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {expense.merchant}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{expense.time} · {expense.method}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <span className="amt" style={{ fontSize: 13 }}>{formatIDR(expense.amount)}</span>
        {isPending && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
      </div>
    </div>
  )
}

function DeskField({ label, value, link, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13, gap: 12 }}>
      <span style={{ flex: '0 0 90px', color: 'var(--ink-3)', fontSize: 12 }}>{label}</span>
      <span
        onClick={onClick}
        style={{ flex: 1, color: link ? 'var(--accent)' : 'var(--ink)', fontWeight: 500, cursor: link ? 'pointer' : 'default' }}
      >
        {value}
      </span>
    </div>
  )
}

const GROUP_HDR = { padding: 'var(--pad-sm) 16px 4px', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }

export default function InboxPane({ expenses, onConfirm, onReject, onEdit }) {
  const pending   = expenses.filter(e => e.status === 'pending')

  const [selId, setSelId]     = useState(() => pending[0]?.id ?? null)
  const [editing, setEditing] = useState(false)

  const validSelId = pending.find(e => e.id === selId) ? selId : (pending[0]?.id ?? null)
  const sel = pending.find(e => e.id === validSelId) ?? null
  const cat = sel ? (CATS[sel.cat] || CATS.food) : null

  const advance = useCallback((id) => {
    const nextPending = pending.find(e => e.id !== id)
    setSelId(nextPending?.id ?? null)
    setEditing(false)
  }, [pending])

  const handleConfirm = useCallback(() => {
    if (!sel || sel.status !== 'pending') return
    onConfirm(sel.id)
    advance(sel.id)
  }, [sel, onConfirm, advance])

  const handleReject = useCallback(() => {
    if (!sel || sel.status !== 'pending') return
    onReject(sel.id)
    advance(sel.id)
  }, [sel, onReject, advance])

  useHotkeys({
    enabled: !editing && pending.length > 0,
    onConfirm: handleConfirm,
    onReject: handleReject,
    onEdit: () => sel && setEditing(true),
    onEsc: editing ? () => setEditing(false) : null,
  })

  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0)

  return (
    <>
      {/* center: inbox list (pending only) */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>Inbox</h2>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
            {pending.length > 0
              ? `${pending.length} pending · Rp ${new Intl.NumberFormat('id-ID').format(pendingTotal)}`
              : 'All caught up'}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {pending.length > 0 ? (
            <>
              <div style={GROUP_HDR}>Needs review</div>
              {pending.map(e => (
                <ExpRow key={e.id} expense={e} selected={validSelId === e.id} onClick={() => { setSelId(e.id); setEditing(false) }} />
              ))}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, padding: 32, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={20} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em' }}>All caught up</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 200, lineHeight: 1.5 }}>
                Nothing to review. New expenses will appear here when OpenClaw finds them.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* right: detail panel */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 22px', overflow: 'auto' }}>
        {sel && cat ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className={`pill dot ${sel.status === 'pending' ? 'accent' : 'success'}`}>
                {sel.status === 'pending' ? 'Pending' : 'Confirmed'}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setEditing(e => !e)}
                  style={{ background: 'transparent', border: 'none', color: editing ? 'var(--accent)' : 'var(--ink-3)', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <Icon name="edit" size={15} />
                </button>
                <button
                  onClick={() => { setSelId(null); setEditing(false) }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
                <Icon name={cat.icon} size={17} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.015em' }}>{sel.merchant}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sel.place}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>Rp</span>
              <span className="amt" style={{ fontSize: 36, lineHeight: 1, letterSpacing: '-0.035em' }}>
                {new Intl.NumberFormat('id-ID').format(sel.amount)}
              </span>
            </div>

            {editing ? (
              <ExpenseForm
                expense={sel}
                onSave={updated => { onEdit(updated); setEditing(false) }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <div style={{ borderTop: '1px solid var(--line)' }}>
                  <DeskField label="Category" value={cat.label} />
                  <DeskField label="Date"     value={sel.time} />
                  <DeskField label="Payment"  value={sel.method} />
                  <DeskField label="Location" value={sel.loc || '—'} />
                  {sel.source_ref && <DeskField label="Source" value={sel.source_ref} link />}
                </div>

                {sel.note && (
                  <div style={{ marginTop: 14, padding: 12, background: 'var(--surface)', borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Note</div>
                    <span style={{ color: 'var(--ink-2)' }}>{sel.note}</span>
                  </div>
                )}

                {sel.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 20 }}>
                    <button className="btn outline" style={{ height: 36, padding: '0 12px', fontSize: 13, gap: 6 }} onClick={handleReject}>
                      <Icon name="x" size={13} /> Reject
                    </button>
                    <button className="btn primary" style={{ flex: 1, height: 36, fontSize: 13, gap: 6 }} onClick={handleConfirm}>
                      <Icon name="check" size={13} /> Confirm
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <KBD>↵</KBD> confirm · <KBD>X</KBD> reject · <KBD>E</KBD> edit
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>
            {pending.length > 0 ? 'Select an expense to review' : 'Nothing pending'}
          </div>
        )}
      </div>
    </>
  )
}
