CREATE TABLE IF NOT EXISTS substrate_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_type ON substrate_entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_created ON substrate_entries(created_at DESC);
