-- Pick Your Fate Telegram Interaction Engine D1 Schema Migration
-- Migration 0001: Users, Posts, Messages, Interactions, Polls, Votes, Results, Webhook Events

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  telegram_user_id INTEGER UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT,
  is_bot INTEGER DEFAULT 0,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users (telegram_user_id);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  category TEXT NOT NULL,
  tone TEXT NOT NULL,
  stakes TEXT NOT NULL,
  layout TEXT NOT NULL,
  hook_style TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  payload_json TEXT NOT NULL,
  parent_post_id TEXT,
  telegram_message_id INTEGER,
  telegram_poll_message_id INTEGER,
  raw_r2_key TEXT,
  scheduled_for TEXT,
  published_at TEXT,
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at);
CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts (parent_post_id);

CREATE TABLE IF NOT EXISTS published_messages (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  telegram_message_id INTEGER NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  parse_mode TEXT DEFAULT 'HTML',
  text_content TEXT,
  published_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pub_msg_post ON published_messages (post_id, message_type);
CREATE INDEX IF NOT EXISTS idx_pub_msg_tg ON published_messages (telegram_chat_id, telegram_message_id);

CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  interaction_type TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  target_chat_id TEXT NOT NULL,
  main_message_id INTEGER,
  close_strategy TEXT NOT NULL DEFAULT 'scheduled',
  duration_seconds INTEGER,
  opens_at TEXT,
  closes_at TEXT,
  closed_at TEXT,
  resolved_at TEXT,
  result_post_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interactions_post ON interactions (post_id);
CREATE INDEX IF NOT EXISTS idx_interactions_lifecycle_closes ON interactions (lifecycle_state, closes_at);
CREATE INDEX IF NOT EXISTS idx_interactions_state ON interactions (lifecycle_state);

CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL UNIQUE REFERENCES interactions(id),
  telegram_poll_id TEXT UNIQUE,
  telegram_message_id INTEGER,
  question TEXT NOT NULL,
  poll_type TEXT NOT NULL DEFAULT 'regular',
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  allows_multiple_answers INTEGER NOT NULL DEFAULT 0,
  correct_option_id INTEGER,
  explanation TEXT,
  open_period_seconds INTEGER,
  close_date TEXT,
  is_closed INTEGER NOT NULL DEFAULT 0,
  total_voter_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  closed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_polls_tg_id ON polls (telegram_poll_id);
CREATE INDEX IF NOT EXISTS idx_polls_interaction ON polls (interaction_id);

CREATE TABLE IF NOT EXISTS poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls(id),
  option_index INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  trade_off TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_options_poll_idx ON poll_options (poll_id, option_index);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls(id),
  interaction_id TEXT NOT NULL REFERENCES interactions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  telegram_user_id INTEGER NOT NULL,
  selected_option_indices TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  voted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_poll_user ON votes (poll_id, user_id);
CREATE INDEX IF NOT EXISTS idx_votes_interaction_status ON votes (interaction_id, status);

CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL UNIQUE REFERENCES interactions(id),
  post_id TEXT NOT NULL REFERENCES posts(id),
  total_participants INTEGER NOT NULL,
  winning_option_index INTEGER,
  winning_option_text TEXT,
  winning_percentage REAL,
  vote_distribution_json TEXT NOT NULL,
  payoff_json TEXT NOT NULL,
  reveal_text TEXT NOT NULL,
  result_post_message_id INTEGER,
  status TEXT NOT NULL DEFAULT 'generated',
  published_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_results_post ON results (post_id);
CREATE INDEX IF NOT EXISTS idx_results_interaction ON results (interaction_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  update_id INTEGER PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  status TEXT NOT NULL DEFAULT 'processed'
);

CREATE TABLE IF NOT EXISTS interaction_locks (
  interaction_id TEXT PRIMARY KEY,
  locked_by TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Legacy compatibility tables
CREATE TABLE IF NOT EXISTS poll_results (
  post_id TEXT PRIMARY KEY,
  total_voters INTEGER NOT NULL,
  results_json TEXT NOT NULL,
  closed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_topic_memory_created ON topic_memory (created_at);
