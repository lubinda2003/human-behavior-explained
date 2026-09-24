# Interactive Dilemmas Worker

Cloudflare Worker that will generate and publish **Interactive Dilemmas & Impossible Choices** to a Telegram channel, with variety in both content type and style.

> **Status: Stage 2 (skeleton).** This Worker is safe to deploy: it initialises storage and exposes read-only debug routes. It does **not** call Gemini or post to Telegram yet.

## Layout

```
wrangler.jsonc        Worker config, bindings, cron trigger
src/
  index.ts            fetch (/health, /plan) + scheduled tick
  env.ts              Bindings and settings types
  types.ts            Domain types and variety axes
  config.ts           Content types, recency windows, banned phrases, poll limits
  store/schema.ts     D1 schema, created on first run
  variety/planner.ts  Picks content type and style so posts don't repeat
test/                 Planner tests (node:test via tsx)
```

## Bindings (auto-provisioned on first deploy)

| Binding | Type | Used for |
|---|---|---|
| `DB` | D1 | posts, poll results, topic memory |
| `KV` | KV | flags, locks, small caches |
| `ARCHIVE` | R2 | raw model output, exports |

## Deploy from the repo

1. Cloudflare dashboard → **Workers & Pages** → **Create** → import this GitHub repo.
2. Set the **Root directory** to `worker`.
3. Deploy command: `npx wrangler deploy`.
4. After the first deploy, add secrets under the Worker's **Settings → Variables and Secrets**:
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `BROWSER_TRIGGER_TOKEN` (optional secret for manual single-click triggers via web browser)

D1, KV and R2 are created automatically on the first deploy because the bindings in `wrangler.jsonc` have no IDs.

## Triggers & Endpoints

- `GET /health` returns `{"ok":true,...}` with `d1`, `kv` and `r2` all `"ok"`. The first call also creates the D1 tables.
- `GET /plan?n=10` previews a sequence of planned posts (type, category, tone, stakes, layout, hook style). Read-only.
- `GET /trigger?token=YOUR_TOKEN` triggers a single execution of the autonomous pipeline directly from your browser. Authenticated via `BROWSER_TRIGGER_TOKEN`.
- `POST /pipeline/run` manual API trigger authenticated via `X-Smoke-Test-Secret: <TELEGRAM_WEBHOOK_SECRET>`.

## Settings (`wrangler.jsonc` vars)

| Var | Default | Meaning |
|---|---|---|
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model used for generation |
| `PUBLISHING_ENABLED` | `false` | Master switch for posting to Telegram |
| `DISCUSSION_GROUP_LINKED` | `false` | Set `true` once the channel has a linked discussion group; enables comment-driven content types |

## Local development

```
cd worker
npm install
cp .dev.vars.example .dev.vars   # fill in real values
npm run dev
npm run typecheck
npm test
```
