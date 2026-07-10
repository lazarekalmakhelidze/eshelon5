PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('exam', 'tutor', 'event')),
  host_user_id INTEGER NOT NULL,
  subject TEXT,
  category TEXT,
  max_participants INTEGER NOT NULL DEFAULT 50,
  question_count INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  settings TEXT,
  password TEXT,
  question_ids TEXT,
  theme TEXT,
  theme_color TEXT,
  background_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS room_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'ready', 'finished')),
  current_question_index INTEGER NOT NULL DEFAULT 0,
  answers TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  classroom_id INTEGER,
  score INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'simulation', 'classroom')),
  subject_scores TEXT,
  skill_scores TEXT,
  questions TEXT,
  time_taken INTEGER NOT NULL,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  rating INTEGER,
  feedback_comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
