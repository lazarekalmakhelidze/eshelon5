-- Migration 0005_phase2_3.sql
-- Phase 2 & 3: Users, Exams, Social, Billing, Logging

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    password_hash TEXT,
    display_name TEXT,
    avatar TEXT,
    role TEXT,
    plan_type TEXT,
    status TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_active_at TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    action TEXT,
    user_id TEXT,
    details TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS exam_rooms (
    id TEXT PRIMARY KEY,
    title TEXT,
    host_id TEXT,
    type TEXT,
    config TEXT,
    status TEXT,
    season_id TEXT,
    is_private INTEGER DEFAULT 0,
    password TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS exam_room_participants (
    id TEXT PRIMARY KEY,
    room_id TEXT,
    user_id TEXT,
    score INTEGER DEFAULT 0,
    time_taken INTEGER DEFAULT 0,
    joined_at TEXT,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS exam_results (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    room_id TEXT,
    score INTEGER,
    total_questions INTEGER,
    time_taken INTEGER,
    season_id TEXT,
    taken_at TEXT
);

CREATE TABLE IF NOT EXISTS rankings (
    id TEXT PRIMARY KEY,
    season_id TEXT,
    user_id TEXT,
    total_score INTEGER DEFAULT 0,
    exams_taken INTEGER DEFAULT 0,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    subject TEXT,
    status TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT,
    sender_id TEXT,
    message TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    question_id TEXT,
    note TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT,
    sender_id TEXT,
    text TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    title TEXT,
    content TEXT,
    category TEXT,
    likes INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    thread_id TEXT,
    author_id TEXT,
    content TEXT,
    likes INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    user_id1 TEXT,
    user_id2 TEXT,
    status TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    plan_id TEXT,
    amount INTEGER,
    status TEXT,
    session_id TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS payment_plans (
    id TEXT PRIMARY KEY,
    name TEXT,
    price INTEGER,
    duration_days INTEGER,
    features TEXT,
    created_at TEXT,
    updated_at TEXT
);
