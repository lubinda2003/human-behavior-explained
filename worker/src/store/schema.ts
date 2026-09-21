import type { Env } from '../env';

/** Bump when SCHEMA_STATEMENTS change. Statements must stay idempotent. */
export const SCHEMA_VERSION = '1';
const SCHEMA_KEY = 'schema_version';

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    category TEXT NOT NULL,
    tone TEXT NOT NULL,
    stakes TEXT NOT NULL,
    layout TEXT NOT NULL,
    hook_style TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload_json TEXT NOT NULL,
    parent_post_id TEXT,
    telegram_message_id INTEGER,
    telegram_poll_message_id INTEGER,
    raw_r2_key TEXT,
    scheduled_for TEXT,
    published_at TEXT,
    failure_reason TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts (status, scheduled_for)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts (parent_post_id)`,

  `CREATE TABLE IF NOT EXISTS poll_results (
    post_id TEXT PRIMARY KEY,
    total_voters INTEGER NOT NULL,
    results_json TEXT NOT NULL,
    closed_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS topic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_topic_memory_created ON topic_memory (created_at)`,
];

/**
 * Creates the D1 tables on first run. The KV flag avoids re-running on every request;
 * because the statements are idempotent, a stale flag is harmless.
 */
export async function ensureSchema(env: Pick<Env, 'DB' | 'KV'>): Promise<'created' | 'current'> {
  const current = await env.KV.get(SCHEMA_KEY);
  if (current === SCHEMA_VERSION) return 'current';

  await env.DB.batch(SCHEMA_STATEMENTS.map((sql) => env.DB.prepare(sql)));
  await env.KV.put(SCHEMA_KEY, SCHEMA_VERSION);
  return 'created';
}
