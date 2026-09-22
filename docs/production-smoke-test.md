# Production Smoke-Test Runbook: Pick Your Fate

This document details the exact 12-step verification sequence for validating the **Pick Your Fate** Cloudflare Worker, database bindings, credentials, and interaction lifecycle before and after going live.

---

## Safety Guarantees

1. **Non-Destructive by Default**: All smoke-test operations are strictly non-destructive.
2. **Zero Credential Exposure**: API keys, bot tokens, and webhook secrets are never returned in HTTP responses or stored in log payloads.
3. **Double-Gated Kill Switch**: Live publishing to public Telegram channels requires **both** `PUBLISHING_ENABLED="true"` AND `DRY_RUN="false"`. If either condition is not met, the system automatically routes all Telegram API calls to an in-memory mock client.

---

## The 12-Step Production Verification Sequence

### Step 1: Initial Deployment Verification (Publishing Disabled)
Ensure Cloudflare Worker environment variables are configured in safe staging mode:
```bash
# In wrangler.toml or Cloudflare Dashboard
PUBLISHING_ENABLED="false"
DRY_RUN="true"
GEMINI_MODEL="gemini-2.5-flash"
```
Deploy the worker:
```bash
npx wrangler deploy
```

---

### Step 2: Public Health & Binding Check
Perform an unauthenticated HTTP GET to `/health`:
```bash
curl -s https://<YOUR_WORKER_URL>/health
```
**Expected Response:** HTTP `200 OK`
```json
{
  "ok": true,
  "worker": "dilemmas-worker",
  "status": "PASS",
  "dependencies": {
    "d1": "PASS",
    "kv": "PASS",
    "r2": "PASS"
  },
  "configuration": {
    "telegramBotToken": "CONFIGURED",
    "telegramChannelId": "CONFIGURED",
    "telegramWebhookSecret": "CONFIGURED",
    "geminiApiKey": "CONFIGURED",
    "geminiModel": "gemini-2.5-flash",
    "publishingEnabled": false,
    "dryRun": true
  }
}
```
*Interpretation*: Confirm all dependencies report `"PASS"` and sensitive credentials report `"CONFIGURED"`.

---

### Step 3: Smoke-Test Endpoint Authentication Verification
Verify that unauthenticated access to `/smoke-test` is rejected:
```bash
curl -s -o /dev/null -w "%{http_code}" https://<YOUR_WORKER_URL>/smoke-test
```
**Expected Response:** HTTP `401 Unauthorized`.

---

### Step 4: D1 Storage & Transactional Write/Read/Cleanup Check
Execute a safe transactional check against Cloudflare D1:
```bash
curl -s -H "X-Smoke-Test-Secret: <TELEGRAM_WEBHOOK_SECRET>" \
  "https://<YOUR_WORKER_URL>/smoke-test?action=d1"
```
**Expected Response:** HTTP `200 OK`
```json
{
  "ok": true,
  "status": "PASS",
  "write": "PASS",
  "read": "PASS",
  "cleanup": "PASS",
  "recordId": "smoke_test_1740000000_abc123"
}
```
*Interpretation*: Verifies write, read, and automatic cleanup on `interaction_locks` table.

---

### Step 5: Harmless Telegram Bot Credentials Verification
Test bot reachability via Telegram `getMe` (does **not** publish any messages):
```bash
curl -s -H "X-Smoke-Test-Secret: <TELEGRAM_WEBHOOK_SECRET>" \
  "https://<YOUR_WORKER_URL>/smoke-test?action=telegram"
```
**Expected Response:** HTTP `200 OK`
```json
{
  "ok": true,
  "status": "PASS",
  "reachable": true,
  "bot": {
    "id": 123456789,
    "username": "PickYourFateBot",
    "firstName": "Pick Your Fate",
    "isBot": true
  }
}
```
*Interpretation*: Confirms `TELEGRAM_BOT_TOKEN` is valid and Telegram API is reachable.

---

### Step 6: Gemini Model Connectivity Verification
Test Gemini API connectivity with a minimal ping (does **not** generate a public post):
```bash
curl -s -H "X-Smoke-Test-Secret: <TELEGRAM_WEBHOOK_SECRET>" \
  "https://<YOUR_WORKER_URL>/smoke-test?action=gemini"
```
**Expected Response:** HTTP `200 OK`
```json
{
  "ok": true,
  "status": "PASS",
  "reachable": true,
  "model": "gemini-2.5-flash",
  "responsePreview": "PONG"
}
```
*Interpretation*: Confirms `GEMINI_API_KEY` is authorized and quota is healthy.

