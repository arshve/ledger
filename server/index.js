import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import db from './db.js'

const app  = express()
const PORT = process.env.LEDGER_PORT || 3001
const TOKEN = process.env.API_TOKEN
const __dir = dirname(fileURLToPath(import.meta.url))

// Persistent scan log
const SCAN_LOG = '/data/.openclaw/workspace/logs/ledger-scan.log'
function slog(...args) {
  const ts = new Date().toISOString().slice(11, 19)
  const line = `[${ts}] ${args.join(' ')}`
  console.log(line)
  try { fs.appendFileSync(SCAN_LOG, line + '\n') } catch {}
}

const distDir = join(__dir, '..', 'dist')
app.use(express.static(distDir, {
  setHeaders(res, path) {
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    } else if (path.endsWith('.js') || path.endsWith('.css')) {
      res.set('Cache-Control', 'public, max-age=0, must-revalidate')
    }
  }
}))

app.use(express.json({ limit: '10mb' }))

// ── Auth middleware (OpenClaw writes only) ──────────────────────
function requireToken(req, res, next) {
  if (!TOKEN) return res.status(500).json({ error: 'API_TOKEN not set in .env' })
  const auth = req.headers['authorization'] || ''
  if (auth !== `Bearer ${TOKEN}`) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// ── Serializer: add derived time/date fields ────────────────────
const VALID_CATS = ['food','shopping','coffee','transport','subscription','utility','travel','groceries','sport','general']
const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function decodeHtmlEntities(str) {
  if (!str) return str
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function serialize(row) {
  if (!row) return null
  const dt   = new Date(row.occurred_at)
  const now  = new Date()
  const dtDate = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const nowDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const yestDate = new Date(now - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const hhmm = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false }).replace(/[^0-9:]/g, '')
  let label
  if (dtDate === nowDate)  label = 'Today'
  else if (dtDate === yestDate) label = 'Yest'
  else label = DAY_NAMES[dt.getDay()]
  return { ...row, merchant: decodeHtmlEntities(row.merchant), place: decodeHtmlEntities(row.place), note: decodeHtmlEntities(row.note), date: dtDate, time: `${label} · ${hhmm}` }
}

// ── Receipt scan via MiMo vision ────────────────────────────────
const MIMO_KEY = process.env.MIMO_API_KEY
const VALID_METHODS = ['BCA','JENIUS','JAGO','GOPAY','OVO','DANA','SHOPEEPAY','CASH','QRIS','OTHER']

// ── Helpers: image hash (simple hash of base64 prefix for similarity lookup) ─
function imagePrefixHash(b64) {
  // Use first 500 chars as a fingerprint to find similar layouts
  let hash = 0
  const s = b64.slice(0, 500)
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function getSimilarReceipts(hash, maxCount = 3) {
  // Find receipts with same hash (same layout) or same merchant from confirmed scans
  return db.prepare(`
    SELECT e.merchant, e.amount, e.cat, e.method, e.place, e.raw
    FROM expenses e
    WHERE e.status = 'confirmed' AND e.source = 'scan'
      AND (e.id IN (SELECT id FROM receipt_examples WHERE image_hash = ?) OR e.merchant IN (
        SELECT r.merchant FROM receipt_examples r WHERE r.image_hash = ?
      ))
    ORDER BY e.reviewed_at DESC
    LIMIT ?
  `).all(hash, hash, maxCount)
}

app.post('/api/expenses/scan', async (req, res) => {
  const { image } = req.body
  if (!image || typeof image !== 'string') return res.status(400).json({ error: 'base64 image required' })

  const dataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
  const imgHash = imagePrefixHash(image)

  // Build few-shot examples from previously confirmed scans with similar layout
  const similar = getSimilarReceipts(imgHash)
  let examplesBlock = ''
  if (similar.length > 0) {
    examplesBlock = '\n\nHere are examples of receipt data you have extracted from similar receipts in the past (use these as reference for format/layout):\n'
    for (const ex of similar) {
      examplesBlock += ex.raw + '\n---\n'
    }
  }

  const PROMPT_BASE = 'Analyze this image. Respond with ONLY JSON. If single receipt: {"merchant":"...","amount":integer,"date":"YYYY-MM-DD","time":"HH:MM","method":"BCA/JENIUS/JAGO/GOPAY","cat":"food/shopping/transport/general","place":""}. If transaction list: JSON array [{merchant,amount(negative integer for debit,skip positive credits),date,method,cat}]. No other text.'
  const PROMPT = PROMPT_BASE + examplesBlock

  try {
    // AbortController disabled — Node 24 has issues with long-running AbortSignal on MiMo
    slog('Sending to MiMo...')

    const mimoRes = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MIMO_KEY}`
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        messages: [
          { role: 'user', content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]}
        ],
        max_tokens: 4096
      })
    })

    slog(`MiMo status ${mimoRes.status}`)

    if (!mimoRes.ok) {
      const errBody = await mimoRes.text()
      slog(`MiMo API error ${mimoRes.status}:`, errBody.slice(0, 300))
      return res.status(502).json({ error: 'Vision API failed', detail: errBody.slice(0, 200) })
    }

    const txt = await mimoRes.text()
    slog(`MiMo body ${txt.length} chars, preview: ${txt.slice(0, 200)}`)

    let mimoData, rawContent = ''
    try {
      mimoData = JSON.parse(txt)
      rawContent = mimoData.choices?.[0]?.message?.content || ''
    } catch (e) {
      slog(`JSON parse error: ${e.message}`)
    }

    if (!rawContent || rawContent.length < 5) {
      slog('Empty response — retrying with short prompt...')
      const retryRes = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MIMO_KEY}` },
        body: JSON.stringify({
          model: 'mimo-v2.5',
          messages: [{ role: 'user', content: [
            { type: 'text', text: 'List all transactions as JSON array. Each: merchant, amount (negative integer), date. JSON ONLY.\n' + examplesBlock },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]}],
          max_tokens: 1024
        })
      })
      if (retryRes.ok) {
        const retryTxt = await retryRes.text()
        try {
          const retryData = JSON.parse(retryTxt)
          const retryC = retryData.choices?.[0]?.message?.content || ''
          if (retryC.length > 5) { rawContent = retryC; slog('Retry OK') }
        } catch {}
      }
    }

    // Parse JSON from response
    let parsed = null
    const firstChar = rawContent.trim()[0]
    if (firstChar === '{') {
      let depth = 0, endIdx = -1
      for (let i = rawContent.indexOf('{'); i < rawContent.length; i++) {
        if (rawContent[i] === '{') depth++
        else if (rawContent[i] === '}') { depth--; if (depth === 0) { endIdx = i; break } }
      }
      if (endIdx >= 0) try { parsed = JSON.parse(rawContent.slice(rawContent.indexOf('{'), endIdx + 1)) } catch {}
    } else if (firstChar === '[') {
      let depth = 0, endIdx = -1
      for (let i = rawContent.indexOf('['); i < rawContent.length; i++) {
        if (rawContent[i] === '[') depth++
        else if (rawContent[i] === ']') { depth--; if (depth === 0) { endIdx = i; break } }
      }
      if (endIdx >= 0) try { parsed = JSON.parse(rawContent.slice(rawContent.indexOf('['), endIdx + 1)) } catch {}
    }
    if (!parsed) {
      const cleaned = rawContent.replace(/```(?:json)?/g, '').trim()
      try { parsed = JSON.parse(cleaned) } catch {}
    }
    if (!parsed && rawContent.trim() === 'null') {
      slog('NON-RECEIPT: model returned null')
      return res.status(422).json({ error: 'This does not appear to be a receipt or payment screenshot.' })
    }

    const lower = rawContent.toLowerCase()
    const notReceiptKeywords = ['not a receipt', 'not a payment', 'is not a receipt', 'this image shows', 'this is not', 'i cannot', 'the image provided', 'the image depicts', 'the photo shows']
    const isNonReceipt = notReceiptKeywords.some(k => lower.includes(k))

    if (!parsed) {
      let hint = 'The receipt scanner could not understand the image format.'
      if (isNonReceipt) hint = 'This does not appear to be a receipt or payment screenshot.'
      slog('PARSE FAILED ->', hint, '| raw:', rawContent.slice(0, 200))
      return res.status(422).json({ error: hint })
    }

    const items = Array.isArray(parsed) ? parsed : [parsed]
    const wasSingle = !Array.isArray(parsed)
    if (items.length === 0) return res.status(422).json({ error: 'No transactions found in image.' })

    const validItems = items.filter(i => i && i.merchant && i.amount)
    if (validItems.length === 0) {
      if (isNonReceipt) return res.status(422).json({ error: 'This does not appear to be a receipt or payment screenshot.' })
      return res.status(422).json({ error: 'Could not extract any valid transaction from image.' })
    }

    const now = new Date().toISOString()
    const rawPreview = rawContent.slice(0, 2000)
    const inserted = []

    for (const item of validItems) {
      const merchant = String(item.merchant).trim()
      let rawNum = Number(String(item.amount).replace(/[,.\s]/g, ''))
      if (!wasSingle && rawNum > 0) continue
      const amount = Math.round(Math.abs(rawNum))
      if (!merchant || amount <= 0) continue
      const lowerM = merchant.toLowerCase()
      if (lowerM.includes('main pocket') || lowerM.includes('daily money') || lowerM === 'transfer') continue

      const cat = VALID_CATS.includes(item.cat) ? item.cat : 'general'
      const method = item.method ? String(item.method).toUpperCase().trim() : ''
      function normalizeDate(s) { if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const d = new Date(s); return isNaN(d.getTime()) ? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) : d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) }
      const dateStr = normalizeDate(item.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
      const timeStr = (item.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })).replace(/[^0-9:]/g, '')
      const occurredAt = `${dateStr}T${timeStr}:00+07:00`

      const id = crypto.randomUUID()

      db.prepare(`
        INSERT INTO expenses (id, merchant, place, amount, cat, method, occurred_at, loc, note,
                              status, source, source_ref, raw, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'scan', ?, ?, ?, ?)
      `).run(id, merchant, item.place || '', amount, cat, method,
             occurredAt, '', item.note || '',
             ``, rawPreview, 0.7, now)

      inserted.push(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id))

      // Store receipt example
      const fieldsJSON = JSON.stringify({ merchant, amount, cat, method, place: item.place || '', note: item.note || '', date: dateStr, time: timeStr })
      const exId = `${merchant.toLowerCase().slice(0, 20)}_${imgHash}`
      db.prepare(`
        INSERT INTO receipt_examples (id, merchant, image_hash, fields, raw_mimo, hit_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET hit_count = hit_count + 1, updated_at = excluded.updated_at
      `).run(exId, merchant.toLowerCase(), imgHash, fieldsJSON, rawPreview, now, now)
    }

    slog(`Inserted ${inserted.length} expenses from batch scan`)
    res.status(201).json(inserted.map(serialize))

  } catch (e) {
    console.error('Scan error:', e)
    res.status(500).json({ error: e.message })
  }
})

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

  const allowedFields = ['merchant','place','amount','cat','method','occurred_at','loc','note','status','source','source_ref']
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

// SPA fallback — all non-API GET routes serve the frontend
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(join(distDir, 'index.html'))
  } else {
    next()
  }
})

app.listen(PORT, () => console.log(`Ledger API on :${PORT}`))
