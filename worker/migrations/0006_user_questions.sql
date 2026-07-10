-- Migration 0006_user_questions.sql
-- Create table for user-specific question banks

CREATE TABLE IF NOT EXISTS user_questions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_text TEXT,
    choices TEXT,
    correct_answer TEXT,
    explanation TEXT,
    category TEXT,
    subject TEXT,
    difficulty INTEGER,
    created_at TEXT,
    updated_at TEXT,
    catalogs TEXT,
    skill TEXT,
    exam_year TEXT,
    exam_set TEXT
);
