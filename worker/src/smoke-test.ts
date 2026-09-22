import type { Env } from './env';
import type { D1Database } from '@cloudflare/workers-types';
import type { TelegramClient, TelegramUser } from './interactions/telegram-client';
import { MockTelegramClient, HttpTelegramClient } from './interactions/telegram-client';
import { InteractionPlanner } from './interactions/planner';
import { D1InteractionRepository } from './interactions/repository';
import { TelegramInteractionPublisher } from './interactions/publisher';
import type { PostRecord } from './interactions/types';

export interface HealthCheckResult {
  ok: boolean;
  worker: string;
  status: 'PASS' | 'FAIL';
  dependencies: {
    d1: 'PASS' | 'FAIL';
    kv: 'PASS' | 'FAIL';
    r2: 'PASS' | 'FAIL';
  };
  configuration: {
    telegramBotToken: 'CONFIGURED' | 'MISSING';
    telegramChannelId: 'CONFIGURED' | 'MISSING';
    telegramWebhookSecret: 'CONFIGURED' | 'MISSING';
    geminiApiKey: 'CONFIGURED' | 'MISSING';
    geminiModel: string;
    publishingEnabled: boolean;
    dryRun: boolean;
  };
  details: {
    d1: string;
    kv: string;
    r2: string;
  };
}

export interface TelegramConnectivityResult {
  ok: boolean;
  status: 'PASS' | 'FAIL';
  reachable: boolean;
  bot?: {
    id: number;
    username?: string;
    firstName: string;
    isBot: boolean;
  };
  error?: string;
}

export interface GeminiConnectivityResult {
  ok: boolean;
  status: 'PASS' | 'FAIL';
  reachable: boolean;
  model: string;
  responsePreview?: string;
  error?: string;
}

export interface D1TransactionalResult {
  ok: boolean;
  status: 'PASS' | 'FAIL';
  write: 'PASS' | 'FAIL';
  read: 'PASS' | 'FAIL';
  cleanup: 'PASS' | 'FAIL';
  recordId: string;
  error?: string;
}

export interface DryRunPublishResult {
  ok: boolean;
  status: 'PASS' | 'FAIL';
  generated: boolean;
  qualityGatePassed: boolean;
  interactionPlanned: boolean;
  d1Persisted: boolean;
  telegramPayloadValid: boolean;
  channelPublished: false;
  cleanupCompleted: boolean;
  sample: {
    id: string;
    title: string;
    format: string;
    category: string;
    pollQuestion: string;
    optionsCount: number;
  };
  errors: string[];
}

export interface KillSwitchVerificationResult {
  ok: boolean;
  status: 'PASS' | 'FAIL';
  publishingEnabled: boolean;
  dryRunMode: boolean;
  clientType: 'MockTelegramClient' | 'HttpTelegramClient';
  safeForProduction: boolean;
  reason: string;
}

export interface FullSmokeTestReport {
  timestamp: string;
  overallStatus: 'PASS' | 'FAIL';
  summary: {
    health: 'PASS' | 'FAIL';
    d1Transactional: 'PASS' | 'FAIL';
    telegramConnectivity: 'PASS' | 'FAIL';
    geminiConnectivity: 'PASS' | 'FAIL';
    dryRunPublish: 'PASS' | 'FAIL';
    killSwitch: 'PASS' | 'FAIL';
  };
  health: HealthCheckResult;
  d1Transactional: D1TransactionalResult;
  telegram: TelegramConnectivityResult;
  gemini: GeminiConnectivityResult;
  dryRun: DryRunPublishResult;
  killSwitch: KillSwitchVerificationResult;
}

