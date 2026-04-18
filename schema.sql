-- Run once: wrangler d1 execute hts-db --file=schema.sql

CREATE TABLE IF NOT EXISTS dates (
  id         TEXT PRIMARY KEY,           -- ISO date, e.g. '2026-05-09'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date_id    TEXT NOT NULL,
  area       TEXT NOT NULL,
  job        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO dates (id) VALUES ('2026-05-09');
