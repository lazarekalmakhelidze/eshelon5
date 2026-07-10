ALTER TABLE businesses ADD COLUMN balance REAL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN total_spent REAL DEFAULT 0;
CREATE TABLE IF NOT EXISTS ads (id TEXT PRIMARY KEY, business_id TEXT, title TEXT, content TEXT, image_url TEXT, target_url TEXT, placement TEXT, budget REAL, cpc REAL, status TEXT, max_views INTEGER, views INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS ad_transactions (id TEXT PRIMARY KEY, business_id TEXT, amount REAL, type TEXT, reason TEXT, created_at TEXT);