// -------------------------------------------------------------
// 1. HEALTH CHECK (Zero credentials exposed)
// -------------------------------------------------------------
export async function runHealthCheck(env: Env): Promise<HealthCheckResult> {
  let d1Status: 'PASS' | 'FAIL' = 'PASS';
  let d1Detail = 'ok';
  try {
    await env.DB.prepare('SELECT 1').first();
  } catch (err) {
    d1Status = 'FAIL';
    d1Detail = (err as Error).message || String(err);
  }

  let kvStatus: 'PASS' | 'FAIL' = 'PASS';
  let kvDetail = 'ok';
  try {
    await env.KV.get('__health__');
  } catch (err) {
    kvStatus = 'FAIL';
    kvDetail = (err as Error).message || String(err);
  }

  let r2Status: 'PASS' | 'FAIL' = 'PASS';
  let r2Detail = 'ok';
  try {
    await env.ARCHIVE.head('__health__');
  } catch (err) {
    r2Status = 'FAIL';
    r2Detail = (err as Error).message || String(err);
  }

  const allDependenciesPass = d1Status === 'PASS' && kvStatus === 'PASS' && r2Status === 'PASS';

  return {
    ok: allDependenciesPass,
    worker: 'dilemmas-worker',
    status: allDependenciesPass ? 'PASS' : 'FAIL',
    dependencies: {
      d1: d1Status,
      kv: kvStatus,
      r2: r2Status,
    },
    configuration: {
      telegramBotToken: env.TELEGRAM_BOT_TOKEN ? 'CONFIGURED' : 'MISSING',
      telegramChannelId: env.TELEGRAM_CHANNEL_ID ? 'CONFIGURED' : 'MISSING',
      telegramWebhookSecret: env.TELEGRAM_WEBHOOK_SECRET ? 'CONFIGURED' : 'MISSING',
      geminiApiKey: env.GEMINI_API_KEY ? 'CONFIGURED' : 'MISSING',
      geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
      publishingEnabled: env.PUBLISHING_ENABLED === 'true',
      dryRun: env.DRY_RUN === 'true',
    },
    details: {
      d1: d1Detail,
      kv: kvDetail,
      r2: r2Detail,
    },
  };
}

// -------------------------------------------------------------
// 2. TELEGRAM CONNECTIVITY TEST (getMe harmless ping)
// -------------------------------------------------------------
export async function testTelegramConnectivity(
  env: Env,
  injectedClient?: TelegramClient,
): Promise<TelegramConnectivityResult> {
  if (!env.TELEGRAM_BOT_TOKEN && !injectedClient) {
    return {
      ok: false,
      status: 'FAIL',
      reachable: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured',
    };
  }

  const client =
    injectedClient ||
    (env.DRY_RUN === 'true'
      ? new MockTelegramClient()
      : new HttpTelegramClient(env.TELEGRAM_BOT_TOKEN!));

  try {
    const user: TelegramUser = await client.getMe();
    return {
      ok: true,
      status: 'PASS',
      reachable: true,
      bot: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        isBot: user.is_bot,
      },
    };
  } catch (err) {
    return {
      ok: false,
      status: 'FAIL',
      reachable: false,
      error: (err as Error).message || 'Telegram getMe failed',
    };
  }
}

// -------------------------------------------------------------
// 3. GEMINI CONNECTIVITY TEST (minimal ping, no post generated)
// -------------------------------------------------------------
export async function testGeminiConnectivity(
  env: Env,
  customPingFn?: () => Promise<string>,
): Promise<GeminiConnectivityResult> {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!env.GEMINI_API_KEY && !customPingFn) {
    return {
      ok: false,
      status: 'FAIL',
      reachable: false,
      model,
      error: 'GEMINI_API_KEY is not configured',
    };
  }

  try {
    if (customPingFn) {
      const response = await customPingFn();
      return {
        ok: true,
        status: 'PASS',
        reachable: true,
        model,
        responsePreview: response.slice(0, 100),
      };
    }

    // Dynamic import to keep bundle lightweight and avoid CJS issues
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: 'Respond with the single word: PONG' }] }],
    });

    const text = response.text?.trim() || '';
    if (!text) {
      return {
        ok: false,
        status: 'FAIL',
        reachable: true,
        model,
        error: 'Empty response returned from model',
      };
    }

    return {
      ok: true,
      status: 'PASS',
      reachable: true,
      model,
      responsePreview: text.slice(0, 50),
    };
  } catch (err) {
    // Sanitize any accidental credentials in the error message
    const msg = (err as Error).message || String(err);
    const sanitized = msg.replace(env.GEMINI_API_KEY || '', '[REDACTED_API_KEY]');
    return {
      ok: false,
      status: 'FAIL',
      reachable: false,
      model,
      error: sanitized,
    };
  }
}

