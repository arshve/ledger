# E2E Test Results — Ledger Mobile Layout

## Summary

All **12 tests pass** in headless Chromium (iPhone 14 Pro viewport: 390×844).  
Bugs reported are **iOS Safari / PWA-specific**.

## Tests implemented

| File | Tests | What it checks |
|------|-------|----------------|
| `e2e/layout-mobile.spec.js` | 6 | Full viewport fill, tabbar position, overflow hidden at every level, tab switching |
| `e2e/bugs-mobile.spec.js` | 6 | Multi-height simulation, scroll immobility, screenshots, viewport meta |

## Test results

```
Layout:     6/6 passed
Bugs:       6/6 passed
```

## Root cause analysis

### BUG-1: Bottom gap / not full screen from start (PWA)

**Theory:** iOS Safari PWA initial render doesn't account for status bar + address bar before `dvh` settles.

Current CSS chain:
```
html { height: 100dvh; overflow: hidden; }
body { height: 100%; overflow: hidden; }
#root { height: 100%; overflow: hidden; }
.app { height: 100%; overflow: hidden; }
```

**Potential issues:**
1. On PWA cold start, `100dvh` might be interpreted before the browser chrome is fully hidden → initial height too tall → bottom gap
2. `--safe-bottom: env(safe-area-inset-bottom, 0px)` is defined but `.tabbar` uses `padding-bottom: var(--safe-bottom)` which only adds padding — no visual gap, but if safe area miscalculates in PWA, could cause offset
3. The `overflow: hidden` on html body AND app prevents scroll, but if initial content is taller than viewport → content clipped at bottom

**Suspected fix:** Add `position: fixed; inset: 0` to `.app` on mobile to force exact viewport anchoring, or use `min-height: 100dvh` instead of just `height`.

### BUG-2: Tab bar scrolls with content / expands (PWA mobile)

**Theory:** The tabbar is nested correctly in the component tree (outside content scroll area), but in iOS PWA:

1. **Safari elastic overscroll** bounces the entire page including the tabbar — makes it look like it "moves"
2. **`overscroll-behavior: contain`** on `.screen-body` helps but **iOS Safari didn't fully support it** until recent versions
3. If `.screen-body` contains `display: flex` with `justify-content: space-between` (InboxFocused), flex can push content around and accidentally overflow the tabbar boundary

**Key finding:** InboxFocused uses `<div className="screen-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>` — this `justify-content: space-between` could be problematic when content height exceeds flex space → pushes bottom buttons past the tabbar boundary.

### BUG-3: Tab bar shows scrollbar / horizontal scroll on tab items

**Theory:** `.tabbar` children (`.tab` buttons) have `flex: 1` which distributes evenly. If total width exceeds viewport → tabs can scroll horizontally. This happens when:
- `gap` + padding on `.tab` items exceed available width
- Safe area insets cause miscalculated widths on iOS

## Screenshots captured

- `e2e/screenshots/initial-fullscreen.png` — initial load (no gap in Chromium)
- `e2e/screenshots/history-scrolled.png` — after scroll (tabbar frozen in place)

## Suggested fixes to try

1. **Fullscreen fix (BUG-1):**
```css
.app {
  position: fixed;
  inset: 0;
  height: auto; /* instead of 100% */
}
```

2. **Tabbar freeze (BUG-2):** Add `overscroll-behavior: none` to parent, ensure `.screen-body` is the ONLY scroll container

3. **PWA viewport:** Already set `viewport-fit=cover` in meta — good. Ensure `apple-mobile-web-app-status-bar-style` is `black-translucent`.

4. **Initial render flash:** Add `body { min-height: 100dvh; }` and remove `height` constraints — let flexbox fill naturally.

## To reproduce on real device

Run:
```bash
npx playwright open --device="iPhone 14 Pro" http://localhost:5173
# or test Safari PWA specific:
npx playwright open --browser=webkit --device="iPhone 14" http://localhost:5173
```
