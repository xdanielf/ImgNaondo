CREATE TABLE IF NOT EXISTS images (
  key TEXT PRIMARY KEY,
  originalName TEXT,
  customName TEXT,
  uploadTime TEXT,
  size INTEGER,
  tags TEXT,
  contentType TEXT
);

CREATE INDEX IF NOT EXISTS idx_uploadTime ON images(uploadTime DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  fails INTEGER DEFAULT 0,
  last_attempt INTEGER
);