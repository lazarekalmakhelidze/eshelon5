-- Migration for Admin Reports and Room Assets

-- Table for user reports (reported_content)
CREATE TABLE IF NOT EXISTS reported_content (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table for room assets (backgrounds, etc.)
CREATE TABLE IF NOT EXISTS room_assets (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'background',
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_premium INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
