ALTER TABLE questions ADD COLUMN catalogs TEXT;
ALTER TABLE questions ADD COLUMN skill TEXT;
ALTER TABLE questions ADD COLUMN exam_year TEXT;
ALTER TABLE questions ADD COLUMN exam_set TEXT;

ALTER TABLE bookmarks ADD COLUMN target_type TEXT;
ALTER TABLE bookmarks ADD COLUMN target_id TEXT;
ALTER TABLE bookmarks ADD COLUMN title TEXT;

ALTER TABLE comments ADD COLUMN user_id TEXT;
ALTER TABLE comments ADD COLUMN parent_id TEXT;

ALTER TABLE friends ADD COLUMN requester_id TEXT;
ALTER TABLE friends ADD COLUMN target_id TEXT;

ALTER TABLE messages ADD COLUMN receiver_id TEXT;
ALTER TABLE messages ADD COLUMN content TEXT;
ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0;

ALTER TABLE payment_plans ADD COLUMN description TEXT;
ALTER TABLE payment_plans ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE payment_plans ADD COLUMN display_order INTEGER DEFAULT 0;

ALTER TABLE threads ADD COLUMN user_id TEXT;
ALTER TABLE threads ADD COLUMN tags TEXT;
ALTER TABLE threads ADD COLUMN background_style TEXT;
ALTER TABLE threads ADD COLUMN image_url TEXT;
ALTER TABLE threads ADD COLUMN views INTEGER DEFAULT 0;
ALTER TABLE threads ADD COLUMN stats TEXT;
ALTER TABLE threads ADD COLUMN deleted_at TEXT;

ALTER TABLE tickets ADD COLUMN ticket_id TEXT;
ALTER TABLE tickets ADD COLUMN description TEXT;
ALTER TABLE tickets ADD COLUMN category TEXT;

ALTER TABLE transactions ADD COLUMN payment_method TEXT;
ALTER TABLE transactions ADD COLUMN type TEXT;


CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  message TEXT,
  type TEXT,
  is_read INTEGER DEFAULT 0,
  data TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  plan_id TEXT,
  transaction_id TEXT,
  amount REAL,
  payment_method TEXT,
  status TEXT,
  metadata TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT,
  subject TEXT,
  email TEXT,
  name TEXT,
  message TEXT,
  content TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  owner_uid TEXT,
  name TEXT,
  tagline TEXT,
  about TEXT,
  category TEXT,
  contact_link TEXT,
  contact_line_id TEXT,
  contact_facebook_url TEXT,
  status TEXT,
  logo_image TEXT,
  stats TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS business_posts (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  content TEXT,
  image_url TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS news_sources (
  id TEXT PRIMARY KEY,
  name TEXT,
  url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_year_set ON questions(subject, exam_year, exam_set);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_target ON bookmarks(user_id, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_uid ON businesses(owner_uid);
CREATE INDEX IF NOT EXISTS idx_business_posts_business_id ON business_posts(business_id);
