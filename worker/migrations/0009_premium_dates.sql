-- Migration 0009_premium_dates.sql
-- Add premium start and expiry dates to users table

ALTER TABLE users ADD COLUMN premium_starts_at TEXT;
ALTER TABLE users ADD COLUMN premium_expiry TEXT;
