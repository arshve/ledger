import { useState } from 'react'
import Icon from './Icon'

export default function ThemeToggle({ theme, onToggle, style }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle?.() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: hovered ? 'var(--surface-2)' : 'transparent',
        border: 'none',
        padding: 8,
        borderRadius: 999,
        cursor: 'pointer',
        color: hovered ? 'var(--ink)' : 'var(--ink-2)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s',
        ...style,
      }}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} stroke={1.7} />
    </button>
  )
}
