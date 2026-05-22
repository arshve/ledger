import { useState } from 'react'
import { CATS } from '../data/expenses'
import { getPaymentMethods } from '../lib/paymentMethods'
import { getCategories } from '../lib/categories'
import { patchExpense } from '../api'
import Icon from './Icon'

const INPUT = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--line-2)',
  borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)',
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
}

const LABEL = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'var(--ink-3)', marginBottom: 6,
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={LABEL}>{label}</div>
      {children}
    </div>
  )
}

function ChipPicker({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 10, border: 'none',
              background: active ? 'var(--ink)' : 'var(--surface-2)',
              color: active ? 'var(--bg)' : 'var(--ink-2)',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            {opt.icon && <Icon name={opt.icon} size={12} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ExpenseForm({ expense, onSave, onCancel }) {
  const methods = getPaymentMethods()

  // if current method isn't in the list, include it so it shows as selected
  const methodOptions = methods.includes(expense.method)
    ? methods
    : [expense.method, ...methods]

  const [fields, setFields] = useState({
    merchant: expense.merchant,
    amount:   expense.amount,
    cat:      expense.cat,
    method:   expense.method,
    place:    expense.place,
    loc:      expense.loc || '',
    note:     expense.note || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const set = k => e => setFields(f => ({ ...f, [k]: e.target.value }))
  const setPick = k => v => setFields(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const updated = await patchExpense(expense.id, { ...fields, amount: Number(fields.amount) })
      onSave(updated)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const catOptions = getCategories()
    .filter(c => c.enabled || c.key === fields.cat)
    .map(c => ({ value: c.key, label: c.label, icon: c.icon || (CATS[c.key]?.icon) || 'receipt' }))

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Merchant">
        <input style={INPUT} value={fields.merchant} onChange={set('merchant')} />
      </Field>
      <Field label="Amount (IDR)">
        <input style={INPUT} type="number" min="0" value={fields.amount} onChange={set('amount')} />
      </Field>
      <Field label="Category">
        <ChipPicker
          options={catOptions}
          value={fields.cat}
          onChange={setPick('cat')}
        />
      </Field>
      <Field label="Payment method">
        <ChipPicker
          options={methodOptions.map(m => ({ value: m, label: m }))}
          value={fields.method}
          onChange={setPick('method')}
        />
      </Field>
      <Field label="Place / description">
        <input style={INPUT} value={fields.place} onChange={set('place')} />
      </Field>
      <Field label="Location">
        <input style={INPUT} value={fields.loc} onChange={set('loc')} />
      </Field>
      <Field label="Note">
        <textarea
          style={{ ...INPUT, minHeight: 72, resize: 'vertical' }}
          value={fields.note}
          onChange={set('note')}
        />
      </Field>

      {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" className="btn outline" style={{ height: 40, fontSize: 13 }} onClick={onCancel} disabled={saving}>
          Cancel <span style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 2 }}>Esc</span>
        </button>
        <button type="submit" className="btn primary" style={{ flex: 1, height: 40, fontSize: 13 }} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
          {!saving && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>↵</span>}
        </button>
      </div>
    </form>
  )
}
