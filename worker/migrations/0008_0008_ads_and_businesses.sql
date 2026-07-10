CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT,
  title TEXT,
  description TEXT,
  image_url TEXT,
  target_url TEXT,
  status TEXT,
  placement TEXT,
  budget REAL,
  spent REAL DEFAULT 0,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ad_metrics (
  id TEXT PRIMARY KEY,
  ad_id TEXT,
  type TEXT,
  cost REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS sponsor_transactions (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT,
  amount REAL,
  type TEXT,
  status TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS ad_transactions (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  amount REAL,
  type TEXT,
  reason TEXT,
  created_at TEXT
);
