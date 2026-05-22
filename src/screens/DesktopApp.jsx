import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'
import ExpenseForm from '../components/ExpenseForm'
import { CATS, formatIDR, formatIDRShort } from '../data/expenses'
import { getStats, getSettings, updateSettings, listExpenses } from '../api'
import { groupLabel, getWeekDates, getDayAbbr, getDayLabel, computeCats } from '../lib/date'
import useHotkeys from '../hooks/useHotkeys'
import { getPaymentMethods, savePaymentMethods } from '../lib/paymentMethods'
import { getCategories, saveCategories } from '../lib/categories'

// ── Shared sub-components ──────────────────────────────────────

const KBD = ({ children }) => (
  <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 5px', border: '1px solid var(--line-2)', borderRadius: 4, background: 'var(--surface)', color: 'var(--ink-2)' }}>
    {children}
  </kbd>
)

function SideItem({ icon, label, badge, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
      borderRadius: 8, fontSize: 13, fontWeight: active ? 500 : 400,
      color: active ? 'var(--ink)' : 'var(--ink-2)',
      background: active ? 'var(--surface)' : 'transparent',
      cursor: 'pointer', border: 'none', width: '100%',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      <Icon name={icon} size={15} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          padding: '2px 6px', borderRadius: 999,
          background: active ? 'var(--ink)' : 'var(--surface-2)',
          color: active ? 'var(--bg)' : 'var(--ink-2)',
        }}>{badge}</span>
      )}
    </button>
  )
}

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

// ── Inbox pane (3-column when active) ─────────────────────────

