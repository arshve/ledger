import 'dotenv/config'
import express from 'express'
import db from './db.js'

const app  = express()
const PORT = process.env.PORT || 3001
const TOKEN = process.env.API_TOKEN

app.use(express.json())

// ── Auth middleware (OpenClaw writes only) ──────────────────────
function requireToken(req, res, next) {
  if (!TOKEN) return res.status(500).json({ error: 'API_TOKEN not set in .env' })
  const auth = req.headers['authorization'] || ''
  if (auth !== `Bearer ${TOKEN}`) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// ── Serializer: add derived time/date fields ────────────────────
const VALID_CATS = ['food','shopping','coffee','transport','subscription','utility','travel','groceries']
const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function serialize(row) {
  if (!row) return null
  const dt   = new Date(row.occurred_at)
  const now  = new Date()
  const dtDate = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) // YYYY-MM-DD
  const nowDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const yestDate = new Date(now - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const hhmm = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  let label
  if (dtDate === nowDate)  label = 'Today'
  else if (dtDate === yestDate) label = 'Yest'
  else label = DAY_NAMES[dt.getDay()]
  return { ...row, date: dtDate, time: `${label} · ${hhmm}` }
}

// ── Routes ──────────────────────────────────────────────────────

// POST /api/expenses — OpenClaw adds to queue
app.post('/api/expenses', requireToken, (req, res) => {
  const { merchant, place = '', amount, cat = 'food', method = '',
          occurred_at, loc = '', note = '', source = 'email',
          source_ref = '', raw = '', confidence } = req.body

  if (!merchant || typeof merchant !== 'string') return res.status(400).json({ error: 'merchant required' })
  if (!amount || !Number.isInteger(Number(amount)) || Number(amount) <= 0)
    return res.status(400).json({ error: 'amount must be a positive integer (IDR)' })
  if (!VALID_CATS.includes(cat)) return res.status(400).json({ error: `cat must be one of: ${VALID_CATS.join(', ')}` })
  if (!occurred_at) return res.status(400).json({ error: 'occurred_at (ISO datetime) required' })

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO expenses (id, merchant, place, amount, cat, method, occurred_at, loc, note,
                          status, source, source_ref, raw, confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).run(id, merchant, place, Number(amount), cat, method, occurred_at, loc, note,
         source, source_ref, raw, confidence ?? null, now)

  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id)
  res.status(201).json(serialize(row))
})

// GET /api/expenses?status=&source=
app.get('/api/expenses', (req, res) => {
  const { status, source } = req.query
  let sql = 'SELECT * FROM expenses WHERE 1=1'
  const params = []
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (source) { sql += ' AND source = ?'; params.push(source) }
  sql += ' ORDER BY occurred_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json(rows.map(serialize))
})

// GET /api/expenses/:id
app.get('/api/expenses/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(serialize(row))
})

// PATCH /api/expenses/:id — confirm / reject / edit
app.patch('/api/expenses/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })

  const allowedFields = ['merchant','place','amount','cat','method','occurred_at','loc','note','status']
  const updates = {}
  for (const f of allowedFields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f]
  }
  if (updates.cat && !VALID_CATS.includes(updates.cat))
    return res.status(400).json({ error: `cat must be one of: ${VALID_CATS.join(', ')}` })
  if (updates.status && !['pending','confirmed','rejected'].includes(updates.status))
    return res.status(400).json({ error: 'invalid status' })

  const wasReviewed = row.status !== 'pending'
  const nowReviewed = updates.status && updates.status !== 'pending'
  if (nowReviewed && !wasReviewed) updates.reviewed_at = new Date().toISOString()

  if (Object.keys(updates).length === 0) return res.json(serialize(row))

  const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE expenses SET ${cols} WHERE id = ?`).run(...Object.values(updates), req.params.id)

  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)
  res.json(serialize(updated))
})

// GET /api/stats?month=YYYY-MM
app.get('/api/stats', (req, res) => {
  const month = req.query.month || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 7)
  const prefix = month + '%'

  const confirmed = db.prepare(
    "SELECT * FROM expenses WHERE status = 'confirmed' AND occurred_at LIKE ?"
  ).all(prefix)

  const total = confirmed.reduce((s, e) => s + e.amount, 0)

  const catMap = {}
  for (const e of confirmed) {
    catMap[e.cat] = (catMap[e.cat] || 0) + e.amount
  }
  const byCategory = Object.entries(catMap)
    .map(([cat, amount]) => ({ cat, amount, pct: total ? Math.round((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)

  // Last 7 days relative to end of queried month
  const weekly = Array(7).fill(0)
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    weekly[6 - i] = confirmed
      .filter(e => e.occurred_at.startsWith(key))
      .reduce((s, e) => s + e.amount, 0)
  }
  const weeklyMax = Math.max(...weekly, 1)
  const weeklyPct = weekly.map(v => Math.round((v / weeklyMax) * 100))

  const budgetRow = db.prepare("SELECT value FROM settings WHERE key = 'budget'").get()
  const budget = budgetRow ? Number(budgetRow.value) : 5000000

  res.json({ total, budget, byCategory, weekly: weeklyPct })
})

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const obj = {}
  rows.forEach(r => { obj[r.key] = r.value })
  res.json(obj)
})

// PATCH /api/settings
app.patch('/api/settings', (req, res) => {
  const allowed = ['budget']
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  for (const k of allowed) {
    if (req.body[k] !== undefined) upsert.run(k, String(req.body[k]))
  }
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const obj = {}
  rows.forEach(r => { obj[r.key] = r.value })
  res.json(obj)
})

app.delete('/api/expenses/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  res.json({ deleted: req.params.id })
})

app.listen(PORT, () => console.log(`Ledger API on :${PORT}`))
