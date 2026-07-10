CREATE TABLE IF NOT EXISTS arcade_games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    game_url TEXT,
    internal_component TEXT,
    mode TEXT DEFAULT 'both',
    is_active INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Game (Memory Match)
INSERT INTO arcade_games (id, title, description, thumbnail_url, game_url, internal_component, mode, is_active, order_index)
VALUES (
    lower(hex(randomblob(16))),
    'Memory Match (จับคู่ความจำ)',
    'ฝึกสมองประลองปัญญากับเกมจับคู่สุดคลาสสิค',
    'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?q=80&w=600&auto=format&fit=crop',
    '/games/memory-match/index.html',
    '',
    'solo',
    1,
    1
);
