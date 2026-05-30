import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import TabBar from './components/TabBar'
import InboxFocused, { InboxDone } from './screens/InboxFocused'
import ExpenseDetail from './screens/ExpenseDetail'
import EmailSource from './screens/EmailSource'
import Dashboard from './screens/Dashboard'
import History from './screens/History'
import Settings from './screens/Settings'
import DesktopApp from './screens/DesktopApp'
import { listExpenses, patchExpense, deleteExpense, scanReceipt } from './api'
import { decorate } from './lib/date'
import Icon from './components/Icon'
import StepsOverlay from './components/StepsOverlay'
import { formatIDRShort } from './data/expenses'
import useHotkeys from './hooks/useHotkeys'
import useSwipeBack from './hooks/useSwipeBack'

const VIEW = { DETAIL: 'detail', SOURCE: 'source' }
const DESKTOP_BREAKPOINT = 900

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

// ── Toast component ───────────────────────────────────────────

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const bg = type === 'error' ? 'var(--danger)' : 'var(--success)'
  return (
    <div style={{
      position: 'fixed', bottom: 72, left: 12, right: 12, zIndex: 9999,
      background: bg, color: '#fff',
      padding: '10px 14px', borderRadius: 10, fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.2s ease',
    }}>
      <span>{message}</span>
      <button onClick={onDismiss} style={{
        background: 'transparent', border: 'none', color: '#fff',
        fontSize: 16, cursor: 'pointer', marginLeft: 8, padding: 0,
      }}>×</button>
    </div>
  )
}

const SCAN_STEPS = [
  { label: 'Reading image…',          sub: 'Converting snapshot to base64', icon: 'camera' },
  { label: 'Sending to MiMo vision…', sub: 'AI processing the receipt',     icon: 'upload' },
  { label: 'Parsing transaction data…', sub: 'Extracting merchant & amounts', icon: 'list' },
]

