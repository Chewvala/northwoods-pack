-- v0.3: the identity layer (Layer-3 "prompt identity") + intake provenance.
-- Derived from the operator arc this pack generalizes: the first things a person
-- needs their AI to hold are who they are, their decision principles, and how
-- to speak to them, before any memory store matters.
CREATE TABLE IF NOT EXISTS identity_fields (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'interview',
  updated_at INTEGER NOT NULL
);
