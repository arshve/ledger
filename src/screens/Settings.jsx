import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { getSettings, updateSettings } from '../api'

function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px var(--pad)', borderBottom: '1px solid var(--line)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

export default function Settings({ theme, onToggleTheme, density, onToggleDensity }) {
  const [budget, setBudget]     = useState('')
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    getSettings().then(s => setBudget(s.budget || '5000000')).catch(console.error)
  }, [])

  const saveBudget = async () => {
    setSaving(true)
    try {
      const s = await updateSettings({ budget: Number(budget) })
      setBudget(s.budget)
      setEditing(false)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="shdr" style={{ flexShrink: 0 }}>
        <h1>Settings</h1>
      </div>

      <div className="screen-body">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', padding: '12px var(--pad) 6px' }}>
          Appearance
        </div>
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

        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', padding: '18px var(--pad) 6px' }}>
          Budget
        </div>
        <SettingRow label="Monthly budget" sub="IDR — used for progress bar">
          {editing ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
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

        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', padding: '18px var(--pad) 6px' }}>
          Connected accounts
        </div>
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

        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', padding: '18px var(--pad) 6px' }}>
          OpenClaw agent
        </div>
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
    </>
  )
}
