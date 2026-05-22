import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { CATS, formatIDRShort } from '../data/expenses'
import { getStats, listExpenses } from '../api'
import { getWeekDates, getDayAbbr, getDayLabel, computeCats } from '../lib/date'

export default function Dashboard({ theme, onToggleTheme }) {
  const [stats, setStats]             = useState(null)
  const [weekExpenses, setWeekExpenses] = useState([])
  const [selectedDay, setSelectedDay]   = useState(null) // null = all 7, 0–6 = day index

  useEffect(() => {
    getStats().then(setStats).catch(console.error)
    listExpenses({ status: 'confirmed' }).then(rows => {
      const dates = getWeekDates()
      setWeekExpenses(rows.filter(e => dates.includes(e.date)))
    }).catch(console.error)
  }, [])

  const weekDates = getWeekDates()

  const total   = stats?.total  ?? 0
  const budget  = stats?.budget ?? 5000000
  const weekly  = stats?.weekly ?? [0,0,0,0,0,0,0]
  const pct     = budget > 0 ? Math.min((total / budget) * 100, 100) : 0

  const weekAmounts = weekDates.map(d =>
    weekExpenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0)
  )

  const filteredExp  = selectedDay !== null
    ? weekExpenses.filter(e => e.date === weekDates[selectedDay])
    : weekExpenses
  const displayCats  = computeCats(filteredExp)
  const displayTotal = filteredExp.reduce((s, e) => s + e.amount, 0)

  const toggleDay = (i) => setSelectedDay(prev => prev === i ? null : i)

  return (
    <>
      <div className="shdr" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginRight: -8 }}>
          <span className="eyebrow">This month</span>
          {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
        </div>
        <h1>Insights</h1>
      </div>

      <div className="screen-body" style={{ padding: '4px var(--pad) 16px' }}>
        {/* hero total */}
        <div style={{ padding: '14px 0 18px' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>Spent this month</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>Rp</span>
            <span className="amt" style={{ fontSize: 42, lineHeight: 1, letterSpacing: '-0.035em' }}>
              {new Intl.NumberFormat('id-ID').format(total)}
            </span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)' }}>
              <span>of {formatIDRShort(budget)} budget</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{Math.round(pct)}%</span>
            </div>
            <div className="bar" style={{ height: 6 }}>
              <div style={{ width: pct + '%', background: pct >= 90 ? 'var(--danger)' : 'var(--accent)', transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>

        {/* weekly bars — clickable */}
        <div
          style={{ padding: '14px var(--pad-sm)', background: 'var(--surface)', borderRadius: 'var(--card-radius)', marginBottom: 14, cursor: 'default' }}
          onClick={() => setSelectedDay(null)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last 7 days</span>
            {selectedDay !== null && (
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                {getDayLabel(weekDates[selectedDay])}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {weekly.map((d, i) => {
              const isSelected = selectedDay === i
              const isActive   = selectedDay === null || isSelected
              return (
                <div
                  key={i}
                  onClick={e => { e.stopPropagation(); toggleDay(i) }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                >
                  <div
                    title={formatIDRShort(weekAmounts[i])}
                    style={{
                      width: '100%',
                      height: Math.max(d, 2) + '%',
                      background: isSelected ? 'var(--accent)' : isActive ? 'var(--ink-4)' : 'var(--line)',
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

        {/* category breakdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0 10px' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
            {selectedDay !== null ? getDayLabel(weekDates[selectedDay]) : 'Last 7 days'} · by category
          </span>
          {displayTotal > 0 && (
            <span className="amt-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {formatIDRShort(displayTotal)}
            </span>
          )}
        </div>

        {displayCats.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayCats.map(c => {
              const cat = CATS[c.cat] || CATS.food
              return (
                <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="cat-dot"><Icon name={cat.icon} size={14} /></div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                      <span className="amt-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{formatIDRShort(c.amount)}</span>
                    </div>
                    <div className="bar" style={{ height: 3 }}>
                      <div style={{ width: c.pct + '%', background: 'var(--accent)', opacity: 0.7 }} />
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
    </>
  )
}
