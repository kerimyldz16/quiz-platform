CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  finished_at TIMESTAMP NULL,
  duration_ms INT NULL
);
