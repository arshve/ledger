import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { getSettings, updateSettings } from '../api'
import { getPaymentMethods, savePaymentMethods } from '../lib/paymentMethods'
import { getCategories, saveCategories } from '../lib/categories'
import { CATS } from '../data/expenses'
import useSwipeBack from '../hooks/useSwipeBack'

// ── Constants ─────────────────────────────────────────────────

const ICON_OPTIONS = ['food','cart','coffee','car','tv','home','plane','receipt','card','note','sparkle','pin','clock','list','chart','search']

function makeKey(label) {
  const base = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  return base || 'cat_' + Date.now()
}

// ── Shared primitives ─────────────────────────────────────────

function SectionTitle({ children, first }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', padding: `${first ? 12 : 18}px var(--pad) 6px` }}>
      {children}
    </div>
  )
}

function SettingRow({ label, sub, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px var(--pad)', borderBottom: '1px solid var(--line)', cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function SubHeader({ title, onBack }) {
  return (
    <div className="subheader">
      <button
        onClick={onBack}
        style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-2)', fontSize: 14, padding: '6px 6px 6px 0', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <Icon name="chevL" size={18} />
        Settings
      </button>
      <span style={{ color: 'var(--ink-4)', fontSize: 14 }}>·</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{title}</span>
    </div>
  )
}

function IconPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {ICON_OPTIONS.map(ic => (
        <button
          key={ic} type="button" onClick={() => onChange(ic)}
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: value === ic ? 'var(--ink)' : 'var(--surface-2)',
            color: value === ic ? 'var(--bg)' : 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Icon name={ic} size={15} />
        </button>
      ))}
    </div>
  )
}

const INPUT_STYLE = {
  padding: '8px 12px', border: '1px solid var(--accent)', borderRadius: 8,
  background: 'var(--surface)', color: 'var(--ink)', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', width: '100%',
}

// ── Categories screen ─────────────────────────────────────────

