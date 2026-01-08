CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nick_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  finished_at TIMESTAMP NULL,
  duration_ms INT NULL
);
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct TEXT NOT NULL,
  order_index INT NOT NULL UNIQUE
);
