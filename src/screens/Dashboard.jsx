import { useState, useEffect, useMemo } from 'react'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { CATS, formatIDRShort } from '../data/expenses'
import { getStats, listExpenses } from '../api'
import { getWeekDates, getDayAbbr, getDayLabel, computeCats } from '../lib/date'

function Skel({ w = '100%', h = 16, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4,
      background: 'var(--surface-2)', marginBottom: mb,
      animation: 'pulse 1.2s ease-in-out infinite',
    }} />
  )
}

export default function Dashboard({ theme, onToggleTheme }) {
  const [stats, setStats]               = useState(null)
  const [weekExpenses, setWeekExpenses]  = useState([])
  const [selectedDay, setSelectedDay]   = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    Promise.all([
      getStats().catch(() => null),
      listExpenses({ status: 'confirmed' }).catch(() => []),
    ]).then(([s, rows]) => {
      setStats(s)
      const dates = getWeekDates()
      setWeekExpenses(rows.filter(e => dates.includes(e.date)))
      setLoading(false)
    })
  }, [])

  const weekDates = useMemo(() => getWeekDates(), [])

  const total  = stats?.total  ?? 0
  const budget = stats?.budget ?? 5000000
  const weekly = stats?.weekly ?? [0,0,0,0,0,0,0]
  const pct    = budget > 0 ? Math.min((total / budget) * 100, 100) : 0

  const weekAmounts = useMemo(() =>
    weekDates.map(d => weekExpenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0)),
    [weekExpenses, weekDates]
  )

  const filteredExp = useMemo(() =>
    selectedDay !== null ? weekExpenses.filter(e => e.date === weekDates[selectedDay]) : weekExpenses,
    [selectedDay, weekExpenses, weekDates]
  )
  const displayCats  = useMemo(() => computeCats(filteredExp), [filteredExp])
  const displayTotal = useMemo(() => filteredExp.reduce((s, e) => s + e.amount, 0), [filteredExp])

  const toggleDay = (i) => setSelectedDay(prev => prev === i ? null : i)

  return (
    <div className="screen-inner">
      <div className="shdr" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginRight: -8 }}>
          <span className="eyebrow">This month</span>
          {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}
        </div>
        <h1>Insights</h1>
      </div>

      <div className="screen-body" style={{ padding: '4px var(--pad) 16px' }}>
        {loading ? (
          <>
            <div style={{ padding: '14px 0 18px' }}>
              <Skel w={100} h={12} mb={10} />
              <Skel w={180} h={40} mb={16} />
              <Skel w="100%" h={6} />
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--card-radius)', padding: '14px var(--pad-sm)', marginBottom: 14 }}>
              <Skel w={80} h={10} mb={14} />
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                {[55,30,80,45,70,20,60].map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', height: h + '%', background: 'var(--surface-2)', borderRadius: 4, animation: 'pulse 1.2s ease-in-out infinite', animationDelay: i * 0.08 + 's' }} />
                    <div style={{ width: 16, height: 8, background: 'var(--surface-2)', borderRadius: 2, animation: 'pulse 1.2s ease-in-out infinite' }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', animation: 'pulse 1.2s ease-in-out infinite', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skel w="60%" h={12} mb={6} />
                    <Skel w="100%" h={3} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* hero total */}
            <div style={{ padding: '14px 0 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6 }}>Spent this month</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>Rp</span>
                <span className="amt" style={{ fontSize: 42, lineHeight: 1, letterSpacing: '-0.035em' }}>
                  {new Intl.NumberFormat('id-ID').format(total)}
                </span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)' }}>
                  <span>of {formatIDRShort(budget)} budget</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{Math.round(pct)}%</span>
                </div>
                <div className="bar" style={{ height: 6 }}>
                  <div style={{ width: pct + '%', background: pct >= 90 ? 'var(--danger)' : 'var(--accent)', transition: 'width 0.4s' }} />
                </div>
              </div>
            </div>

            {/* weekly bars */}
            <div
              style={{ padding: '14px var(--pad-sm)', background: 'var(--surface)', borderRadius: 'var(--card-radius)', marginBottom: 14, cursor: 'default' }}
              onClick={() => setSelectedDay(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last 7 days</span>
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
              <span style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                {selectedDay !== null ? getDayLabel(weekDates[selectedDay]) : 'Last 7 days'} · by category
              </span>
              {displayTotal > 0 && (
                <span className="amt-mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
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
          </>
        )}
      </div>
    </div>
  )
}
