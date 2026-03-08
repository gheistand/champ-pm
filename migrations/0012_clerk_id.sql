ALTER TABLE users ADD COLUMN clerk_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE clerk_id IS NOT NULL;
