export default function StatusBar({ time = '9:41' }) {
  return (
    <div className="statusbar">
      <span>{time}</span>
      <div className="icons">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="6" width="3" height="5" rx="0.5"/>
          <rect x="5" y="4" width="3" height="7" rx="0.5"/>
          <rect x="10" y="2" width="3" height="9" rx="0.5"/>
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <path d="M8 2.5C5.5 2.5 3.3 3.5 1.7 5L0.2 3.5C2.3 1.5 5 0.3 8 0.3s5.7 1.2 7.8 3.2L14.3 5C12.7 3.5 10.5 2.5 8 2.5zM8 5.6c-1.6 0-3 0.6-4.1 1.5l1.5 1.5c0.7-0.6 1.6-1 2.6-1s1.9 0.4 2.6 1l1.5-1.5C11 6.2 9.6 5.6 8 5.6zM6.5 9.5l1.5 1.5 1.5-1.5C9.1 9.2 8.6 9 8 9s-1.1 0.2-1.5 0.5z"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="currentColor" opacity="0.4"/>
          <rect x="2" y="2" width="14" height="8" rx="1" fill="currentColor"/>
          <rect x="22.5" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.4"/>
        </svg>
      </div>
    </div>
  )
}
