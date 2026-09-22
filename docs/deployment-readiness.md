# Pick Your Fate &mdash; Production Deployment Readiness Audit

**Audit Date:** 2026-09-22  
**Target Environment:** Cloudflare Workers, Cloudflare D1, Telegram Bot API  
**Engine Version:** Pick Your Fate Telegram Interaction Engine v1.0  
**Overall Readiness Verdict:** **READY FOR DEPLOYMENT (WITH OPERATIONAL CONFIGURATION)**  

---

## 1. Executive Summary

This deployment-readiness audit assesses the operational safety of deploying the Pick Your Fate interactive dilemma generator and Telegram Interaction Engine to Cloudflare Workers and connecting it to a live Telegram bot.

### Audit Verdict Breakdown

| Severity | Count | Summary |
| :--- | :--- | :--- |
| **BLOCKER** | **0** | No architectural defects prevent production deployment. |
| **WARNING** | **3** | Operational items to complete before enabling live publishing. |
| **INFO** | **9** | Verified architecture and operational best practices. |

---

## 2. Findings Classification

### BLOCKERS (0)
*None. The core interaction pipeline, D1 schema, webhook security, and scheduled closure mechanisms have completed 6/6 E2E dry-run scenarios and passed all 67 test suites.*

---

### WARNINGS (3)

#### WARNING-1: Dev Server Script Missing in Root (AI Studio Preview Issue)
- **Status:** **Resolved**
- **Diagnosis:** The previous AI Studio run reported `"Server didn't start"` because the root `package.json` lacked a `"dev"` script. AI Studio's container infrastructure requires a process to bind port 3000 to render the live preview iframe.
- **Remediation:** Added a minimal standalone `server.ts` (using Node.js built-in `http`) listening on port 3000 and configured `"dev": "tsx server.ts"` and `"start": "tsx server.ts"` in `package.json`. No dashboard or extra dependencies were introduced.

#### WARNING-2: Wrangler Bindings Require Explicit IDs for Headless CI/CD
- **Status:** **Operational Prerequisite**
- **Diagnosis:** In `worker/wrangler.jsonc`, the bindings specify generic targets:
  ```jsonc
  "d1_databases": [{ "binding": "DB" }],
  "kv_namespaces": [{ "binding": "KV" }],
  "r2_buckets": [{ "binding": "ARCHIVE" }]
  ```
  While local interactive `wrangler dev` can auto-provision placeholders, a non-interactive CI/CD pipeline or strict production deployment requires explicit resource IDs (`database_id`, `id`, `bucket_name`).
- **Remediation:** Follow the deployment sequence below to provision Cloudflare D1, KV, and R2 resources and populate `database_id` and KV namespace IDs prior to first production deploy.

#### WARNING-3: Safe Default `PUBLISHING_ENABLED="false"`
- **Status:** **Operational Requirement**
- **Diagnosis:** In `worker/wrangler.jsonc`, `PUBLISHING_ENABLED` is initialized to `"false"`. The Worker will default to `MockTelegramClient` until this variable is explicitly updated to `"true"` in Cloudflare after smoke testing.
- **Remediation:** Maintain `"false"` during the initial deployment smoke test. Enable live broadcasting only after health check verification.

---

### INFO (9)

