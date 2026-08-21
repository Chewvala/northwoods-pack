-- v0.4: the Shelf, open loops held by the harness instead of the person's head.
-- The ADHD reality this serves: hyperfocus ends, life interrupts, and every other
-- tool charges guilt-interest on the way back in. Loops here are parked, not owed.
-- No due dates by design. Nothing in this table can nag.
CREATE TABLE IF NOT EXISTS loops (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open | done | released
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_loops_status ON loops(status, created_at DESC);
