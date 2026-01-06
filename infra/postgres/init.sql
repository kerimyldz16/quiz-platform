CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  nickname TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
