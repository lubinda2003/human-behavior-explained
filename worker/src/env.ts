/** Bindings and settings available to the Worker. */
export interface Env {
  // Cloudflare bindings (auto-provisioned on first deploy)
  DB: D1Database; // posts, poll results, topic memory
  KV: KVNamespace; // flags, locks, small caches
  ARCHIVE: R2Bucket; // raw model output and exports

  // Non-secret settings (wrangler.jsonc "vars")
  GEMINI_MODEL: string;
  PUBLISHING_ENABLED: string; // "true" | "false"
  DISCUSSION_GROUP_LINKED: string; // "true" | "false"
  ENABLE_EPISODE_CONTINUATION?: string; // "true" | "false"

  // Secrets (set in the Cloudflare dashboard)
  GEMINI_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  BROWSER_TRIGGER_TOKEN?: string;
  DRY_RUN?: string;
}
