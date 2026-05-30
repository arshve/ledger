import { useState, useEffect } from 'react'
import Icon from '../../components/Icon'
import { CATS, formatIDRShort } from '../../data/expenses'
import { getSettings, updateSettings } from '../../api'
import { getPaymentMethods, savePaymentMethods } from '../../lib/paymentMethods'
import { getCategories, saveCategories } from '../../lib/categories'

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
  const [cats, setCats]           = useState(getCategories)
  const [editKey, setEditKey]     = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editIcon, setEditIcon]   = useState('receipt')
  const [adding, setAdding]       = useState(false)
  const [newLabel, setNewLabel]   = useState('')
  const [newIcon, setNewIcon]     = useState('receipt')

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

  const save   = (updated) => { setMethods(updated); savePaymentMethods(updated) }
  const remove = (m) => save(methods.filter(x => x !== m))
  const add    = () => {
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

export default function SettingsPane({ theme, onToggleTheme, density, onToggleDensity }) {
  const [section, setSection]       = useState('appearance')
  const [budget, setBudget]         = useState('')
  const [editBudget, setEditBudget] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved,  setSaved]          = useState(false)

  useEffect(() => {
    getSettings().then(s => setBudget(s.budget || '5000000')).catch(console.error)
  }, [])

  const saveBudget = async () => {
    setSaving(true)
    try {
      const s = await updateSettings({ budget: Number(budget) })
      setBudget(s.budget); setEditBudget(false)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
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
              <button onClick={saveBudget} disabled={saving || saved}
                style={{ background: saved ? 'var(--success)' : 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'background 0.2s' }}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
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
          { label: 'Gmail',     sub: 'faridevan97@gmail.com', ok: true  },
          { label: 'BCA',       sub: 'Debit ••4827',          ok: true  },
          { label: 'OVO',       sub: 'Linked wallet',         ok: true  },
          { label: 'Gopay',     sub: 'Linked wallet',         ok: true  },
          { label: 'ShopeePay', sub: 'Linked wallet',         ok: false },
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
