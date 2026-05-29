import { useState } from 'react'
import Icon from '../components/Icon'
import InboxPane    from './desktop/InboxPane'
import HistoryPane  from './desktop/HistoryPane'
import InsightsPane from './desktop/InsightsPane'
import SourcesPane  from './desktop/SourcesPane'
import SettingsPane from './desktop/SettingsPane'

function SideItem({ icon, label, badge, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
      borderRadius: 8, fontSize: 13, fontWeight: active ? 500 : 400,
      color: active ? 'var(--ink)' : 'var(--ink-2)',
      background: active ? 'var(--surface)' : 'transparent',
      cursor: 'pointer', border: 'none', width: '100%',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      <Icon name={icon} size={15} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
          padding: '2px 6px', borderRadius: 999,
          background: active ? 'var(--ink)' : 'var(--surface-2)',
          color: active ? 'var(--bg)' : 'var(--ink-2)',
        }}>{badge}</span>
      )}
    </button>
  )
}

export default function DesktopApp({ expenses, onConfirm, onReject, onEdit, onDelete, theme, onToggleTheme, density, onToggleDensity }) {
  const pending = expenses.filter(e => e.status === 'pending')
  const [activeNav, setActiveNav] = useState('inbox')

  const isInbox = activeNav === 'inbox'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isInbox ? '200px 1fr 340px' : '200px 1fr',
      gridTemplateRows: '100%',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      color: 'var(--ink)',
      background: 'var(--bg)',
      letterSpacing: '-0.011em',
      fontSize: 14,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* sidebar */}
      <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', padding: '18px 12px', gap: 3, overflow: 'hidden', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 18px' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>L</div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.015em' }}>Ledger</span>
        </div>

        <SideItem icon="inbox"    label="Inbox"    badge={pending.length || null} active={activeNav === 'inbox'}    onClick={() => setActiveNav('inbox')} />
        <SideItem icon="list"     label="History"                                 active={activeNav === 'history'}  onClick={() => setActiveNav('history')} />
        <SideItem icon="chart"    label="Insights"                                active={activeNav === 'insights'} onClick={() => setActiveNav('insights')} />
        <SideItem icon="mail"     label="Sources"                                 active={activeNav === 'sources'}  onClick={() => setActiveNav('sources')} />
        <SideItem icon="settings" label="Settings"                                active={activeNav === 'settings'} onClick={() => setActiveNav('settings')} />

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 8px 0' }}>
          <button onClick={onToggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--ink-2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>OpenClaw</div>
            <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
              Agent active
            </div>
          </div>
        </div>
      </div>

      {/* main content */}
      {activeNav === 'inbox'    && <InboxPane    expenses={expenses} onConfirm={onConfirm} onReject={onReject} onEdit={onEdit} />}
      {activeNav === 'history'  && <HistoryPane  expenses={expenses} onEdit={onEdit} onDelete={onDelete} />}
      {activeNav === 'insights' && <InsightsPane />}
      {activeNav === 'sources'  && <SourcesPane />}
      {activeNav === 'settings' && <SettingsPane theme={theme} onToggleTheme={onToggleTheme} density={density} onToggleDensity={onToggleDensity} />}
    </div>
  )
}
