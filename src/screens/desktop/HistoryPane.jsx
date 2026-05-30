import { useState } from 'react'
import Icon from '../../components/Icon'
import DeskField from '../../components/DeskField'
import ExpenseForm from '../../components/ExpenseForm'
import { CATS, formatIDR, formatIDRShort } from '../../data/expenses'
import { groupLabel } from '../../lib/date'
import useHotkeys from '../../hooks/useHotkeys'

function fmtMonth(ym) {
  const [y, m] = ym.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}


export default function HistoryPane({ expenses, onEdit, onDelete }) {
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
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
                        <Icon name={c.icon} size={13} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.merchant}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.place}&nbsp;·&nbsp;{e.method}
                        </span>
                      </div>
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
