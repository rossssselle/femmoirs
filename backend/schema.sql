CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  pseudo_user_id TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'visible',
  CONSTRAINT posts_status_check CHECK (status IN ('visible', 'invisible'))
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_created_at ON posts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS post_votes (
  id BIGSERIAL PRIMARY KEY,
  pseudo_user_id TEXT NOT NULL,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  vote INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_votes_vote_check CHECK (vote IN (-1, 1)),
  CONSTRAINT post_votes_unique_user_per_post UNIQUE (post_id, pseudo_user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes (post_id);
