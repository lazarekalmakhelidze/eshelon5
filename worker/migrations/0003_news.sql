PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  agency TEXT,
  author TEXT,
  external_link TEXT,
  status TEXT DEFAULT 'active',
  application_start TEXT,
  application_end TEXT,
  metadata TEXT, -- JSON payload for any unstructured data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);
