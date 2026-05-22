const paths = {
  food: <><path d="M5 3v8a3 3 0 003 3v7" /><path d="M8 3v6" /><path d="M11 3v6" /><path d="M17 3c-1.5 0-3 2-3 5s1.5 4 3 4v9" /></>,
  cart: <><circle cx="9" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" /><path d="M3 4h2l2.6 11.2a2 2 0 002 1.5h7.5a2 2 0 002-1.5L21 8H6" /></>,
  coffee: <><path d="M4 8h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5V8z" /><path d="M17 10h2a2 2 0 010 4h-2" /><path d="M7 3v2M11 3v2M15 3v2" /></>,
  car: <><path d="M5 14l1.5-5a2 2 0 012-1.4h7a2 2 0 012 1.4L19 14" /><path d="M3 14h18v4a1 1 0 01-1 1h-1.5a1 1 0 01-1-1v-1H6.5v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z" /><circle cx="7" cy="17" r="0.8" fill="currentColor" /><circle cx="17" cy="17" r="0.8" fill="currentColor" /></>,
  tv: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></>,
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" /></>,
  plane: <><path d="M21 16v-2L13 9V4a1.5 1.5 0 00-3 0v5L2 14v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5z" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  inbox: <><path d="M3 13l3-9h12l3 9" /><path d="M3 13v6a1 1 0 001 1h16a1 1 0 001-1v-6" /><path d="M3 13h5l1.5 2h5L16 13h5" /></>,
  chart: <><path d="M4 4v16h16" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="14" width="3" height="4" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="0.8" fill="currentColor" /><circle cx="4" cy="12" r="0.8" fill="currentColor" /><circle cx="4" cy="18" r="0.8" fill="currentColor" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>,
  check: <><path d="M5 12l4 4 10-10" /></>,
  x: <><path d="M6 6l12 12M18 6l-12 12" /></>,
  edit: <><path d="M4 20h4l11-11-4-4L4 16v4z" /><path d="M14 5l4 4" /></>,
  chevR: <><path d="M9 6l6 6-6 6" /></>,
  chevL: <><path d="M15 6l-6 6 6 6" /></>,
  chevD: <><path d="M6 9l6 6 6-6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  pin: <><path d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></>,
  note: <><path d="M5 4h10l4 4v12H5z" /><path d="M14 4v5h5" /><path d="M8 13h7M8 16h5" /></>,
  sparkle: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /></>,
  arrUp: <><path d="M12 19V5M5 12l7-7 7 7" /></>,
  arrDn: <><path d="M12 5v14M5 12l7 7 7-7" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  moon: <><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" /></>,
  filter: <><path d="M3 5h18M6 12h12M10 19h4" /></>,
  plus:   <><path d="M12 5v14M5 12h14" /></>,
}

export default function Icon({ name, size = 16, stroke = 1.6 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
    >
      {paths[name] || null}
    </svg>
  )
}