- **INFO-1 (Worker Entrypoint):** `worker/src/index.ts` is fully compliant with Cloudflare Workers runtime. Handled endpoints (`/health`, `/webhook`, `/telegram/webhook`, `/plan`) enforce method checks and reject unknown paths with 404.
- **INFO-2 (Secrets Protection):** Zero secrets (`TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, `TELEGRAM_WEBHOOK_SECRET`) are committed to Git or stored in `wrangler.jsonc`.
- **INFO-3 (Zero Local Filesystem Dependency):** The worker codebase (`worker/src/`) relies strictly on Cloudflare D1, KV, and R2; no local file writes or Node-only file modules are invoked at runtime.
- **INFO-4 (D1 Migration & Schema Synchronization):** Migration `0001_interaction_engine.sql` matches `SCHEMA_STATEMENTS` in `worker/src/store/schema.ts` identically. All statements use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- **INFO-5 (Webhook Authentication):** `TelegramWebhookHandler` enforces constant-time authentication against `X-Telegram-Bot-Api-Secret-Token`.
- **INFO-6 (Webhook Idempotency):** The `webhook_events.update_id` primary key deduplicates repeated deliveries from Telegram, returning `200 OK` with `{ duplicate: true }` without double-counting votes.
- **INFO-7 (Concurrency & Scheduled Closure):** `InteractionClosureService` utilizes atomic conditional updates (`UPDATE interactions SET lifecycle_state = 'CLOSED' WHERE id = ? AND lifecycle_state = 'OPEN'`) to prevent race conditions when multiple scheduled cron runners trigger simultaneously.
- **INFO-8 (Telegram Client Timeouts):** `HttpTelegramClient` enforces a 15-second `AbortSignal.timeout(15000)` on all Telegram Bot API subrequests to prevent worker hangs.
- **INFO-9 (Gemini Fallback & Bounded Retries):** Content generation incorporates a deterministic procedural fallback catalog. Retries are strictly bounded to 2 attempts, eliminating infinite loops.

---

## 3. Required Cloudflare Resources

1. **Cloudflare Worker:**
   - Name: `dilemmas-worker`
   - Compatibility Date: `2026-09-21`
   - Trigger: Cron `*/30 * * * *` (Every 30 minutes)

2. **Cloudflare D1 Database:**
   - Resource Name: `pick-your-fate-d1`
   - Binding: `DB`

3. **Cloudflare KV Namespace:**
   - Resource Name: `pick-your-fate-kv`
   - Binding: `KV`
   - Usage: Caches schema migration version and distributed locks

4. **Cloudflare R2 Bucket:**
   - Resource Name: `pick-your-fate-archive`
   - Binding: `ARCHIVE`
   - Usage: Cold storage for raw model outputs and analytical reports

---

## 4. Required Environment Variables & Secrets

### Public Variables (`wrangler.jsonc` `vars`)
| Variable | Expected Value | Description |
| :--- | :--- | :--- |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model alias for dynamic scenario generation |
| `PUBLISHING_ENABLED` | `"false"` $\to$ `"true"` | Controls live broadcasting vs dry-run simulation |
| `DISCUSSION_GROUP_LINKED` | `"true"` or `"false"` | Flag enabling comment-driven narrative formats |

### Worker Secrets (`wrangler secret put <NAME>`)
| Secret Name | Sensitivity | Purpose |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Critical | HTTP bot token issued by `@BotFather` |
| `TELEGRAM_CHANNEL_ID` | Critical | Target broadcast channel ID (e.g. `@PickYourFateChannel` or `-100...`) |
| `TELEGRAM_WEBHOOK_SECRET` | Critical | High-entropy secret token (min 32 hex chars) validating Telegram webhook payloads |
| `GEMINI_API_KEY` | High | Google AI Studio / Gemini API key |
| `DRY_RUN` | Low / Optional | If set to `"true"`, forces `MockTelegramClient` regardless of `PUBLISHING_ENABLED` |

---

## 5. Telegram Bot & Webhook Configuration

1. **Bot Creation:**
   - Create bot via `@BotFather` on Telegram.
   - Disable bot group privacy if community comments or group interactions are planned (`/setprivacy` $\to$ `Disable`).
   - Add the bot as an **Administrator** in the target Telegram channel with permission to:
     - Post Messages
     - Edit Messages
     - Delete Messages

2. **Register Webhook with Secret Token:**
   Run the following HTTP request (replace `<BOT_TOKEN>`, `<WORKER_URL>`, and `<SECRET_TOKEN>`):
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://<WORKER_URL>/webhook",
       "allowed_updates": ["poll_answer", "message"],
       "secret_token": "<SECRET_TOKEN>",
       "drop_pending_updates": true
     }'
   ```

3. **Verify Webhook Status:**
   ```bash
   curl -s "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
   ```

---

## 6. Step-by-Step Production Deployment Sequence

### Step 1: Create Cloudflare Resources
```bash
cd worker

# Create D1 database
npx wrangler d1 create pick-your-fate-d1

# Create KV namespace
npx wrangler kv namespace create pick-your-fate-kv

# Create R2 bucket
npx wrangler r2 bucket create pick-your-fate-archive
```

### Step 2: Configure `wrangler.jsonc`
Update `worker/wrangler.jsonc` with the generated IDs from Step 1:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "pick-your-fate-d1",
    "database_id": "<YOUR_D1_DATABASE_ID>"
  }
],
"kv_namespaces": [
  {
    "binding": "KV",
    "id": "<YOUR_KV_NAMESPACE_ID>"
  }
],
"r2_buckets": [
  {
    "binding": "ARCHIVE",
    "bucket_name": "pick-your-fate-archive"
  }
]
```

### Step 3: Apply D1 Database Migrations
```bash
npx wrangler d1 migrations apply pick-your-fate-d1 --remote
```

### Step 4: Configure Production Secrets
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHANNEL_ID
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put GEMINI_API_KEY
```

### Step 5: Initial Deploy (Safe Mode)
Deploy with `PUBLISHING_ENABLED="false"`:
```bash
npx wrangler deploy
```

### Step 6: Post-Deployment Smoke Tests
1. **Health Check Probe:**
   ```bash
   curl -i https://<WORKER_URL>/health
   ```
   *Expected Response:* `200 OK` with:
   ```json
   {
     "ok": true,
     "worker": "dilemmas-worker",
     "bindings": { "d1": "ok", "kv": "ok", "r2": "ok" },
     "schema": "current",
     "publishingEnabled": false
   }
   ```

2. **Webhook Authentication Test:**
   ```bash
   # Test without secret (Should return 401)
   curl -i -X POST https://<WORKER_URL>/webhook -H "Content-Type: application/json" -d '{"update_id":1}'

   # Test with valid secret (Should return 200)
   curl -i -X POST https://<WORKER_URL>/webhook \
     -H "Content-Type: application/json" \
     -H "X-Telegram-Bot-Api-Secret-Token: <SECRET_TOKEN>" \
     -d '{"update_id": 999999, "poll_answer": {"poll_id": "nonexistent", "user": {"id": 12345}, "option_ids": [0]}}'
   ```

3. **Variety Planner Preview:**
   ```bash
   curl -s https://<WORKER_URL>/plan?n=5
   ```

### Step 7: Activate Live Publishing
Once smoke tests succeed, activate publishing in `wrangler.jsonc` or via Cloudflare Dashboard:
```jsonc
"vars": {
  "GEMINI_MODEL": "gemini-2.5-flash",
  "PUBLISHING_ENABLED": "true",
  "DISCUSSION_GROUP_LINKED": "false"
}
```
Run:
```bash
npx wrangler deploy
```

---

## 7. Rollback Considerations

- **Immediate Emergency Disable:**
  To halt publishing without rolling back code, set `PUBLISHING_ENABLED="false"` or set secret `DRY_RUN="true"` via:
  ```bash
  npx wrangler secret put DRY_RUN # input: true
  ```
  The worker will instantly revert to `MockTelegramClient` without restarting.
- **Rollback Deployment:**
  Cloudflare Workers maintains instant rollbacks:
  ```bash
  npx wrangler rollback [DEPLOYMENT_ID]
  ```
- **Webhook Detachment:**
  To temporarily detach Telegram incoming traffic:
  ```bash
  curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
  ```
