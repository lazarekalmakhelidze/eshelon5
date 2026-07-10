PRAGMA foreign_keys = OFF;

ALTER TABLE rooms ADD COLUMN tutor_submode TEXT;
ALTER TABLE rooms ADD COLUMN custom_questions TEXT;

ALTER TABLE room_participants ADD COLUMN nickname TEXT;

CREATE TABLE exam_results_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  classroom_id TEXT,
  score INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  mode TEXT NOT NULL,
  subject_scores TEXT,
  skill_scores TEXT,
  questions TEXT,
  time_taken INTEGER NOT NULL,
  taken_at TEXT NOT NULL,
  rating INTEGER,
  feedback_comment TEXT,
  created_at TEXT,
  updated_at TEXT
);

INSERT INTO exam_results_new (
  id,
  user_id,
  classroom_id,
  score,
  total_score,
  mode,
  subject_scores,
  skill_scores,
  questions,
  time_taken,
  taken_at,
  rating,
  feedback_comment,
  created_at,
  updated_at
)
SELECT
  CAST(id AS TEXT),
  CAST(user_id AS TEXT),
  CAST(classroom_id AS TEXT),
  score,
  total_score,
  mode,
  subject_scores,
  skill_scores,
  questions,
  time_taken,
  taken_at,
  rating,
  feedback_comment,
  taken_at,
  taken_at
FROM exam_results;

DROP TABLE exam_results;
ALTER TABLE exam_results_new RENAME TO exam_results;

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_host_user_id ON rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_user ON room_participants(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id_text ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_taken_at ON exam_results(taken_at DESC);

PRAGMA foreign_keys = ON;
