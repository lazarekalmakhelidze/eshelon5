CREATE TABLE IF NOT EXISTS exam_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_korpor_format INTEGER DEFAULT 0,
  education_level TEXT,
  passing_criteria TEXT,
  time_limit_minutes INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_sets_name ON exam_sets(name);