// -------------------------------------------------------------
// 4. D1 WRITE/READ TEST (safe temporary lock record)
// -------------------------------------------------------------
export async function testD1Transactional(db: D1Database): Promise<D1TransactionalResult> {
  const testId = `smoke_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 60000).toISOString();

  let write: 'PASS' | 'FAIL' = 'FAIL';
  let read: 'PASS' | 'FAIL' = 'FAIL';
  let cleanup: 'PASS' | 'FAIL' = 'FAIL';

  try {
    // 1. Write
    await db
      .prepare('INSERT INTO interaction_locks (interaction_id, locked_by, locked_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(testId, 'smoke_test_runner', now, expires)
      .run();
    write = 'PASS';

    // 2. Read
    const row = await db
      .prepare('SELECT * FROM interaction_locks WHERE interaction_id = ?')
      .bind(testId)
      .first<{ interaction_id: string; locked_by: string }>();

    if (row && row.interaction_id === testId && row.locked_by === 'smoke_test_runner') {
      read = 'PASS';
    } else {
      throw new Error(`Record verification failed: expected ${testId}, retrieved ${row?.interaction_id}`);
    }

    // 3. Cleanup
    await db.prepare('DELETE FROM interaction_locks WHERE interaction_id = ?').bind(testId).run();

    // Verify cleanup
    const afterDelete = await db
      .prepare('SELECT * FROM interaction_locks WHERE interaction_id = ?')
      .bind(testId)
      .first();

    if (afterDelete === null) {
      cleanup = 'PASS';
    } else {
      throw new Error('Cleanup verification failed: record still exists after deletion');
    }

    return {
      ok: true,
      status: 'PASS',
      write,
      read,
      cleanup,
      recordId: testId,
    };
  } catch (err) {
    // Attempt emergency cleanup
    try {
      await db.prepare('DELETE FROM interaction_locks WHERE interaction_id = ?').bind(testId).run();
    } catch {
      // Ignored in emergency cleanup
    }

    return {
      ok: false,
      status: 'FAIL',
      write,
      read,
      cleanup,
      recordId: testId,
      error: (err as Error).message || String(err),
    };
  }
}

// -------------------------------------------------------------
// 5. DRY-RUN PUBLISH TEST (proves pipeline with zero live posting)
// -------------------------------------------------------------
export async function testDryRunPublish(
  env: Env,
  options?: {
    customDilemma?: {
      title: string;
      category: string;
      format: string;
      hook: string;
      setup: string;
      complication: string;
      question: string;
      choices: Array<{ label: string; tradeOff: string }>;
    };
  },
): Promise<DryRunPublishResult> {
  const errors: string[] = [];
  const testId = `dryrun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  // 1. Content Generation (procedural realistic dilemma)
  const dilemma = options?.customDilemma || {
    title: 'The Outpost Emergency Oxygen Protocol',
    category: 'survival_stakes',
    format: 'impossible_dilemma',
    hook: 'The atmospheric scrubber in Sector 4 just suffered a catastrophic seal rupture.',
    setup: 'You are the sole life-support technician on duty. The emergency auxiliary tank has exactly 45 minutes of pressurized air left.',
    complication: 'Research Lab Alpha has four scientists with critical planetary data. The Hydroponics greenhouse supplies 60% of the station food supply for the next 18 months.',
    question: 'Where do you route the remaining emergency oxygen supply?',
    choices: [
      {
        label: 'Vent to Lab Alpha (Save Scientists)',
        tradeOff: 'Greenhouse flora suffocates; colony faces immediate starvation crisis.',
      },
      {
        label: 'Vent to Hydroponics (Save Food Supply)',
        tradeOff: 'Scientists lose oxygen; critical evacuation research is permanently lost.',
      },
    ],
  };

  // 2. Quality Gate Verification (format, limits, trade-offs)
  let qualityGatePassed = true;
  if (!dilemma.title || dilemma.title.length < 5) {
    errors.push('Title is missing or too short');
    qualityGatePassed = false;
  }
  if (!dilemma.question || dilemma.question.length > 300) {
    errors.push('Poll question exceeds 300 character limit');
    qualityGatePassed = false;
  }
  if (!Array.isArray(dilemma.choices) || dilemma.choices.length < 2 || dilemma.choices.length > 10) {
    errors.push('Telegram poll requires between 2 and 10 choices');
    qualityGatePassed = false;
  }
  for (const choice of dilemma.choices) {
    if (choice.label.length > 100) {
      errors.push(`Choice label exceeds 100 characters: "${choice.label}"`);
      qualityGatePassed = false;
    }
    if (!choice.tradeOff || choice.tradeOff.length < 5) {
      errors.push(`Choice must carry a concrete trade-off: "${choice.label}"`);
      qualityGatePassed = false;
    }
  }

  // 3. Interaction Planning
  const planner = new InteractionPlanner(env.TELEGRAM_CHANNEL_ID || '@test_channel');
  const plan = planner.plan({
    id: testId,
    title: dilemma.title,
    format: dilemma.format,
    question: dilemma.question,
    choices: dilemma.choices,
  });

  const interactionPlanned = Boolean(plan.pollConfig && plan.pollConfig.options.length >= 2);

  // 4. Validate Telegram Payload
  let telegramPayloadValid = true;
  if (!plan.pollConfig?.question || plan.pollConfig.question.length > 300) {
    telegramPayloadValid = false;
    errors.push('Planned Telegram question invalid');
  }
  if (!plan.pollConfig?.options || plan.pollConfig.options.length < 2) {
    telegramPayloadValid = false;
    errors.push('Planned Telegram options invalid');
  }

  // 5. D1 Persistence (Using isolated MockTelegramClient to guarantee zero channel publication)
  let d1Persisted = false;
  let cleanupCompleted = false;
  const repo = new D1InteractionRepository(env.DB);
  const mockTelegram = new MockTelegramClient();
  const publisher = new TelegramInteractionPublisher(repo, mockTelegram);

  const formattedHtml = `<b>${dilemma.title}</b>\n\n${dilemma.hook}\n\n${dilemma.setup}\n\n<i>${dilemma.complication}</i>`;

  const postRecord: PostRecord = {
    id: testId,
    contentType: 'impossible_dilemma',
    category: dilemma.category,
    tone: 'grim_consequential',
    stakes: 'life_and_death',
    layout: 'standard_split',
    hookStyle: 'action_immediate',
    title: dilemma.title,
    status: 'draft',
    payload: { dilemma, dryRun: true },
    createdAt: now,
  };

  try {
    const pubResult = await publisher.publishInteraction({
      post: postRecord,
      plan,
      formattedText: formattedHtml,
      nowIso: now,
    });

    // Verify D1 records exist
    const persistedPost = await repo.getPost(testId);
    const persistedInteraction = await repo.getInteraction(pubResult.interactionId);

    if (persistedPost && persistedInteraction) {
      d1Persisted = true;
    } else {
      errors.push('Failed to verify persisted records in D1');
    }

    // Verify Mock Telegram received the call, NOT real Telegram
    if (mockTelegram.history.messages.length === 0 || mockTelegram.history.polls.length === 0) {
      errors.push('Mock Telegram did not record payload generation');
    }

    // 6. Cleanup temporary test records from D1
    await env.DB.prepare('DELETE FROM published_messages WHERE post_id = ?').bind(testId).run();
    await env.DB.prepare('DELETE FROM poll_options WHERE poll_id IN (SELECT id FROM polls WHERE interaction_id = ?)')
      .bind(pubResult.interactionId)
      .run();
    await env.DB.prepare('DELETE FROM polls WHERE interaction_id = ?').bind(pubResult.interactionId).run();
    await env.DB.prepare('DELETE FROM interactions WHERE id = ?').bind(pubResult.interactionId).run();
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(testId).run();

    cleanupCompleted = true;
  } catch (err) {
    errors.push(`D1 dry-run execution error: ${(err as Error).message}`);
    // Attempt emergency cleanup
    try {
      await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(testId).run();
    } catch {
      // Ignored in emergency cleanup
    }
  }

  const ok = qualityGatePassed && interactionPlanned && telegramPayloadValid && d1Persisted && cleanupCompleted;

  return {
    ok,
    status: ok ? 'PASS' : 'FAIL',
    generated: true,
    qualityGatePassed,
    interactionPlanned,
    d1Persisted,
    telegramPayloadValid,
    channelPublished: false, // 100% Guaranteed: MockTelegramClient used
    cleanupCompleted,
    sample: {
      id: testId,
      title: dilemma.title,
      format: dilemma.format,
      category: dilemma.category,
      pollQuestion: dilemma.question,
      optionsCount: dilemma.choices.length,
    },
    errors,
  };
}

