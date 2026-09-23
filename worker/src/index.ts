import type { Env } from './env';
import { ensureSchema } from './store/schema';
import { planVariety } from './variety/planner';
import type { HistoryEntry } from './types';
import {
  D1InteractionRepository,
  HttpTelegramClient,
  MockTelegramClient,
  InteractionClosureService,
  ResultGenerator,
  VoteTracker,
  TelegramWebhookHandler,
  type TelegramUpdate,
  type TelegramClient,
} from './interactions';
import {
  runHealthCheck,
  testTelegramConnectivity,
  testGeminiConnectivity,
  testD1Transactional,
  testDryRunPublish,
  verifyPublishingKillSwitch,
  runFullSmokeTest,
} from './smoke-test';
import { AutonomousPipelineService } from './pipeline/autonomous-pipeline';

type BindingStatus = 'ok' | string;

async function checkBindings(env: Env): Promise<Record<'d1' | 'kv' | 'r2', BindingStatus>> {
  const result: Record<'d1' | 'kv' | 'r2', BindingStatus> = { d1: 'ok', kv: 'ok', r2: 'ok' };
  try {
    await env.DB.prepare('SELECT 1').first();
  } catch (err) {
    result.d1 = String(err);
  }
  try {
    await env.KV.get('__health__');
  } catch (err) {
    result.kv = String(err);
  }
  try {
    await env.ARCHIVE.head('__health__');
  } catch (err) {
    result.r2 = String(err);
  }
  return result;
}

export function getTelegramClient(env: Env): TelegramClient {
  if (env.DRY_RUN === 'true' || env.PUBLISHING_ENABLED !== 'true' || !env.TELEGRAM_BOT_TOKEN) {
    return new MockTelegramClient();
  }
  return new HttpTelegramClient(env.TELEGRAM_BOT_TOKEN);
}

function verifySmokeTestAuth(request: Request, env: Env): boolean {
  const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return true; // Unprotected in local dev/testing if secret not configured
  }

  const providedSecret =
    request.headers.get('X-Smoke-Test-Secret') ||
    request.headers.get('X-Telegram-Bot-Api-Secret-Token') ||
    new URL(request.url).searchParams.get('secret');

  if (!providedSecret) {
    return false;
  }

  if (providedSecret.length !== expectedSecret.length) {
    return false;
  }

  let match = 0;
  for (let i = 0; i < expectedSecret.length; i++) {
    match |= expectedSecret.charCodeAt(i) ^ providedSecret.charCodeAt(i);
  }
  return match === 0;
}

