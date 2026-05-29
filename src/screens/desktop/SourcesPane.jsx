import { useState, useEffect } from 'react'
import Icon from '../../components/Icon'
import { CATS } from '../../data/expenses'
import { listExpenses } from '../../api'

export default function SourcesPane() {
  const [sources, setSources] = useState([])
  const [selIdx, setSelIdx]   = useState(0)

  useEffect(() => {
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