---

### Step 7: Full Pipeline Dry-Run Verification
Execute a simulated generation and interaction flow:
```bash
curl -s -H "X-Smoke-Test-Secret: <TELEGRAM_WEBHOOK_SECRET>" \
  "https://<YOUR_WORKER_URL>/smoke-test?action=dry-run"
```
**Expected Response:** HTTP `200 OK`
```json
{
  "ok": true,
  "status": "PASS",
  "generated": true,
  "qualityGatePassed": true,
  "interactionPlanned": true,
  "d1Persisted": true,
  "telegramPayloadValid": true,
  "channelPublished": false,
  "cleanupCompleted": true,
  "sample": {
    "title": "The Outpost Emergency Oxygen Protocol",
    "format": "impossible_dilemma",
    "optionsCount": 2
  }
}
```
*Interpretation*: Proves complete pipeline execution (*Content -> Quality Gate -> Interaction Planning -> D1 Storage -> Telegram Payload*) with zero external broadcast.

---

### Step 8: Publishing Kill-Switch Verification
Verify the safety state of the publishing client:
```bash
curl -s -H "X-Smoke-Test-Secret: <TELEGRAM_WEBHOOK_SECRET>" \
  "https://<YOUR_WORKER_URL>/smoke-test?action=kill-switch"
```
**Expected Response:**
```json
{
  "ok": true,
  "status": "PASS",
  "publishingEnabled": false,
  "dryRunMode": true,
  "clientType": "MockTelegramClient",
  "safeForProduction": true,
  "reason": "PUBLISHING_ENABLED=false guarantees MockTelegramClient is active (Zero external API calls)"
}
```

---

### Step 9: Configure Telegram Bot Webhook
Register the Worker endpoint with Telegram:
```bash
curl -F "url=https://<YOUR_WORKER_URL>/webhook" \
     -F "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
     -F "allowed_updates=[\"poll_answer\",\"message\",\"channel_post\"]" \
     https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
```
**Expected Response:** `{"ok":true,"result":true,"description":"Webhook was set"}`.

---

### Step 10: Webhook Ingestion & Idempotency Test
Send a synthetic Telegram webhook update to confirm parsing and signature validation:
```bash
curl -s -X POST https://<YOUR_WORKER_URL>/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>" \
  -d '{
    "update_id": 99999901,
    "poll_answer": {
      "poll_id": "nonexistent_poll_for_test",
      "user": { "id": 10001, "first_name": "TestUser", "is_bot": false },
      "option_ids": [0]
    }
  }'
```
**Expected Response:** `{"ok":true,"action":"ignored_unknown_poll"}` with HTTP `200 OK`.

---

### Step 11: Controlled Live Activation
Once all steps 1-10 have passed, switch the environment variables to active production:
```bash
npx wrangler secret put PUBLISHING_ENABLED
# Enter: true

npx wrangler secret put DRY_RUN
# Enter: false
```
Re-run the kill-switch smoke check to confirm live client activation:
```bash
curl -s -H "X-Smoke-Test-Secret: <TELEGRAM_WEBHOOK_SECRET>" \
  "https://<YOUR_WORKER_URL>/smoke-test?action=kill-switch"
```
*Expected*: `"clientType": "HttpTelegramClient"`, `"safeForProduction": false` (indicating live operations).

---

### Step 12: End-to-End Post Monitoring
Observe the worker logs during the next scheduled cron tick:
```bash
npx wrangler tail
```
Confirm:
1. Dilemma scenario is published to the target channel.
2. Interactive poll or discussion is linked.
3. Votes received via webhook are recorded in `poll_votes`.
4. The scheduled cron tick closes the interaction when due and posts the reveal message.

---

## Emergency Disable Instructions

If an anomaly, rate limit, or unintended post is detected, follow these steps immediately:

### Option A: Instant Software Kill-Switch (Zero Worker Downtime)
Instantly disable all outgoing Telegram publishing while keeping the worker and webhook handlers online:
```bash
npx wrangler secret put PUBLISHING_ENABLED
# Enter: false
```
*Effect*: All subsequent post attempts and result publications are diverted to `MockTelegramClient`. No Telegram messages or polls can be sent.

### Option B: Drop Telegram Webhook
To stop Telegram from sending updates to the worker:
```bash
curl -s https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/deleteWebhook
```