export default function App() {
  const isDesktop = useIsDesktop()

  const [theme, setTheme]     = useState(() => localStorage.getItem('theme') || 'dark')
  const [density, setDensity] = useState(() => localStorage.getItem('density') || 'cozy')
  const [tab, setTab]         = useState('inbox')

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)

  const [reviewIdx]   = useState(0)
  const [overlay, setOverlay] = useState(null)
  const [toast, setToast] = useState(null) // { message, type }
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const fileRef = useRef(null)

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const fetchExpenses = useCallback(async () => {
    try {
      const rows = await listExpenses()
      setExpenses(rows.map(decorate))
    } catch (e) {
      console.error('fetch expenses', e)
      showToast('Failed to load expenses — check connection', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const pending   = useMemo(() => expenses.filter(e => e.status === 'pending'),   [expenses])
  const confirmed = useMemo(() => expenses.filter(e => e.status === 'confirmed'), [expenses])

  const toggleTheme = useCallback(() => {
    setTheme(t => { const n = t === 'dark' ? 'light' : 'dark'; localStorage.setItem('theme', n); return n })
  }, [])
  const toggleDensity = useCallback(() => {
    setDensity(d => { const n = d === 'compact' ? 'cozy' : 'compact'; localStorage.setItem('density', n); return n })
  }, [])

  const applyPatch = useCallback((updated) => {
    setExpenses(prev => prev.map(e => e.id === updated.id ? decorate(updated) : e))
  }, [])

  // mobile inbox confirm/reject (focused expense)
  const handleConfirm = useCallback(async () => {
    const expense = pending[reviewIdx]
    if (!expense) return
    try { applyPatch(await patchExpense(expense.id, { status: 'confirmed' })) }
    catch (e) { console.error(e); fetchExpenses(); showToast('Failed to confirm', 'error') }
  }, [pending, reviewIdx, applyPatch, fetchExpenses, showToast])

  const handleScan = useCallback(async (file) => {
    if (!file || scanning) return
    setScanning(true)
    setScanStep(0)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      try {
        await new Promise(r => setTimeout(r, 1000))
        setScanStep(1)
        await new Promise(r => setTimeout(r, 1000))
        setScanStep(2)
        const result = await scanReceipt(base64)
        const items = Array.isArray(result) ? result : [result]
        showToast(`${items.length} expense${items.length > 1 ? 's' : ''} scanned: ${items.map(i => formatIDRShort(i.amount)).join(', ')}`, 'success')
        await fetchExpenses()
        setScanStep(3)
        await new Promise(r => setTimeout(r, 1200))
      } catch (err) {
        showToast(err.message, 'error')
      } finally { setScanning(false); setScanStep(0) }
    }
    reader.onerror = () => { showToast('Failed to read image', 'error'); setScanning(false) }
    reader.readAsDataURL(file)
  }, [scanning, fetchExpenses, showToast])

  const handleReject = useCallback(async () => {
    const expense = pending[reviewIdx]
    if (!expense) return
    try { applyPatch(await patchExpense(expense.id, { status: 'rejected' })) }
    catch (e) { console.error(e); fetchExpenses(); showToast('Failed to reject', 'error') }
  }, [pending, reviewIdx, applyPatch, fetchExpenses, showToast])

  // mobile detail overlay confirm/reject
  const handleConfirmFromDetail = useCallback(async () => {
    if (!overlay?.expenseId) return
    try { applyPatch(await patchExpense(overlay.expenseId, { status: 'confirmed' })) }
    catch (e) { console.error(e); fetchExpenses(); showToast('Failed to confirm', 'error') }
    setOverlay(null)
  }, [overlay, applyPatch, fetchExpenses, showToast])

  const handleRejectFromDetail = useCallback(async () => {
    if (!overlay?.expenseId) return
    try { applyPatch(await patchExpense(overlay.expenseId, { status: 'rejected' })) }
    catch (e) { console.error(e); fetchExpenses(); showToast('Failed to reject', 'error') }
    setOverlay(null)
  }, [overlay, applyPatch, fetchExpenses, showToast])

  // desktop confirm/reject (by id)
  const handleDesktopConfirm = useCallback(async id => {
    try { applyPatch(await patchExpense(id, { status: 'confirmed' })) }
    catch (e) { console.error(e); fetchExpenses(); showToast('Failed to confirm', 'error') }
  }, [applyPatch, fetchExpenses, showToast])

  const handleDesktopReject = useCallback(async id => {
    try { applyPatch(await patchExpense(id, { status: 'rejected' })) }
    catch (e) { console.error(e); fetchExpenses(); showToast('Failed to reject', 'error') }
  }, [applyPatch, fetchExpenses, showToast])

  const handleEdit = useCallback((updated) => {
    applyPatch(decorate(updated))
  }, [applyPatch])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
      setOverlay(prev => prev?.expenseId === id ? null : prev)
    } catch (e) { console.error(e); fetchExpenses(); showToast('Failed to delete', 'error') }
  }, [fetchExpenses, showToast])

  const safePendingIdx = Math.min(reviewIdx, Math.max(0, pending.length - 1))

  // Mobile inbox keyboard (only when tab=inbox, no overlay)
  const hotkeysEnabled = !isDesktop && tab === 'inbox' && !overlay && pending.length > 0
  useHotkeys({
    enabled: hotkeysEnabled,
    onConfirm: handleConfirm,
    onReject: handleReject,
    onEdit: () => pending[safePendingIdx] && setOverlay({ view: VIEW.DETAIL, expenseId: pending[safePendingIdx].id, editing: true }),
  })

  const swipeBackHandler = useCallback(() => {
    if (overlay?.view === VIEW.SOURCE) {
      setOverlay(prev => ({ ...prev, view: VIEW.DETAIL }))
    } else {
      setOverlay(null)
    }
  }, [overlay])

  const swipeProps = useSwipeBack({ onSwipeBack: swipeBackHandler, enabled: !isDesktop && !!overlay })

  const sharedProps = { theme, onToggleTheme: toggleTheme }

  if (loading) {
    return (
      <div
        data-theme={theme}
        style={{ width: '100vw', height: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)', fontSize: 13 }}
      >
        Loading…
      </div>
    )
  }

  // ── Desktop layout ──────────────────────────────────────────
  if (isDesktop) {
    return (
      <div
        data-theme={theme}
        data-density={density}
        style={{ width: '100vw', height: '100dvh', background: 'var(--bg)', fontFamily: 'var(--font-sans)', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}
      >
        <DesktopApp
          expenses={expenses}
          onConfirm={handleDesktopConfirm}
          onReject={handleDesktopReject}
          onEdit={handleEdit}
          onDelete={handleDelete}
          theme={theme}
          onToggleTheme={toggleTheme}
          density={density}
          onToggleDensity={toggleDensity}
        />
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
      </div>
    )
  }

  // ── Mobile layout ───────────────────────────────────────────
  if (overlay) {
    const expense = expenses.find(e => e.id === overlay.expenseId)

    if (overlay.view === VIEW.SOURCE) {
      return (
        <div className="app" data-theme={theme} data-density={density} {...swipeProps}>
          <EmailSource expense={expense} onBack={() => setOverlay(prev => ({ ...prev, view: VIEW.DETAIL }))} />
        </div>
      )
    }

    if (overlay.view === VIEW.DETAIL) {
      return (
        <div className="app" data-theme={theme} data-density={density} {...swipeProps}>
          <ExpenseDetail
            expense={expense}
            onBack={() => setOverlay(null)}
            onConfirm={handleConfirmFromDetail}
            onReject={handleRejectFromDetail}
            onViewSource={() => setOverlay(prev => ({ ...prev, view: VIEW.SOURCE }))}
            onEdit={handleEdit}
            initialEditing={overlay.editing || false}
          />
        </div>
      )
    }
  }

  return (
    <div className="app" data-theme={theme} data-density={density}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {tab === 'inbox' && (
          <>
            {pending.length > 0 ? (
              <InboxFocused
                pending={pending}
                idx={safePendingIdx}
                onConfirm={handleConfirm}
                onReject={handleReject}
                onViewSource={() => pending[safePendingIdx] && setOverlay({ view: VIEW.SOURCE, expenseId: pending[safePendingIdx].id })}
                onViewDetail={() => pending[safePendingIdx] && setOverlay({ view: VIEW.DETAIL, expenseId: pending[safePendingIdx].id })}
                onViewEdit={() => pending[safePendingIdx] && setOverlay({ view: VIEW.DETAIL, expenseId: pending[safePendingIdx].id, editing: true })}
                {...sharedProps}
              />
            ) : (
              <InboxDone
                onViewHistory={() => setTab('history')}
                onViewInsights={() => setTab('insights')}
                onRefresh={fetchExpenses}
              />
            )}

            {/* hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleScan(f); e.target.value = '' }}
            />

            {/* scanning overlay */}
            {scanning && (
              <StepsOverlay steps={SCAN_STEPS} currentStep={scanStep} onCancel={() => { setScanning(false); setScanStep(0) }} />
            )}

            {/* floating scan button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              style={{
                position: 'fixed', bottom: 76, right: 16, zIndex: scanning ? 50 : 100,
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--accent)',
                border: 'none', color: '#fff', cursor: scanning ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                opacity: scanning ? 0 : 1,
                transition: 'opacity 0.2s, transform 0.1s',
                transform: scanning ? 'scale(0.5)' : 'scale(1)',
              }}
            >
              <Icon name="camera" size={22} />
            </button>
          </>
        )}

        {tab === 'history'  && (
          <History
            confirmed={confirmed}
            {...sharedProps}
            onSelect={e => setOverlay({ view: VIEW.DETAIL, expenseId: e.id })}
            onDelete={handleDelete}
            onRefresh={fetchExpenses}
          />
        )}
        {tab === 'insights' && (
          <Dashboard {...sharedProps} />
        )}
        {tab === 'settings' && (
          <Settings
            {...sharedProps}
            density={density}
            onToggleDensity={toggleDensity}
          />
        )}
      </div>
      <TabBar active={tab} onChange={t => { setTab(t); setOverlay(null) }} />
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  )
}
