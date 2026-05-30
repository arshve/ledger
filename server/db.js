import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { seedIfEmpty } from './seed.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dir, 'ledger.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    merchant    TEXT NOT NULL,
    place       TEXT NOT NULL DEFAULT '',
    amount      INTEGER NOT NULL,
    cat         TEXT NOT NULL DEFAULT 'food',
    method      TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL,
    loc         TEXT NOT NULL DEFAULT '',
    note        TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','confirmed','rejected')),
    source      TEXT NOT NULL DEFAULT 'manual',
    source_ref  TEXT NOT NULL DEFAULT '',
    raw         TEXT NOT NULL DEFAULT '',
    confidence  REAL,
    created_at  TEXT NOT NULL,
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS receipt_examples (
    id         TEXT PRIMARY KEY,
    merchant   TEXT NOT NULL,
    image_hash TEXT NOT NULL,
    fields     TEXT NOT NULL,
    raw_mimo   TEXT NOT NULL DEFAULT '',
    hit_count  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_receipt_merchant ON receipt_examples(merchant);
`)

const hasSetting = db.prepare('SELECT 1 FROM settings WHERE key = ?')
if (!hasSetting.get('budget')) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('budget', '5000000')").run()
}

seedIfEmpty(db)

export default db
