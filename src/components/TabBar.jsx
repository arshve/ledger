import Icon from './Icon'

const TABS = [
  { id: 'inbox',    label: 'Inbox',    icon: 'inbox'    },
  { id: 'history',  label: 'History',  icon: 'list'     },
  { id: 'insights', label: 'Insights', icon: 'chart'    },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export default function TabBar({ active, onChange }) {
  return (
    <div className="tabbar">
      {TABS.map(t => (
        <button
          key={t.id}
          className={'tab' + (active === t.id ? ' active' : '')}
          onClick={() => onChange(t.id)}
        >
          <Icon name={t.icon} size={22} stroke={active === t.id ? 1.9 : 1.5} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