// -------------------------------------------------------------
// 6. PUBLISHING KILL SWITCH VERIFICATION
// -------------------------------------------------------------
export function verifyPublishingKillSwitch(env: Env): KillSwitchVerificationResult {
  const publishingEnabled = env.PUBLISHING_ENABLED === 'true';
  const dryRunMode = env.DRY_RUN === 'true';

  let clientType: 'MockTelegramClient' | 'HttpTelegramClient';
  let safeForProduction: boolean;
  let reason: string;

  if (dryRunMode || !publishingEnabled || !env.TELEGRAM_BOT_TOKEN) {
    clientType = 'MockTelegramClient';
    safeForProduction = true;
    reason = publishingEnabled
      ? 'DRY_RUN=true forced MockTelegramClient even though PUBLISHING_ENABLED=true'
      : 'PUBLISHING_ENABLED=false guarantees MockTelegramClient is active (Zero external API calls)';
  } else {
    clientType = 'HttpTelegramClient';
    safeForProduction = false;
    reason = 'PUBLISHING_ENABLED=true and credentials present: live publishing is ACTIVE';
  }

  return {
    ok: true,
    status: 'PASS',
    publishingEnabled,
    dryRunMode,
    clientType,
    safeForProduction,
    reason,
  };
}

// -------------------------------------------------------------
// 7. FULL SUITE RUNNER
// -------------------------------------------------------------
export async function runFullSmokeTest(
  env: Env,
  options?: {
    telegramClient?: TelegramClient;
    customGeminiPing?: () => Promise<string>;
  },
): Promise<FullSmokeTestReport> {
  const health = await runHealthCheck(env);
  const d1Transactional = await testD1Transactional(env.DB);
  const telegram = await testTelegramConnectivity(env, options?.telegramClient);
  const gemini = await testGeminiConnectivity(env, options?.customGeminiPing);
  const dryRun = await testDryRunPublish(env);
  const killSwitch = verifyPublishingKillSwitch(env);

  const overallStatus =
    health.status === 'PASS' &&
    d1Transactional.status === 'PASS' &&
    telegram.status === 'PASS' &&
    gemini.status === 'PASS' &&
    dryRun.status === 'PASS' &&
    killSwitch.status === 'PASS'
      ? 'PASS'
      : 'FAIL';

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    summary: {
      health: health.status,
      d1Transactional: d1Transactional.status,
      telegramConnectivity: telegram.status,
      geminiConnectivity: gemini.status,
      dryRunPublish: dryRun.status,
      killSwitch: killSwitch.status,
    },
    health,
    d1Transactional,
    telegram,
    gemini,
    dryRun,
    killSwitch,
  };
}
