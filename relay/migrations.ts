import { getDb } from "./db";

const db = getDb();

const createCommentsTable = `CREATE TABLE IF NOT EXISTS comments (
    event_id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL,
    pubkey TEXT NOT NULL,
    r TEXT NOT NULL,
    json TEXT NOT NULL
);`;

db.run(createCommentsTable);

db.run(`CREATE INDEX IF NOT EXISTS idx_r ON comments("r")`);
db.run(`CREATE INDEX IF NOT EXISTS idx_pubkey ON comments("pubkey")`);
db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON comments("created_at")`);

const createReceiptsTable = `CREATE TABLE IF NOT EXISTS receipts (
  event_id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  p TEXT NOT NULL,
  bolt11 TEXT NOT NULL,
  json TEXT NOT NULL
);`;

db.run(createReceiptsTable);

db.run(`CREATE INDEX IF NOT EXISTS idx_p ON receipts("p")`);
db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON receipts("created_at")`);
db.run(`CREATE INDEX IF NOT EXISTS idx_bolt11 ON receipts("bolt11")`);

const createHighlightsTable = `CREATE TABLE IF NOT EXISTS highlights (
  event_id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  pubkey TEXT NOT NULL,
  r TEXT NOT NULL,
  json TEXT NOT NULL
);`;

db.run(createHighlightsTable);

db.run(`CREATE INDEX IF NOT EXISTS idx_r ON highlights("r")`);
db.run(`CREATE INDEX IF NOT EXISTS idx_pubkey ON highlights("pubkey")`);
db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON highlights("created_at")`);
