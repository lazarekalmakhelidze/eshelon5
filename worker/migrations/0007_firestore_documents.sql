-- Generic D1 fallback store for collections that do not have dedicated tables yet

CREATE TABLE IF NOT EXISTS firestore_documents (
    collection_path TEXT NOT NULL,
    parent_path TEXT,
    doc_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT,
    PRIMARY KEY (collection_path, doc_id)
);

CREATE INDEX IF NOT EXISTS idx_firestore_documents_collection_path
    ON firestore_documents (collection_path);

CREATE INDEX IF NOT EXISTS idx_firestore_documents_parent_path
    ON firestore_documents (parent_path);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    url TEXT,
    is_premium INTEGER DEFAULT 0,
    created_at TEXT
);
