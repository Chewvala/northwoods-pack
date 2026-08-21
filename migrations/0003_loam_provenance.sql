-- v0.3.1: loam's provenance model, verbatim in principle and mostly in column.
-- (github.com/NorthwoodsSentinel/loam. "Healthy soil knows where each grain came from.")
--
--   source        where a memory came from (intake | mcp | api)
--   trust_level   untrusted | mixed | trusted. AI-carried content defaults mixed;
--                 the person's own interview answers default trusted
--   sensitivity   public | personal | memoir-class | secret, recall EXCLUDES
--                 'secret' by default; egress rules read this column, per loam's
--                 tag-now-so-rules-can-come-later doctrine
--
-- Plus loam's search layer: FTS5 over memory bodies, replacing LIKE.
ALTER TABLE substrate_entries ADD COLUMN source TEXT NOT NULL DEFAULT 'api';
ALTER TABLE substrate_entries ADD COLUMN trust_level TEXT NOT NULL DEFAULT 'mixed';
ALTER TABLE substrate_entries ADD COLUMN sensitivity TEXT NOT NULL DEFAULT 'personal';

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  body,
  entry_id UNINDEXED,
  type UNINDEXED
);
INSERT INTO entries_fts (body, entry_id, type)
  SELECT body, id, type FROM substrate_entries;
