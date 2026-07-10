-- Migration 0006_fix_users.sql
-- Fix users table schema

DROP TABLE IF EXISTS users;

CREATE TABLE users (
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