function InboxPane({ expenses, onConfirm, onReject, onEdit }) {
  const pending   = expenses.filter(e => e.status === 'pending')
  const confirmed = expenses.filter(e => e.status === 'confirmed')

  const [selId, setSelId]   = useState(() => pending[0]?.id ?? null)
  const [editing, setEditing] = useState(false)

  // keep selection valid: if current sel is no longer pending, move to next pending
  const validSelId = pending.find(e => e.id === selId) ? selId : (pending[0]?.id ?? null)
  const sel = pending.find(e => e.id === validSelId) ?? null
  const cat = sel ? (CATS[sel.cat] || CATS.food) : null

  // advance to next pending after action
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

  const GROUP_HDR = { padding: 'var(--pad-sm) 16px 4px', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }

  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0)

  return (
    <>
      {/* center: inbox list (pending only) */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>Inbox</h2>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
            {pending.length > 0
              ? `${pending.length} pending · ${formatIDR(pendingTotal)}`
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

// ── Shared month helpers ───────────────────────────────────────

function fmtMonth(ym) {
  const [y, m] = ym.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}

// ── History pane ───────────────────────────────────────────────

function HistoryPane({ expenses, onEdit, onDelete }) {
  const confirmed    = expenses.filter(e => e.status === 'confirmed')
  const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7)
  const allMonths    = [...new Set(confirmed.map(e => e.date.slice(0, 7)))].sort().reverse()
  const months       = allMonths.length > 0 ? allMonths : [currentMonth]

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [showPicker,    setShowPicker]    = useState(false)
  const [selId,         setSelId]         = useState(null)
  const [editing,       setEditing]       = useState(false)
  const [confirmDel,    setConfirmDel]    = useState(false)

  const filtered = confirmed.filter(e => e.date.startsWith(selectedMonth))
  const groups   = {}
  filtered.forEach(e => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e) })
  const total    = filtered.reduce((s, e) => s + e.amount, 0)

  const sel = filtered.find(e => e.id === selId) ?? null
  const cat = sel ? (CATS[sel.cat] || CATS.food) : null

  const select = (id) => { setSelId(id); setEditing(false); setConfirmDel(false) }

  const handleDelete = () => {
    if (!sel) return
    onDelete?.(sel.id)
    setSelId(null)
    setEditing(false)
    setConfirmDel(false)
  }

  useHotkeys({
    enabled: !editing && !!sel,
    onEdit: () => sel && setEditing(true),
    onEsc: editing ? () => setEditing(false) : sel ? () => { setSelId(null); setEditing(false); setConfirmDel(false) } : null,
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }} onClick={() => setShowPicker(false)}>

      {/* left: list */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>History</h2>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{filtered.length} confirmed · {formatIDRShort(total)}</div>
          </div>
          {/* month picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setShowPicker(v => !v) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                border: '1px solid var(--line-2)', borderRadius: 8, cursor: 'pointer',
                background: showPicker ? 'var(--surface-2)' : 'var(--surface)',
                fontSize: 13, color: 'var(--ink-2)', fontFamily: 'inherit',
              }}
            >
              <Icon name="filter" size={13} />
              {fmtMonth(selectedMonth)}
            </button>
            {showPicker && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowPicker(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 100, minWidth: 150,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}>
                  {months.map(ym => (
                    <button key={ym} onClick={e => { e.stopPropagation(); setSelectedMonth(ym); setShowPicker(false); setSelId(null) }} style={{
                      display: 'block', width: '100%', padding: '10px 14px',
                      background: ym === selectedMonth ? 'var(--surface-2)' : 'transparent',
                      border: 'none', textAlign: 'left', fontSize: 13,
                      color: ym === selectedMonth ? 'var(--ink)' : 'var(--ink-2)',
                      fontWeight: ym === selectedMonth ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      {fmtMonth(ym)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {Object.entries(groups).map(([date, list]) => {
            const dayTotal = list.reduce((s, e) => s + e.amount, 0)
            return (
              <div key={date}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--pad-sm) 16px 6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
                    {groupLabel(list[0].occurred_at)}
                  </span>
                  <span className="amt-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{formatIDRShort(dayTotal)}</span>
                </div>
                {list.map(e => {
                  const c = CATS[e.cat] || CATS.food
                  return (
                    <div
                      key={e.id}
                      onClick={() => select(e.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 'var(--row-pad-y) 16px', cursor: 'pointer', userSelect: 'none',
                        background: selId === e.id ? 'var(--surface-2)' : 'transparent',
                        borderLeft: `2px solid ${selId === e.id ? 'var(--accent)' : 'transparent'}`,
                      }}
                    >
                      {/* icon */}
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
                        <Icon name={c.icon} size={13} />
                      </div>
                      {/* text block */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.merchant}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.place}&nbsp;·&nbsp;{e.method}
                        </span>
                      </div>
                      {/* amount + time */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                        <span className="amt" style={{ fontSize: 14 }}>{formatIDR(e.amount)}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{e.time.split(' · ')[1]}</span>
                      </div>
                    </div>
                  )
                })}
                <div style={{ height: 1, background: 'var(--line)', margin: '0 16px' }} />
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
              No confirmed expenses for {fmtMonth(selectedMonth)}.
            </div>
          )}
        </div>
      </div>

      {/* right: detail / edit */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 22px', overflowY: 'auto' }}>
        {sel && cat ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="pill dot success">Confirmed</span>
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
                </div>
                {sel.note && (
                  <div style={{ marginTop: 14, padding: 12, background: 'var(--surface)', borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Note</div>
                    <span style={{ color: 'var(--ink-2)' }}>{sel.note}</span>
                  </div>
                )}
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    className="btn outline"
                    style={{ height: 36, fontSize: 13, gap: 6, width: '100%' }}
                    onClick={() => setEditing(true)}
                  >
                    <Icon name="edit" size={13} /> Edit details
                  </button>
                  {confirmDel ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn outline"
                        style={{ height: 36, fontSize: 13, flex: 1 }}
                        onClick={() => setConfirmDel(false)}
                      >
                        Cancel
                      </button>
                      <button
                        style={{ height: 36, fontSize: 13, flex: 1, border: 'none', borderRadius: 10, background: 'var(--danger)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                        onClick={handleDelete}
                      >
                        Confirm delete
                      </button>
                    </div>
                  ) : (
                    <button
                      style={{ height: 36, fontSize: 13, border: '1px solid var(--danger)', borderRadius: 10, background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={() => setConfirmDel(true)}
                    >
                      <Icon name="x" size={13} /> Delete expense
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>
            Click an expense to view or edit
          </div>
        )}
      </div>
    </div>
  )
}

// ── Insights pane ──────────────────────────────────────────────

function InsightsPane() {
  const [stats, setStats]           = useState(null)
  const [weekExpenses, setWeekExpenses] = useState([])
  const [selectedDay, setSelectedDay]   = useState(null) // null = all 7, 0-6 = day index

  useEffect(() => {
    getStats().then(setStats).catch(console.error)
    listExpenses({ status: 'confirmed' }).then(rows => {
      const weekDates = getWeekDates()
      setWeekExpenses(rows.filter(e => weekDates.includes(e.date)))
    }).catch(console.error)
  }, [])

  const weekDates = getWeekDates()

  const total     = stats?.total    ?? 0
  const budget    = stats?.budget   ?? 5000000
  const weekly    = stats?.weekly   ?? [0,0,0,0,0,0,0]
  const pct       = budget > 0 ? Math.min((total / budget) * 100, 100) : 0
  const remaining = Math.max(budget - total, 0)

  // Per-day actual amounts for tooltip / daily avg
  const weekAmounts = weekDates.map(d => weekExpenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0))
  const dailyAvg    = Math.round(weekAmounts.reduce((s, v) => s + v, 0) / 7)

  // Category breakdown — filtered to selected day or all 7 days
  const filteredExp  = selectedDay !== null
    ? weekExpenses.filter(e => e.date === weekDates[selectedDay])
    : weekExpenses
  const displayCats  = computeCats(filteredExp)
  const displayTotal = filteredExp.reduce((s, e) => s + e.amount, 0)

  const CARD    = { background: 'var(--surface)', borderRadius: 'var(--card-radius)', padding: 'var(--pad)' }
  const EYEBROW = { fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 8 }

  const toggleDay = (i) => setSelectedDay(prev => prev === i ? null : i)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 2 }}>This month</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>Insights</h2>
        </div>
        <span className="amt-mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 32px' }}>

        {/* ── top row: 3 stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* spend + budget */}
          <div style={CARD}>
            <div style={EYEBROW}>Spent</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>Rp</span>
              <span className="amt" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.04em' }}>
                {new Intl.NumberFormat('id-ID').format(total)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="bar" style={{ height: 5 }}>
                <div style={{ width: pct + '%', background: pct >= 90 ? 'var(--danger)' : 'var(--accent)', transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
                <span>of {formatIDRShort(budget)} budget</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: pct >= 90 ? 'var(--danger)' : 'var(--ink-2)', fontWeight: 500 }}>{Math.round(pct)}%</span>
              </div>
            </div>
          </div>

          {/* remaining + quick stats */}
          <div style={CARD}>
            <div style={EYEBROW}>Remaining</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>Rp</span>
              <span className="amt" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.04em', color: remaining === 0 ? 'var(--danger)' : 'var(--ink)' }}>
                {new Intl.NumberFormat('id-ID').format(remaining)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
                <span>Transactions</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', fontWeight: 500 }}>{stats ? (weekExpenses.length || '—') : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
                <span>Daily avg (7d)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', fontWeight: 500 }}>{formatIDRShort(dailyAvg)}</span>
              </div>
            </div>
          </div>

          {/* weekly bars — clickable */}
          <div
            style={{ ...CARD, cursor: 'default' }}
            onClick={() => setSelectedDay(null)}
          >
            <div style={{ ...EYEBROW, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span>Last 7 days</span>
              {selectedDay !== null && (
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                  {getDayLabel(weekDates[selectedDay])}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {weekly.map((d, i) => {
                const isSelected = selectedDay === i
                const isActive   = selectedDay === null || isSelected
                return (
                  <div
                    key={i}
                    onClick={e => { e.stopPropagation(); toggleDay(i) }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                  >
                    <div
                      title={formatIDRShort(weekAmounts[i])}
                      style={{
                        width: '100%',
                        height: Math.max(d, 2) + '%',
                        background: isSelected ? 'var(--accent)' : isActive ? 'var(--surface-2)' : 'var(--line)',
                        borderRadius: 4,
                        transition: 'height 0.3s, background 0.15s',
                        outline: isSelected ? '2px solid var(--accent)' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                    <span style={{ fontSize: 9, color: isSelected ? 'var(--accent)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: isSelected ? 700 : 400 }}>
                      {getDayAbbr(weekDates[i])}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── category breakdown ── */}
        <div style={CARD}>
          <div style={{ ...EYEBROW, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span>
              {selectedDay !== null ? `${getDayLabel(weekDates[selectedDay])}` : 'Last 7 days'} · by category
            </span>
            {displayTotal > 0 && (
              <span className="amt-mono" style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'none', letterSpacing: 0 }}>
                {formatIDRShort(displayTotal)}
              </span>
            )}
          </div>
          {displayCats.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 40px' }}>
              {displayCats.map(c => {
                const cat = CATS[c.cat] || CATS.food
                return (
                  <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <div className="cat-dot" style={{ flexShrink: 0 }}><Icon name={cat.icon} size={14} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{c.pct}%</span>
                          <span className="amt-mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{formatIDRShort(c.amount)}</span>
                        </div>
                      </div>
                      <div className="bar" style={{ height: 4 }}>
                        <div style={{ width: c.pct + '%', background: 'var(--accent)', borderRadius: 4, opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              {selectedDay !== null ? 'No spending on this day.' : 'No expenses in the last 7 days.'}
            </div>
          )}
        </div>

        {stats && weekExpenses.length === 0 && selectedDay === null && (
          <div style={{ padding: '24px 0 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No confirmed expenses this week.</div>
        )}
      </div>
    </div>
  )
}

// ── Sources pane (audit log) ───────────────────────────────────

function SourcesPane() {
  const [sources, setSources] = useState([])
  const [selIdx, setSelIdx]   = useState(0)

  useEffect(() => {
    // all expenses with a raw payload (OpenClaw submissions)
    listExpenses().then(all => {
      const withRaw = all.filter(e => e.source !== 'manual' || e.raw)
      setSources(withRaw)
    }).catch(console.error)
  }, [])

  const s = sources[selIdx]

  const statusColor = {
    pending: 'var(--accent)',
    confirmed: 'var(--success)',
    rejected: 'var(--danger)',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden' }}>
      {/* list */}
      <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>Sources</h2>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>Raw submissions from OpenClaw — audit log</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sources.map((e, i) => (
            <div key={e.id} onClick={() => setSelIdx(i)} style={{
              padding: 'var(--row-pad-y) 18px', cursor: 'pointer',
              background: selIdx === i ? 'var(--surface)' : 'transparent',
              borderLeft: `2px solid ${selIdx === i ? 'var(--ink)' : 'transparent'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{e.merchant}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{e.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.source_ref || e.source}
                </span>
                <span style={{ fontSize: 11, color: statusColor[e.status], flexShrink: 0, fontWeight: 500, textTransform: 'capitalize' }}>
                  {e.status}
                </span>
              </div>
            </div>
          ))}
          {sources.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No submissions yet. OpenClaw will POST here.</div>
          )}
        </div>
      </div>

      {/* email preview */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px', overflowY: 'auto' }}>
        {s ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 3 }}>From</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.source_ref || s.source}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>to me · {s.time}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', marginBottom: 14 }}>{s.merchant} · {s.place}</div>
            {s.raw ? (
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', flex: 1 }}>
                {s.raw}
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>
                No raw email data.
              </div>
            )}
            <div style={{ marginTop: 14, padding: 14, background: 'var(--accent-soft)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent-ink)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>
                <Icon name="sparkle" size={12} /> Extracted by OpenClaw
              </div>
              <div style={{ fontSize: 13, color: 'var(--accent-ink)', lineHeight: 1.5 }}>
                <b>{s.merchant}</b> · {CATS[s.cat]?.label ?? s.cat} · <b>Rp {new Intl.NumberFormat('id-ID').format(s.amount)}</b>
                {s.confidence != null && <span> · {Math.round(s.confidence * 100)}% confidence</span>}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-3)', fontSize: 13 }}>
            Select a source to preview
          </div>
        )}
      </div>
    </div>
  )
}

// ── Settings pane ──────────────────────────────────────────────

const SETTINGS_SECTIONS = [
  { id: 'appearance',  label: 'Appearance',       icon: 'sun'     },
  { id: 'budget',      label: 'Budget',           icon: 'chart'   },
  { id: 'categories',  label: 'Categories',       icon: 'list'    },
  { id: 'methods',     label: 'Payment methods',  icon: 'card'    },
  { id: 'accounts',    label: 'Accounts',         icon: 'receipt' },
  { id: 'openclaw',    label: 'OpenClaw',         icon: 'sparkle' },
]

const DESKTOP_ICON_OPTIONS = ['food','cart','coffee','car','tv','home','plane','receipt','card','note','sparkle','pin','clock','list','chart','search']

function makeKey(label) {
  const base = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  return base || 'cat_' + Date.now()
}

function DesktopIconPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {DESKTOP_ICON_OPTIONS.map(ic => (
        <button key={ic} type="button" onClick={() => onChange(ic)} style={{
          width: 34, height: 34, borderRadius: 8, border: 'none',
          background: value === ic ? 'var(--ink)' : 'var(--surface-2)',
          color: value === ic ? 'var(--bg)' : 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icon name={ic} size={14} />
        </button>
      ))}
    </div>
  )
}

function CategoriesDesktop() {
  const [cats, setCats]         = useState(getCategories)
  const [editKey, setEditKey]   = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editIcon, setEditIcon] = useState('receipt')
  const [adding, setAdding]     = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon]   = useState('receipt')

  const commit = (updated) => { setCats(updated); saveCategories(updated) }

  const startEdit = (c) => {
    setAdding(false)
    setEditKey(c.key); setEditLabel(c.label); setEditIcon(c.icon || CATS[c.key]?.icon || 'receipt')
  }

  const saveEdit = () => {
    if (!editLabel.trim()) return
    commit(cats.map(c => c.key === editKey ? { ...c, label: editLabel.trim(), icon: editIcon } : c))
    setEditKey(null)
  }

  const toggle = (key) => commit(cats.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c))

  const remove = (key) => { commit(cats.filter(c => c.key !== key)); if (editKey === key) setEditKey(null) }

  const addCat = () => {
    if (!newLabel.trim()) return
    let key = makeKey(newLabel)
    if (cats.some(c => c.key === key)) key = key + '_' + Date.now()
    commit([...cats, { key, label: newLabel.trim(), icon: newIcon, enabled: true }])
    setAdding(false); setNewLabel(''); setNewIcon('receipt')
  }

  const FIELD = { padding: '8px 12px', border: '1px solid var(--accent)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%' }

  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4, paddingTop: 24 }}>Categories</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>Add, edit, or hide categories. Disabled ones won't appear in the expense form.</div>
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
        {cats.map(c => {
          const iconName = c.icon || CATS[c.key]?.icon || 'receipt'
          const isEditing = editKey === c.key
          return (
            <div key={c.key} style={{ borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg)', userSelect: 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
                  <Icon name={iconName} size={13} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: c.enabled ? 'var(--ink)' : 'var(--ink-3)' }}>{c.label}</span>
                <button onClick={() => isEditing ? setEditKey(null) : startEdit(c)} style={{ background: 'transparent', border: 'none', color: isEditing ? 'var(--accent)' : 'var(--ink-3)', cursor: 'pointer', padding: 5, display: 'flex', borderRadius: 6 }}>
                  <Icon name="edit" size={14} />
                </button>
                <div onClick={() => toggle(c.key)} style={{ width: 38, height: 22, borderRadius: 11, background: c.enabled ? 'var(--ink)' : 'var(--surface-2)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}>
                  <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)', left: c.enabled ? 19 : 3, transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                </div>
                <button onClick={() => remove(c.key)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', padding: 5, display: 'flex', borderRadius: 6 }}>
                  <Icon name="x" size={14} />
                </button>
              </div>
              {isEditing && (
                <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface)' }}>
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEdit()} style={FIELD} autoFocus />
                  <DesktopIconPicker value={editIcon} onChange={setEditIcon} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditKey(null)} style={{ flex: 1, padding: '7px', border: '1px solid var(--line-2)', borderRadius: 8, background: 'transparent', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={saveEdit} style={{ flex: 2, padding: '7px', border: 'none', borderRadius: 8, background: 'var(--ink)', color: 'var(--bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {adding ? (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface)' }}>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} placeholder="Category name" style={FIELD} autoFocus />
            <DesktopIconPicker value={newIcon} onChange={setNewIcon} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setAdding(false); setNewLabel('') }} style={{ flex: 1, padding: '7px', border: '1px solid var(--line-2)', borderRadius: 8, background: 'transparent', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addCat} style={{ flex: 2, padding: '7px', border: 'none', borderRadius: 8, background: 'var(--ink)', color: 'var(--bg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setAdding(true); setEditKey(null) }} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
            <Icon name="plus" size={14} />
            Add category
          </button>
        )}
      </div>
    </>
  )
}

function PaymentMethodsDesktop() {
  const [methods, setMethods] = useState(getPaymentMethods)
  const [newVal, setNewVal]   = useState('')

  const save = (updated) => { setMethods(updated); savePaymentMethods(updated) }
  const remove = (m) => save(methods.filter(x => x !== m))
  const add = () => {
    const v = newVal.trim()
    if (!v || methods.includes(v)) return
    save([...methods, v]); setNewVal('')
  }

  const INPUT_STYLE = { padding: '8px 12px', border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }

  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4, paddingTop: 24 }}>Payment methods</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>Methods available when editing an expense. Changes apply immediately.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
        {methods.map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{m}</span>
            <button onClick={() => remove(m)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6 }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'var(--surface)' }}>
          <input
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="e.g. BCA •• 1234"
            style={{ ...INPUT_STYLE, flex: 1 }}
          />
          <button onClick={add} style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add
          </button>
        </div>
      </div>
    </>
  )
}

function SettingsPane({ theme, onToggleTheme, density, onToggleDensity }) {
  const [section, setSection]     = useState('appearance')
  const [budget, setBudget]       = useState('')
  const [editBudget, setEditBudget] = useState(false)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    getSettings().then(s => setBudget(s.budget || '5000000')).catch(console.error)
  }, [])

  const saveBudget = async () => {
    setSaving(true)
    try {
      const s = await updateSettings({ budget: Number(budget) })
      setBudget(s.budget); setEditBudget(false)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  function Row({ label, sub, children }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--line)', gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{sub}</div>}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>
    )
  }

  function SectionTitle({ children }) {
    return <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4, paddingTop: 24 }}>{children}</div>
  }
  function SectionSub({ children }) {
    return <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>{children}</div>
  }

  const BTN_OUTLINE = { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--line-2)', background: 'transparent', color: 'var(--ink)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }

  const content = {
    appearance: (
      <>
        <SectionTitle>Appearance</SectionTitle>
        <SectionSub>Customize how Ledger looks on this device.</SectionSub>
        <Row label="Theme" sub={theme === 'dark' ? 'Currently using dark mode' : 'Currently using light mode'}>
          <button onClick={onToggleTheme} style={BTN_OUTLINE}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
            {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          </button>
        </Row>
        <Row label="Density" sub={density === 'compact' ? 'Compact — tighter spacing, more content' : 'Cozy — comfortable default spacing'}>
          <button onClick={onToggleDensity} style={BTN_OUTLINE}>
            {density === 'compact' ? 'Switch to cozy' : 'Switch to compact'}
          </button>
        </Row>
      </>
    ),

    budget: (
      <>
        <SectionTitle>Budget</SectionTitle>
        <SectionSub>Set your monthly spending limit. Used in Insights to show how much is left.</SectionSub>
        <Row label="Monthly budget" sub="In IDR (Indonesian Rupiah)">
          {editBudget ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
                style={{ width: 150, padding: '8px 12px', border: '1px solid var(--accent)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={saveBudget} disabled={saving}
                style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditBudget(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', padding: '8px 4px', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditBudget(true)} style={{ ...BTN_OUTLINE, fontFamily: 'inherit' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>Rp {new Intl.NumberFormat('id-ID').format(Number(budget))}</span>
              <Icon name="edit" size={13} />
            </button>
          )}
        </Row>
        <div style={{ marginTop: 20, padding: 16, background: 'var(--surface)', borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>Budget preview</div>
          <div className="bar" style={{ height: 8, borderRadius: 6 }}>
            <div style={{ width: '57%', background: 'var(--accent)', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            <span>57% used</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatIDRShort(Number(budget))}</span>
          </div>
        </div>
      </>
    ),

    categories: <CategoriesDesktop />,

    methods: <PaymentMethodsDesktop />,

    accounts: (
      <>
        <SectionTitle>Connected accounts</SectionTitle>
        <SectionSub>Ledger reads transactions from these sources via OpenClaw.</SectionSub>
        {[
          { label: 'Gmail',   sub: 'faridevan97@gmail.com',  ok: true  },
          { label: 'BCA',     sub: 'Debit ••4827',           ok: true  },
          { label: 'OVO',     sub: 'Linked wallet',          ok: true  },
          { label: 'Gopay',   sub: 'Linked wallet',          ok: true  },
          { label: 'ShopeePay', sub: 'Linked wallet',        ok: false },
        ].map(a => (
          <Row key={a.label} label={a.label} sub={a.sub}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: a.ok ? 'var(--success)' : 'var(--ink-3)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.ok ? 'var(--success)' : 'var(--ink-4)' }} />
              {a.ok ? 'Connected' : 'Not linked'}
            </span>
          </Row>
        ))}
      </>
    ),

    openclaw: (
      <>
        <SectionTitle>OpenClaw agent</SectionTitle>
        <SectionSub>Your AI agent that reads emails and queues expenses for review.</SectionSub>
        <Row label="Email scanning" sub="Checks for new receipts every 15 min">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--success)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} /> Active
          </span>
        </Row>
        <Row label="Auto-categorize" sub="AI guesses category from merchant name">
          <span style={{ fontSize: 13, color: 'var(--success)' }}>On</span>
        </Row>
        <Row label="Review required" sub="Every submission waits for your confirm or reject">
          <span style={{ fontSize: 13, color: 'var(--success)' }}>Always</span>
        </Row>
        <div style={{ marginTop: 24, padding: 18, background: 'var(--surface)', borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 12 }}>API endpoint</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Method', value: 'POST /api/expenses' },
              { label: 'Auth',   value: 'Authorization: Bearer <token>' },
              { label: 'Host',   value: 'http://localhost:3001' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ width: 56, color: 'var(--ink-3)', flexShrink: 0 }}>{f.label}</span>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 5 }}>{f.value}</code>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16, padding: 18, background: 'var(--accent-soft)', borderRadius: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--accent-ink)', lineHeight: 1.6 }}>
            Required fields: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>merchant</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>amount</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>cat</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>occurred_at</code>. Optional: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>place</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>source_ref</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>raw</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>confidence</code>.
          </div>
        </div>
      </>
    ),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em' }}>Settings</h2>
      </div>
      {/* body: secondary nav + content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '180px 1fr', overflow: 'hidden' }}>
        {/* secondary nav */}
        <div style={{ borderRight: '1px solid var(--line)', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {SETTINGS_SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
              fontSize: 13, fontWeight: section === s.id ? 500 : 400,
              color: section === s.id ? 'var(--ink)' : 'var(--ink-2)',
              background: section === s.id ? 'var(--surface-2)' : 'transparent',
              cursor: 'pointer', border: 'none', fontFamily: 'inherit', textAlign: 'left', width: '100%',
            }}>
              <Icon name={s.icon} size={14} />
              {s.label}
            </button>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.5 }}>
            Ledger v1.0.0<br />Personal use only
          </div>
        </div>
        {/* content */}
        <div style={{ overflowY: 'auto', padding: '0 40px 40px' }}>
          {content[section]}
        </div>
      </div>
    </div>
  )
}

// ── Root desktop layout ────────────────────────────────────────

export default function DesktopApp({ expenses, onConfirm, onReject, onEdit, onDelete, theme, onToggleTheme, density, onToggleDensity }) {
  const pending = expenses.filter(e => e.status === 'pending')
  const [activeNav, setActiveNav] = useState('inbox')

  const isInbox = activeNav === 'inbox'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isInbox ? '200px 1fr 340px' : '200px 1fr',
      gridTemplateRows: '100%',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      color: 'var(--ink)',
      background: 'var(--bg)',
      letterSpacing: '-0.011em',
      fontSize: 14,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* sidebar */}
      <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', padding: '18px 12px', gap: 3, overflow: 'hidden', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 18px' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>L</div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.015em' }}>Ledger</span>
        </div>

        <SideItem icon="inbox"    label="Inbox"    badge={pending.length || null} active={activeNav === 'inbox'}    onClick={() => setActiveNav('inbox')} />
        <SideItem icon="list"     label="History"                                 active={activeNav === 'history'}  onClick={() => setActiveNav('history')} />
        <SideItem icon="chart"    label="Insights"                                active={activeNav === 'insights'} onClick={() => setActiveNav('insights')} />
        <SideItem icon="mail"     label="Sources"                                 active={activeNav === 'sources'}  onClick={() => setActiveNav('sources')} />
        <SideItem icon="settings" label="Settings"                                active={activeNav === 'settings'} onClick={() => setActiveNav('settings')} />

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 8px 0' }}>
          <button onClick={onToggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--ink-2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>OpenClaw</div>
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
              Agent active
            </div>
          </div>
        </div>
      </div>

      {/* main content — switches by nav */}
      {activeNav === 'inbox' && (
        <InboxPane expenses={expenses} onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} />
      )}
      {activeNav === 'history' && <HistoryPane expenses={expenses} onEdit={onEdit} onDelete={onDelete} />}
      {activeNav === 'insights' && <InsightsPane />}
      {activeNav === 'sources' && <SourcesPane />}
      {activeNav === 'settings' && (
        <SettingsPane theme={theme} onToggleTheme={onToggleTheme} density={density} onToggleDensity={onToggleDensity} />
      )}
    </div>
  )
}
