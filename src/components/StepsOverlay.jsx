import Icon from './Icon'

export default function StepsOverlay({ steps, currentStep, onCancel }) {
  const done = currentStep >= steps.length
  if (steps.length === 0) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 28,
    }}>
      {/* pulsing ring + icon */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* outer glow ring */}
        {!done && (
          <div style={{
            position: 'absolute',
            width: 80, height: 80, borderRadius: '50%',
            border: '2px solid var(--accent)',
            opacity: 0.3,
            animation: 'ringPulse 1.4s ease-in-out infinite',
          }} />
        )}
        {/* icon box */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: done ? 'var(--success, #22c55e)' : 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.4s',
          zIndex: 1,
          color: done ? '#fff' : 'var(--accent)',
        }}>
          <Icon
            name={done ? 'check' : (steps[currentStep]?.icon || 'camera')}
            size={28}
          />
        </div>
      </div>

      {/* step label */}
      <div style={{ color: '#fff', fontSize: 17, fontWeight: 600, textAlign: 'center' }}>
        {done ? 'Done!' : steps[currentStep]?.label}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.4 }}>
        {done ? 'Expenses recorded' : steps[currentStep]?.sub || ''}
      </div>

      {/* progress dots */}
      {!done && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i === currentStep
                  ? 'var(--accent)'
                  : i < currentStep
                    ? 'rgba(255,255,255,0.4)'
                    : 'rgba(255,255,255,0.15)',
                transition: 'background 0.35s',
                transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}

      {/* done button */}
      {done && (
        <button onClick={onCancel} style={{
          marginTop: 8, padding: '12px 32px', borderRadius: 14,
          background: 'var(--accent)', border: 'none', color: '#fff',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          Done
        </button>
      )}

    </div>
  )
}
