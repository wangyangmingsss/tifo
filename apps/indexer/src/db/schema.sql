-- TIFO Indexer Database Schema
-- Indexes 7 on-chain events into queryable tables

-- Track indexer cursor
CREATE TABLE IF NOT EXISTS indexer_state (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- FactionJoined events
CREATE TABLE IF NOT EXISTS faction_joins (
  id            SERIAL PRIMARY KEY,
  user_address  TEXT NOT NULL,
  faction_id    SMALLINT NOT NULL,
  is_switch     BOOLEAN NOT NULL DEFAULT FALSE,
  block_number  BIGINT NOT NULL,
  tx_hash       TEXT NOT NULL,
  log_index     INT NOT NULL,
  timestamp     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- RallyPlaced events
CREATE TABLE IF NOT EXISTS rallies (
  id              SERIAL PRIMARY KEY,
  user_address    TEXT NOT NULL,
  region_id       SMALLINT NOT NULL,
  faction_id      SMALLINT NOT NULL,
  raw_amount      TEXT NOT NULL,
  effective_power TEXT NOT NULL,
  new_faction_power TEXT NOT NULL,
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INT NOT NULL,
  timestamp       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- TerritoryCaptured events
CREATE TABLE IF NOT EXISTS captures (
  id              SERIAL PRIMARY KEY,
  region_id       SMALLINT NOT NULL,
  old_faction     SMALLINT NOT NULL,
  new_faction     SMALLINT NOT NULL,
  capture_count   SMALLINT NOT NULL,
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INT NOT NULL,
  timestamp       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- Defected events
CREATE TABLE IF NOT EXISTS defections (
  id              SERIAL PRIMARY KEY,
  user_address    TEXT NOT NULL,
  region_id       SMALLINT NOT NULL,
  from_faction    SMALLINT NOT NULL,
  to_faction      SMALLINT NOT NULL,
  converted_power TEXT NOT NULL,
  finder_reward   TEXT NOT NULL,
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INT NOT NULL,
  timestamp       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- MatchEventPushed events
CREATE TABLE IF NOT EXISTS match_events (
  id              SERIAL PRIMARY KEY,
  event_id        INT NOT NULL,
  faction_id      SMALLINT NOT NULL,
  event_type      SMALLINT NOT NULL,
  regions         SMALLINT[] NOT NULL,
  boost_applied   TEXT NOT NULL,
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INT NOT NULL,
  timestamp       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- RewardClaimed events
CREATE TABLE IF NOT EXISTS reward_claims (
  id              SERIAL PRIMARY KEY,
  user_address    TEXT NOT NULL,
  region_id       SMALLINT NOT NULL,
  faction_id      SMALLINT NOT NULL,
  amount          TEXT NOT NULL,
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INT NOT NULL,
  timestamp       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- SeasonSettled events
CREATE TABLE IF NOT EXISTS season_settled (
  id              SERIAL PRIMARY KEY,
  total_score     TEXT NOT NULL,
  total_pool      TEXT NOT NULL,
  block_number    BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INT NOT NULL,
  timestamp       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_faction_joins_user ON faction_joins(user_address);
CREATE INDEX IF NOT EXISTS idx_faction_joins_faction ON faction_joins(faction_id);
CREATE INDEX IF NOT EXISTS idx_rallies_region ON rallies(region_id);
CREATE INDEX IF NOT EXISTS idx_rallies_faction ON rallies(faction_id);
CREATE INDEX IF NOT EXISTS idx_rallies_user ON rallies(user_address);
CREATE INDEX IF NOT EXISTS idx_rallies_block ON rallies(block_number);
CREATE INDEX IF NOT EXISTS idx_captures_region ON captures(region_id);
CREATE INDEX IF NOT EXISTS idx_captures_block ON captures(block_number);
CREATE INDEX IF NOT EXISTS idx_defections_region ON defections(region_id);
CREATE INDEX IF NOT EXISTS idx_defections_user ON defections(user_address);
CREATE INDEX IF NOT EXISTS idx_match_events_faction ON match_events(faction_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON reward_claims(user_address);
CREATE INDEX IF NOT EXISTS idx_reward_claims_faction ON reward_claims(faction_id);
