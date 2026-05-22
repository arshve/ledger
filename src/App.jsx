import { useState, useCallback, useEffect } from 'react'
import TabBar from './components/TabBar'
import InboxFocused, { InboxDone } from './screens/InboxFocused'
import ExpenseDetail from './screens/ExpenseDetail'
import EmailSource from './screens/EmailSource'
import Dashboard from './screens/Dashboard'
import History from './screens/History'
import Settings from './screens/Settings'
import DesktopApp from './screens/DesktopApp'
import { listExpenses, patchExpense, deleteExpense } from './api'
import { decorate } from './lib/date'
import useHotkeys from './hooks/useHotkeys'

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

export default function App() {
  const isDesktop = useIsDesktop()

  const [theme, setTheme]     = useState(() => localStorage.getItem('theme') || 'dark')
  const [density, setDensity] = useState(() => localStorage.getItem('density') || 'cozy')
  const [tab, setTab]         = useState('inbox')

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)

  const [reviewIdx]   = useState(0)
  const [overlay, setOverlay] = useState(null)

  const fetchExpenses = useCallback(async () => {
    try {
      const rows = await listExpenses()
      setExpenses(rows.map(decorate))
    } catch (e) {
      console.error('fetch expenses', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const pending   = expenses.filter(e => e.status === 'pending')
  const confirmed = expenses.filter(e => e.status === 'confirmed')

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
    catch (e) { console.error(e); fetchExpenses() }
  }, [pending, reviewIdx, applyPatch, fetchExpenses])

  const handleReject = useCallback(async () => {
    const expense = pending[reviewIdx]
    if (!expense) return
    try { applyPatch(await patchExpense(expense.id, { status: 'rejected' })) }
    catch (e) { console.error(e); fetchExpenses() }
  }, [pending, reviewIdx, applyPatch, fetchExpenses])

  // mobile detail overlay confirm/reject
  const handleConfirmFromDetail = useCallback(async () => {
    if (!overlay?.expenseId) return
    try { applyPatch(await patchExpense(overlay.expenseId, { status: 'confirmed' })) }
    catch (e) { console.error(e); fetchExpenses() }
    setOverlay(null)
  }, [overlay, applyPatch, fetchExpenses])

  const handleRejectFromDetail = useCallback(async () => {
    if (!overlay?.expenseId) return
    try { applyPatch(await patchExpense(overlay.expenseId, { status: 'rejected' })) }
    catch (e) { console.error(e); fetchExpenses() }
    setOverlay(null)
  }, [overlay, applyPatch, fetchExpenses])

  // desktop confirm/reject (by id)
  const handleDesktopConfirm = useCallback(async id => {
    try { applyPatch(await patchExpense(id, { status: 'confirmed' })) }
    catch (e) { console.error(e); fetchExpenses() }
  }, [applyPatch, fetchExpenses])

  const handleDesktopReject = useCallback(async id => {
    try { applyPatch(await patchExpense(id, { status: 'rejected' })) }
    catch (e) { console.error(e); fetchExpenses() }
  }, [applyPatch, fetchExpenses])

  const handleEdit = useCallback((updated) => {
    applyPatch(decorate(updated))
  }, [applyPatch])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
      setOverlay(prev => prev?.expenseId === id ? null : prev)
    } catch (e) { console.error(e); fetchExpenses() }
  }, [fetchExpenses])

  const safePendingIdx = Math.min(reviewIdx, Math.max(0, pending.length - 1))

  // Mobile inbox keyboard (only when tab=inbox, no overlay)
  const hotkeysEnabled = !isDesktop && tab === 'inbox' && !overlay && pending.length > 0
  useHotkeys({
    enabled: hotkeysEnabled,
    onConfirm: handleConfirm,
    onReject: handleReject,
    onEdit: () => pending[safePendingIdx] && setOverlay({ view: VIEW.DETAIL, expenseId: pending[safePendingIdx].id, editing: true }),
  })

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
      </div>
    )
  }

  // ── Mobile layout ───────────────────────────────────────────
  if (overlay) {
    const expense = expenses.find(e => e.id === overlay.expenseId)

    if (overlay.view === VIEW.SOURCE) {
      return (
        <div className="app" data-theme={theme} data-density={density}>
          <EmailSource expense={expense} onBack={() => setOverlay(prev => ({ ...prev, view: VIEW.DETAIL }))} />
        </div>
      )
    }

    if (overlay.view === VIEW.DETAIL) {
      return (
        <div className="app" data-theme={theme} data-density={density}>
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
      {tab === 'inbox' && (
        pending.length > 0 ? (
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
        )
      )}

      {tab === 'history'  && <History  confirmed={confirmed} {...sharedProps} onSelect={e => setOverlay({ view: VIEW.DETAIL, expenseId: e.id })} onDelete={handleDelete} />}
      {tab === 'insights' && <Dashboard {...sharedProps} />}
      {tab === 'settings' && (
        <Settings
          {...sharedProps}
          density={density}
          onToggleDensity={toggleDensity}
        />
      )}

      <TabBar active={tab} onChange={t => { setTab(t); setOverlay(null) }} />
    </div>
  )
}
