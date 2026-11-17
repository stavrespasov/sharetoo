CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS sharetoo_demo (
  name text PRIMARY KEY,
  state jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS sharetoo_allocations (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL,
  occupied tstzrange NOT NULL,
  EXCLUDE USING gist (vehicle_id WITH =, occupied WITH &&)
);

CREATE TABLE IF NOT EXISTS sharetoo_demo_media (
  id uuid PRIMARY KEY,
  content_type text NOT NULL,
  data bytea NOT NULL
);

CREATE TABLE IF NOT EXISTS sharetoo_demo_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
