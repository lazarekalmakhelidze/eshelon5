-- Migration 0004_phase1.sql
-- Create tables for questions, system_config, system_settings, and seasons

-- 1. questions
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    question_text TEXT,
    choices TEXT, -- JSON string
    correct_answer TEXT,
    explanation TEXT,
    category TEXT,
    subject TEXT,
    difficulty INTEGER,
    is_custom INTEGER DEFAULT 0,
    host_user_id TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 2. system_config
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    value TEXT -- JSON string containing the config details
);

-- 3. system_settings
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    value TEXT -- JSON string containing the settings
);

-- 4. seasons
CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT,
    responsible_admin_id TEXT,
    created_at TEXT,
    updated_at TEXT
);
