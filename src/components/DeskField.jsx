export default function DeskField({ label, value, link, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13, gap: 12 }}>
      <span style={{ flex: '0 0 90px', color: 'var(--ink-3)', fontSize: 12 }}>{label}</span>
      <span
        onClick={onClick}
        style={{ flex: 1, color: link ? 'var(--accent)' : 'var(--ink)', fontWeight: 500, cursor: link ? 'pointer' : 'default' }}
      >
        {value}
      </span>
    </div>
  )
}