/** Scheduled tick: ensures schema, advances due interactions, and executes autonomous production pipeline. */
async function tick(env: Env, event: ScheduledController): Promise<void> {
  const schema = await ensureSchema(env);
  const pipeline = new AutonomousPipelineService(env);
  const result = await pipeline.runPipeline(`cron:${event.cron}`);

  console.log(
    JSON.stringify({
      evt: 'tick',
      cron: event.cron,
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      schema,
      result,
      publishingEnabled: env.PUBLISHING_ENABLED === 'true',
    }),
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Enhanced Health Check Endpoint (Zero Credentials Exposed)
    if (request.method === 'GET' && url.pathname === '/health') {
      const health = await runHealthCheck(env);
      let schema = 'unavailable';
      let posts = 0;
      let interactions = 0;
      let users = 0;

      if (health.ok) {
        try {
          schema = await ensureSchema(env);
          const postRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM posts').first<{ n: number }>();
          posts = postRow?.n ?? 0;
          const intRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM interactions').first<{ n: number }>();
          interactions = intRow?.n ?? 0;
          const userRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
          users = userRow?.n ?? 0;
        } catch {
          // Keep count as 0 if tables not yet populated
        }
      }

      return Response.json(
        {
          ok: health.ok,
          worker: health.worker,
          status: health.status,
          dependencies: health.dependencies,
          configuration: health.configuration,
          bindings: {
            d1: health.dependencies.d1 === 'PASS' ? 'ok' : health.details.d1,
            kv: health.dependencies.kv === 'PASS' ? 'ok' : health.details.kv,
            r2: health.dependencies.r2 === 'PASS' ? 'ok' : health.details.r2,
          },
          schema,
          posts,
          interactions,
          users,
          publishingEnabled: health.configuration.publishingEnabled,
          dryRun: health.configuration.dryRun,
        },
        { status: health.ok ? 200 : 503 },
      );
    }

    // 2. Protected Smoke-Test Endpoints
    if (
      (request.method === 'GET' || request.method === 'POST') &&
      (url.pathname === '/smoke-test' || url.pathname.startsWith('/smoke/'))
    ) {
      if (!verifySmokeTestAuth(request, env)) {
        return Response.json(
          {
            ok: false,
            error: 'Unauthorized: invalid or missing smoke-test secret token',
          },
          { status: 401 },
        );
      }

      // Action can be specified via query param ?action=... or path /smoke/:action
      const pathAction = url.pathname.startsWith('/smoke/') ? url.pathname.replace('/smoke/', '') : '';
      const action = url.searchParams.get('action') || pathAction || 'all';

      // Ensure DB schema exists before running D1 tests
      try {
        await ensureSchema(env);
      } catch {
        // Handled in individual test steps
      }

      switch (action) {
        case 'health': {
          const res = await runHealthCheck(env);
          return Response.json(res, { status: res.ok ? 200 : 503 });
        }
        case 'telegram': {
          const res = await testTelegramConnectivity(env);
          return Response.json(res, { status: res.ok ? 200 : 500 });
        }
        case 'gemini': {
          const res = await testGeminiConnectivity(env);
          return Response.json(res, { status: res.ok ? 200 : 500 });
        }
        case 'd1': {
          const res = await testD1Transactional(env.DB);
          return Response.json(res, { status: res.ok ? 200 : 500 });
        }
        case 'dry-run': {
          const res = await testDryRunPublish(env);
          return Response.json(res, { status: res.ok ? 200 : 500 });
        }
        case 'kill-switch': {
          const res = verifyPublishingKillSwitch(env);
          return Response.json(res, { status: 200 });
        }
        case 'pipeline': {
          const pipeline = new AutonomousPipelineService(env);
          const res = await pipeline.runPipeline('smoke_test');
          return Response.json(res, { status: res.success ? 200 : 500 });
        }
        case 'all':
        default: {
          const res = await runFullSmokeTest(env);
          return Response.json(res, { status: res.overallStatus === 'PASS' ? 200 : 500 });
        }
      }
    }

    // 3. Protected Autonomous Pipeline Execution Endpoint (On-demand trigger)
    if (
      request.method === 'POST' &&
      (url.pathname === '/pipeline/run' || url.pathname === '/cron/trigger')
    ) {
      if (!verifySmokeTestAuth(request, env)) {
        return Response.json(
          { ok: false, error: 'Unauthorized: invalid or missing secret token' },
          { status: 401 },
        );
      }

      await ensureSchema(env);
      const pipeline = new AutonomousPipelineService(env);
      const res = await pipeline.runPipeline('manual_trigger');
      return Response.json(res, { status: res.success ? 200 : 500 });
    }

    // 4. Telegram Bot API Webhook endpoint
    if (request.method === 'POST' && (url.pathname === '/webhook' || url.pathname === '/telegram/webhook')) {
      await ensureSchema(env);
      const repo = new D1InteractionRepository(env.DB);
      const voteTracker = new VoteTracker(repo);
      const handler = new TelegramWebhookHandler(repo, voteTracker, {
        secretToken: env.TELEGRAM_WEBHOOK_SECRET,
      });

      let update: TelegramUpdate;
      try {
        update = (await request.json()) as TelegramUpdate;
      } catch {
        return Response.json({ ok: false, error: 'Malformed JSON payload' }, { status: 400 });
      }

      const outcome = await handler.handleUpdate(update, request.headers);
      return Response.json(outcome.body, { status: outcome.status });
    }

    // 4. Variety Planner Preview (Read-only: no model calls, no Telegram, no writes)
    if (request.method === 'GET' && url.pathname === '/plan') {
      const n = Math.min(Math.max(Number(url.searchParams.get('n')) || 10, 1), 30);
      const discussionGroup = env.DISCUSSION_GROUP_LINKED === 'true';
      const history: HistoryEntry[] = [];
      const plans = [];
      for (let i = 0; i < n; i++) {
        const plan = planVariety(history, { discussionGroup });
        plans.push(plan);
        history.unshift(plan);
      }
      return Response.json({ discussionGroup, plans });
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx): Promise<void> {
    ctx.waitUntil(tick(env, event));
  },
} satisfies ExportedHandler<Env>;
