import type { Env } from './env';
import { ensureSchema } from './store/schema';
import { planVariety } from './variety/planner';
import type { HistoryEntry } from './types';

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

/** Scheduled tick. Stage 2: initialise storage and log only. It never publishes. */
async function tick(env: Env, event: ScheduledController): Promise<void> {
  const schema = await ensureSchema(env);
  console.log(
    JSON.stringify({
      evt: 'tick',
      cron: event.cron,
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      schema,
      publishingEnabled: env.PUBLISHING_ENABLED === 'true',
    }),
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      const bindings = await checkBindings(env);
      const healthy = Object.values(bindings).every((s) => s === 'ok');
      let schema: string = 'unavailable';
      let posts = 0;
      if (healthy) {
        schema = await ensureSchema(env);
        const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM posts').first<{ n: number }>();
        posts = row?.n ?? 0;
      }
      return Response.json(
        {
          ok: healthy,
          worker: 'dilemmas-worker',
          bindings,
          schema,
          posts,
          publishingEnabled: env.PUBLISHING_ENABLED === 'true',
        },
        { status: healthy ? 200 : 503 },
      );
    }

    // Preview what the variety planner would produce over the next N posts.
    // Read-only: no model calls, no Telegram, no writes.
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
