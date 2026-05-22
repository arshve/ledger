// Initial sample expenses — seeded once when DB is empty.
// All dates are relative to today so the data is always fresh on first run.

function daysAgo(n, hour = 12, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  // Format as local Jakarta ISO string
  const pad = v => String(v).padStart(2, '0')
  const tz  = '+07:00'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}:00${tz}`
}

function makeSeed() {
  return [
    // ── Pending (needs review) ──────────────────────────────────
    {
      id: 'e1', merchant: 'Gojek', place: 'Padang Sederhana', amount: 47500,
      cat: 'food', method: 'BCA •• 4827', occurred_at: daysAgo(1, 12, 32),
      loc: 'Menteng, Jakarta', note: '', status: 'pending', source: 'email',
      source_ref: 'noreply@bca.co.id',
      raw: 'Bank BCA — Notifikasi Transaksi\n\nMerchant: GOJEK\nNominal: Rp 47.500\nKartu: BCA Debit ••4827\n\nJika Anda tidak mengenali transaksi ini, hubungi Halo BCA 1500888.',
    },
    {
      id: 'e2', merchant: 'Tokopedia', place: 'Order INV/26-AX91', amount: 235000,
      cat: 'shopping', method: 'GoPay', occurred_at: daysAgo(1, 10, 14),
      loc: 'Online', note: '', status: 'pending', source: 'email',
      source_ref: 'orders@tokopedia.com',
      raw: 'Pesanan INV/26-AX91 dikonfirmasi\n\nTotal Pembayaran: Rp 235.000\nMetode: GoPay\nStatus: Menunggu konfirmasi',
    },
    {
      id: 'e3', merchant: 'Starbucks', place: 'Plaza Indonesia', amount: 65000,
      cat: 'coffee', method: 'BCA •• 4827', occurred_at: daysAgo(1, 9, 2),
      loc: 'Thamrin, Jakarta', note: '', status: 'pending', source: 'email',
      source_ref: 'noreply@bca.co.id',
      raw: 'Bank BCA — Notifikasi Transaksi\n\nMerchant: STARBUCKS PLAZA INDONESIA\nNominal: Rp 65.000\nKartu: BCA Debit ••4827',
    },
    {
      id: 'e4', merchant: 'Grab', place: 'Trip to Sudirman', amount: 22500,
      cat: 'transport', method: 'OVO', occurred_at: daysAgo(2, 19, 48),
      loc: '', note: '', status: 'pending', source: 'email',
      source_ref: 'receipt@grab.com',
      raw: 'Your Grab receipt\n\nService: GrabCar\nRoute: Menteng → Sudirman\nTotal: Rp 22.500\nPayment: OVO',
    },
    {
      id: 'e5', merchant: 'Indomaret', place: 'Cikini', amount: 28750,
      cat: 'groceries', method: 'BCA •• 4827', occurred_at: daysAgo(2, 17, 22),
      loc: 'Cikini, Jakarta', note: '', status: 'pending', source: 'email',
      source_ref: 'noreply@bca.co.id',
      raw: 'Bank BCA — Notifikasi Transaksi\n\nMerchant: INDOMARET CIKINI\nNominal: Rp 28.750\nKartu: BCA Debit ••4827',
    },
    // ── Confirmed (already reviewed) ───────────────────────────
    {
      id: 'e6', merchant: 'Shopee', place: '4 items', amount: 189000,
      cat: 'shopping', method: 'ShopeePay', occurred_at: daysAgo(3, 21, 11),
      loc: 'Online', note: '', status: 'confirmed', source: 'email',
      source_ref: 'noreply@shopee.co.id',
      raw: 'Pesanan Shopee berhasil dibayar\n\nTotal: Rp 189.000\nMetode: ShopeePay\nJumlah item: 4',
    },
    {
      id: 'e7', merchant: 'Netflix', place: 'Monthly subscription', amount: 169000,
      cat: 'subscription', method: 'BCA •• 4827', occurred_at: daysAgo(3, 4, 0),
      loc: '', note: '', status: 'confirmed', source: 'email',
      source_ref: 'noreply@bca.co.id',
      raw: 'Bank BCA — Notifikasi Transaksi\n\nMerchant: NETFLIX.COM\nNominal: Rp 169.000\nKartu: BCA Debit ••4827',
    },
    {
      id: 'e8', merchant: 'PLN', place: 'Electricity bill', amount: 425000,
      cat: 'utility', method: 'BCA •• 4827', occurred_at: daysAgo(4, 8, 30),
      loc: '', note: '', status: 'confirmed', source: 'email',
      source_ref: 'noreply@bca.co.id',
      raw: 'Bank BCA — Notifikasi Transaksi\n\nMerchant: PLN PREPAID\nNominal: Rp 425.000\nKartu: BCA Debit ••4827',
    },
    {
      id: 'e9', merchant: 'Tiket.com', place: 'CGK → DPS', amount: 1250000,
      cat: 'travel', method: 'BCA •• 4827', occurred_at: daysAgo(5, 14, 11),
      loc: '', note: '', status: 'confirmed', source: 'email',
      source_ref: 'noreply@bca.co.id',
      raw: 'Bank BCA — Notifikasi Transaksi\n\nMerchant: TIKET.COM\nNominal: Rp 1.250.000\nKartu: BCA Debit ••4827\n\nFlight: CGK → DPS',
    },
    {
      id: 'e10', merchant: 'Sari Ratu', place: 'Dinner for 2', amount: 178000,
      cat: 'food', method: 'Cash', occurred_at: daysAgo(6, 20, 5),
      loc: '', note: '', status: 'confirmed', source: 'manual',
      source_ref: '', raw: '',
    },
  ]
}

export function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM expenses').get().n
  if (count > 0) return

  const now    = new Date().toISOString()
  const insert = db.prepare(`
    INSERT INTO expenses
      (id, merchant, place, amount, cat, method, occurred_at, loc, note,
       status, source, source_ref, raw, created_at)
    VALUES
      (@id, @merchant, @place, @amount, @cat, @method, @occurred_at, @loc, @note,
       @status, @source, @source_ref, @raw, @created_at)
  `)
  const insertMany = db.transaction(rows => rows.forEach(r => insert.run({ ...r, created_at: now })))
  insertMany(makeSeed())
  console.log('Seeded 10 sample expenses.')
}
