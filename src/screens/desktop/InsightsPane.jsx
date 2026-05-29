import { useState, useEffect } from 'react'
import Icon from '../../components/Icon'
import { CATS, formatIDRShort } from '../../data/expenses'
import { getStats, listExpenses } from '../../api'
import { getWeekDates, getDayAbbr, getDayLabel, computeCats } from '../../lib/date'

export default function InsightsPane() {
  const [stats, setStats]               = useState(null)
  const [weekExpenses, setWeekExpenses] = useState([])
  const [selectedDay, setSelectedDay]   = useState(null)

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

  const weekAmounts = weekDates.map(d => weekExpenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0))
  const dailyAvg    = Math.round(weekAmounts.reduce((s, v) => s + v, 0) / 7)

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

        {/* top row: 3 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

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

          <div style={{ ...CARD, cursor: 'default' }} onClick={() => setSelectedDay(null)}>
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

        {/* category breakdown */}
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