function CategoriesScreen({ onBack }) {
  const [cats, setCats]         = useState(getCategories)
  const [editKey, setEditKey]   = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editIcon, setEditIcon] = useState('receipt')
  const [adding, setAdding]     = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon]   = useState('receipt')
  const swipe = useSwipeBack({ onSwipeBack: onBack })

  const commit = (updated) => { setCats(updated); saveCategories(updated) }

  const startEdit = (c) => {
    setAdding(false)
    setEditKey(c.key)
    setEditLabel(c.label)
    setEditIcon(c.icon || CATS[c.key]?.icon || 'receipt')
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

  const BTN = (props) => (
    <button {...props} style={{ flex: props.primary ? 2 : 1, padding: '8px 0', border: props.primary ? 'none' : '1px solid var(--line-2)', borderRadius: 8, background: props.primary ? 'var(--ink)' : 'transparent', color: props.primary ? 'var(--bg)' : 'var(--ink-2)', fontSize: 13, fontWeight: props.primary ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', ...props.style }} />
  )

  return (
    <div {...swipe} style={{flex:1,display:"flex",flexDirection:"column"}}>
      <SubHeader title="Categories" onBack={onBack} />
      <div className="screen-body">
        <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px var(--pad) 4px' }}>
          Tap the pencil to edit, toggle to show/hide in the form.
        </div>

        {cats.map(c => {
          const iconName = c.icon || CATS[c.key]?.icon || 'receipt'
          const isEditing = editKey === c.key
          return (
            <div key={c.key} style={{ borderBottom: '1px solid var(--line)' }}>
              {/* row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px var(--pad)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
                  <Icon name={iconName} size={14} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: c.enabled ? 'var(--ink)' : 'var(--ink-3)' }}>{c.label}</span>
                {/* edit */}
                <button onClick={() => isEditing ? setEditKey(null) : startEdit(c)} style={{ background: 'transparent', border: 'none', color: isEditing ? 'var(--accent)' : 'var(--ink-3)', cursor: 'pointer', padding: 6, display: 'flex' }}>
                  <Icon name="edit" size={15} />
                </button>
                {/* toggle */}
                <div
                  onClick={() => toggle(c.key)}
                  style={{ width: 38, height: 22, borderRadius: 11, background: c.enabled ? 'var(--ink)' : 'var(--surface-2)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                >
                  <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg)', left: c.enabled ? 19 : 3, transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                </div>
                {/* delete */}
                <button onClick={() => remove(c.key)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', padding: 6, display: 'flex' }}>
                  <Icon name="x" size={14} />
                </button>
              </div>

              {/* inline edit form */}
              {isEditing && (
                <div style={{ padding: '0 var(--pad) 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    style={INPUT_STYLE}
                    autoFocus
                  />
                  <IconPicker value={editIcon} onChange={setEditIcon} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <BTN onClick={() => setEditKey(null)}>Cancel</BTN>
                    <BTN primary onClick={saveEdit}>Save</BTN>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* add form */}
        {adding ? (
          <div style={{ padding: '12px var(--pad)', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--line)' }}>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCat()}
              placeholder="Category name"
              style={INPUT_STYLE}
              autoFocus
            />
            <IconPicker value={newIcon} onChange={setNewIcon} />
            <div style={{ display: 'flex', gap: 8 }}>
              <BTN onClick={() => { setAdding(false); setNewLabel('') }}>Cancel</BTN>
              <BTN primary onClick={addCat}>Add</BTN>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAdding(true); setEditKey(null) }}
            style={{ width: '100%', padding: '14px var(--pad)', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
          >
            <Icon name="plus" size={16} />
            Add category
          </button>
        )}
      </div>
    </div>
  )
}

// ── Payment methods screen ────────────────────────────────────

function PaymentMethodsScreen({ onBack }) {
  const [methods, setMethods] = useState(getPaymentMethods)
  const [newVal, setNewVal]   = useState('')
  const swipe = useSwipeBack({ onSwipeBack: onBack })

  const save = (updated) => { setMethods(updated); savePaymentMethods(updated) }
  const remove = (m) => save(methods.filter(x => x !== m))
  const add = () => {
    const v = newVal.trim()
    if (!v || methods.includes(v)) return
    save([...methods, v]); setNewVal('')
  }

  return (
    <div {...swipe} style={{flex:1,display:"flex",flexDirection:"column"}}>
      <SubHeader title="Payment methods" onBack={onBack} />
      <div className="screen-body">
        <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px var(--pad) 4px' }}>
          These appear as options when editing an expense.
        </div>
        {methods.map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px var(--pad)', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{m}</span>
            <button onClick={() => remove(m)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 6, display: 'flex' }}>
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, padding: '12px var(--pad)' }}>
          <input
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="e.g. BCA •• 1234"
            style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={add} style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main settings screen ──────────────────────────────────────

export default function Settings({ theme, onToggleTheme, density, onToggleDensity }) {
  const [view, setView]       = useState(null)
  const [budget, setBudget]   = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    getSettings().then(s => setBudget(s.budget || '5000000')).catch(console.error)
  }, [])

  const saveBudget = async () => {
    setSaving(true)
    try {
      const s = await updateSettings({ budget: Number(budget) })
      setBudget(s.budget); setEditing(false)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (view === 'methods')    return <PaymentMethodsScreen onBack={() => setView(null)} />
  if (view === 'categories') return <CategoriesScreen     onBack={() => setView(null)} />

  return (
    <div className="screen-inner">
      <div className="shdr" style={{ flexShrink: 0 }}>
        <h1>Settings</h1>
      </div>

      <div className="screen-body">
        <SectionTitle first>Appearance</SectionTitle>
        <SettingRow label="Theme" sub={theme === 'dark' ? 'Dark mode' : 'Light mode'}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </SettingRow>
        <SettingRow label="Density" sub={density === 'compact' ? 'Compact layout' : 'Cozy layout'}>
          <button
            onClick={onToggleDensity}
            style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--ink)', fontFamily: 'inherit' }}
          >
            {density === 'compact' ? 'Cozy' : 'Compact'}
          </button>
        </SettingRow>

        <SectionTitle>Budget</SectionTitle>
        <SettingRow label="Monthly budget" sub="IDR — used for progress bar">
          {editing ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" value={budget} onChange={e => setBudget(e.target.value)}
                style={{ width: 120, padding: '5px 8px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit' }}
              />
              <button onClick={saveBudget} disabled={saving} style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', padding: '5px 4px', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--line-2)', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--ink)', fontFamily: 'inherit' }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                Rp {new Intl.NumberFormat('id-ID').format(Number(budget))}
              </span>
              <Icon name="edit" size={12} />
            </button>
          )}
        </SettingRow>

        <SectionTitle>Expense options</SectionTitle>
        <SettingRow label="Categories" sub="Add, edit or hide categories" onClick={() => setView('categories')}>
          <Icon name="chevR" size={16} />
        </SettingRow>
        <SettingRow label="Payment methods" sub="Add or remove payment options" onClick={() => setView('methods')}>
          <Icon name="chevR" size={16} />
        </SettingRow>

        <SectionTitle>Connected accounts</SectionTitle>
        <SettingRow label="Gmail" sub="me@gmail.com">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
            Connected
          </span>
        </SettingRow>
        <SettingRow label="Bank accounts" sub="BCA, OVO, Gopay, ShopeePay">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
            3 connected
          </span>
        </SettingRow>

        <SectionTitle>OpenClaw agent</SectionTitle>
        <SettingRow label="Email scanning" sub="Reads receipts and extracts spend data">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
            Active
          </span>
        </SettingRow>
        <SettingRow label="Auto-categorize" sub="AI guesses category from merchant name">
          <span style={{ fontSize: 12, color: 'var(--success)' }}>On</span>
        </SettingRow>

        <div style={{ padding: '32px var(--pad) 16px', fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
          Ledger v1.0.0 · Built for personal use
        </div>
      </div>
    </div>
  )
}
