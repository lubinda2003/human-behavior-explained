-- Migration: 0002_discussion_reliability.sql
-- Hardens Telegram discussion and webhook event idempotency

-- 1. Ensure webhook_events has attempts, last_error, and updated_at
ALTER TABLE webhook_events ADD COLUMN attempts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE webhook_events ADD COLUMN last_error TEXT;
ALTER TABLE webhook_events ADD COLUMN updated_at TEXT;

-- 2. Discussion messages table for deterministic comment tracking and reply-chain resolution
CREATE TABLE IF NOT EXISTS discussion_messages (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL REFERENCES interactions(id),
  post_id TEXT NOT NULL REFERENCES posts(id),
  telegram_message_id INTEGER NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  telegram_user_id INTEGER,
  user_id TEXT REFERENCES users(id),
  reply_to_message_id INTEGER,
  thread_id INTEGER,
  text_content TEXT,
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_disc_msgs_chat_msg ON discussion_messages (telegram_chat_id, telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_disc_msgs_interaction ON discussion_messages (interaction_id);
CREATE INDEX IF NOT EXISTS idx_disc_msgs_reply ON discussion_messages (telegram_chat_id, reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_disc_msgs_thread ON discussion_messages (telegram_chat_id, thread_id);
