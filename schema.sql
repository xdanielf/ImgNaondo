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
