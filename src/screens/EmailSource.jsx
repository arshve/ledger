import Icon from '../components/Icon'
import { CATS } from '../data/expenses'

export default function EmailSource({ expense, onBack }) {
  const raw = expense?.raw || ''
  const from = expense?.source_ref || 'unknown'
  const cat  = expense ? (CATS[expense.cat] || CATS.food) : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-2)', fontSize: 14, padding: '6px 6px 6px 4px', cursor: 'pointer' }}
        >
          <Icon name="chevL" size={18} />
          Detail
        </button>
        <span className="pill"><Icon name="mail" size={10} /> Source</span>
      </div>

      <div className="screen-body" style={{ padding: '0 var(--pad) 20px' }}>
        {expense ? (
          <>
            <div style={{ padding: '14px 4px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 4 }}>From</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{from || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>to me · {expense.time}</div>
            </div>

            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', marginBottom: 14 }}>
              {expense.merchant} — {expense.place}
            </div>

            {raw ? (
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--card-radius)', padding: 'var(--pad)', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.65, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                {raw}
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--card-radius)', padding: 'var(--pad)', color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>
                No raw email data — expense added manually.
              </div>
            )}

            <div style={{ marginTop: 16, padding: 'var(--pad)', background: 'var(--accent-soft)', borderRadius: 'var(--card-radius)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent-ink)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                <Icon name="sparkle" size={12} />
                Extracted by OpenClaw
              </div>
              <div style={{ fontSize: 13, color: 'var(--accent-ink)', lineHeight: 1.5 }}>
                Matched merchant to <b>{expense.merchant}</b>. Categorized as <b>{cat?.label}</b>.
                Amount: <b>Rp {new Intl.NumberFormat('id-ID').format(expense.amount)}</b>.
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Expense not found.</div>
        )}
      </div>
    </>
  )
}
