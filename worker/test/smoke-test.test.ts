import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import type { Env } from '../src/env';
import worker from '../src/index';
import {
  runHealthCheck,
  testTelegramConnectivity,
  testGeminiConnectivity,
  testD1Transactional,
  testDryRunPublish,
  verifyPublishingKillSwitch,
  runFullSmokeTest,
} from '../src/smoke-test';
import { MockTelegramClient } from '../src/interactions/telegram-client';

function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, val: string) => {
      store.set(key, val);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function createMockR2() {
  const store = new Map<string, ArrayBuffer>();
  return {
    head: async (_key: string) => null,
    get: async (key: string) => (store.has(key) ? { body: store.get(key) } : null),
    put: async (key: string, val: ArrayBuffer) => {
      store.set(key, val);
    },
  } as unknown as R2Bucket;
}

describe('Controlled Production Smoke-Test Suite', () => {
  let db: D1Database;
  let kv: KVNamespace;
  let r2: R2Bucket;
  let baseEnv: Env;

  const TEST_SECRET = 'secure_webhook_secret_9876543210';
  const TEST_BOT_TOKEN = '123456789:ABCDefghIJKLmnOPQRstuvWXYZ';
  const TEST_API_KEY = 'AIzaSyA_test_gemini_api_key_secret';

  beforeEach(async () => {
    db = createMockD1Database();
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }
    kv = createMockKV();
    r2 = createMockR2();

    baseEnv = {
      DB: db,
      KV: kv,
      ARCHIVE: r2,
      TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
      TELEGRAM_CHANNEL_ID: '@pickyourfate_test',
      TELEGRAM_WEBHOOK_SECRET: TEST_SECRET,
      GEMINI_API_KEY: TEST_API_KEY,
      GEMINI_MODEL: 'gemini-2.5-flash',
      PUBLISHING_ENABLED: 'false',
      DRY_RUN: 'true',
    };
  });

  // -----------------------------------------------------------
  // 1. Health Endpoint Tests
  // -----------------------------------------------------------
  describe('Health Endpoint & Redaction', () => {
    it('returns PASS status when all bindings and dependencies are healthy', async () => {
      const health = await runHealthCheck(baseEnv);
      assert.equal(health.ok, true);
      assert.equal(health.status, 'PASS');
      assert.equal(health.dependencies.d1, 'PASS');
      assert.equal(health.dependencies.kv, 'PASS');
      assert.equal(health.dependencies.r2, 'PASS');
      assert.equal(health.configuration.telegramBotToken, 'CONFIGURED');
      assert.equal(health.configuration.geminiApiKey, 'CONFIGURED');
      assert.equal(health.configuration.publishingEnabled, false);
      assert.equal(health.configuration.dryRun, true);
    });

    it('NEVER exposes API keys, bot tokens, or webhook secrets in health responses', async () => {
      const health = await runHealthCheck(baseEnv);
      const jsonStr = JSON.stringify(health);

      assert.ok(!jsonStr.includes(TEST_BOT_TOKEN), 'Bot token must NOT be present in JSON');
      assert.ok(!jsonStr.includes(TEST_API_KEY), 'Gemini API key must NOT be present in JSON');
      assert.ok(!jsonStr.includes(TEST_SECRET), 'Webhook secret must NOT be present in JSON');
    });

    it('flags MISSING configuration accurately', async () => {
      const emptyEnv: Env = {
        DB: db,
        KV: kv,
        ARCHIVE: r2,
      };
      const health = await runHealthCheck(emptyEnv);
      assert.equal(health.configuration.telegramBotToken, 'MISSING');
      assert.equal(health.configuration.telegramChannelId, 'MISSING');
      assert.equal(health.configuration.telegramWebhookSecret, 'MISSING');
      assert.equal(health.configuration.geminiApiKey, 'MISSING');
      assert.equal(health.configuration.publishingEnabled, false);
    });

    it('handles D1 failure gracefully and marks status FAIL', async () => {
      const brokenD1 = {
        prepare: () => {
          throw new Error('D1 unreachable');
        },
      } as unknown as D1Database;

      const brokenEnv: Env = { ...baseEnv, DB: brokenD1 };
      const health = await runHealthCheck(brokenEnv);
      assert.equal(health.ok, false);
      assert.equal(health.status, 'FAIL');
      assert.equal(health.dependencies.d1, 'FAIL');
    });
  });

  // -----------------------------------------------------------
  // 2. Telegram Connectivity Test
  // -----------------------------------------------------------
  describe('Telegram Connectivity Smoke Test', () => {
    it('verifies Telegram getMe without publishing any messages', async () => {
      const mockClient = new MockTelegramClient();
      const res = await testTelegramConnectivity(baseEnv, mockClient);

      assert.equal(res.ok, true);
      assert.equal(res.status, 'PASS');
      assert.equal(res.reachable, true);
      assert.equal(res.bot?.id, 987654321);
      assert.equal(res.bot?.isBot, true);
      assert.equal(mockClient.history.messages.length, 0, 'No messages published');
      assert.equal(mockClient.history.polls.length, 0, 'No polls published');
    });

    it('fails clearly when TELEGRAM_BOT_TOKEN is missing', async () => {
      const noTokenEnv: Env = { ...baseEnv, TELEGRAM_BOT_TOKEN: undefined };
      const res = await testTelegramConnectivity(noTokenEnv);

      assert.equal(res.ok, false);
      assert.equal(res.status, 'FAIL');
      assert.equal(res.reachable, false);
      assert.match(res.error || '', /TELEGRAM_BOT_TOKEN/);
    });

    it('handles client connection errors cleanly', async () => {
      const failingClient = {
        getMe: async () => {
          throw new Error('Unauthorized: 401 Invalid bot token');
        },
      } as unknown as MockTelegramClient;

      const res = await testTelegramConnectivity(baseEnv, failingClient);
      assert.equal(res.ok, false);
      assert.equal(res.status, 'FAIL');
      assert.match(res.error || '', /Unauthorized/);
    });
  });

  // -----------------------------------------------------------
  // 3. Gemini Connectivity Test
  // -----------------------------------------------------------
  describe('Gemini Connectivity Smoke Test', () => {
    it('verifies model reachability with minimal ping without generating full posts', async () => {
      const customPing = async () => 'PONG';
      const res = await testGeminiConnectivity(baseEnv, customPing);

      assert.equal(res.ok, true);
      assert.equal(res.status, 'PASS');
      assert.equal(res.reachable, true);
      assert.equal(res.model, 'gemini-2.5-flash');
      assert.equal(res.responsePreview, 'PONG');
    });

    it('fails when GEMINI_API_KEY is missing', async () => {
      const noKeyEnv: Env = { ...baseEnv, GEMINI_API_KEY: undefined };
      const res = await testGeminiConnectivity(noKeyEnv);

      assert.equal(res.ok, false);
      assert.equal(res.status, 'FAIL');
      assert.equal(res.reachable, false);
      assert.match(res.error || '', /GEMINI_API_KEY/);
    });

    it('sanitizes API keys if an error occurs during connection', async () => {
      const leakingErrorPing = async () => {
        throw new Error(`Failed to call Google API with key ${TEST_API_KEY}: Quota limit reached`);
      };

      const res = await testGeminiConnectivity(baseEnv, leakingErrorPing);
      assert.equal(res.ok, false);
      assert.equal(res.status, 'FAIL');
      assert.ok(!res.error?.includes(TEST_API_KEY), 'API key must be redacted from error message');
      assert.ok(res.error?.includes('[REDACTED_API_KEY]'));
    });
  });

  // -----------------------------------------------------------
  // 4. D1 Transactional Smoke Test
  // -----------------------------------------------------------
  describe('D1 Transactional Write/Read/Cleanup Test', () => {
    it('successfully writes, reads, and cleans up temporary smoke test record', async () => {
      const res = await testD1Transactional(db);

      assert.equal(res.ok, true);
      assert.equal(res.status, 'PASS');
      assert.equal(res.write, 'PASS');
      assert.equal(res.read, 'PASS');
      assert.equal(res.cleanup, 'PASS');

      // Verify no leftover test record
      const leftover = await db
        .prepare('SELECT * FROM interaction_locks WHERE interaction_id = ?')
        .bind(res.recordId)
        .first();
      assert.equal(leftover, null);
    });
  });

  // -----------------------------------------------------------
  // 5. Dry-Run Publish Test
  // -----------------------------------------------------------
  describe('Dry-Run Publish Pipeline Smoke Test', () => {
    it('proves Generation -> Quality Gate -> Interaction Planner -> D1 -> Telegram Payload with ZERO live publishing', async () => {
      const res = await testDryRunPublish(baseEnv);

      assert.equal(res.ok, true);
      assert.equal(res.status, 'PASS');
      assert.equal(res.generated, true);
      assert.equal(res.qualityGatePassed, true);
      assert.equal(res.interactionPlanned, true);
      assert.equal(res.d1Persisted, true);
      assert.equal(res.telegramPayloadValid, true);
      assert.equal(res.channelPublished, false);
      assert.equal(res.cleanupCompleted, true);
      assert.equal(res.sample.optionsCount, 2);
      assert.equal(res.errors.length, 0);

      // Verify clean DB state after test cleanup
      const postInDb = await db.prepare('SELECT * FROM posts WHERE id = ?').bind(res.sample.id).first();
      assert.equal(postInDb, null, 'Test post should be cleaned up');
    });

    it('detects and flags invalid scenario trade-offs during dry run quality check', async () => {
      const invalidDilemma = {
        title: 'Short',
        category: 'survival_stakes',
        format: 'impossible_dilemma',
        hook: 'Hook',
        setup: 'Setup',
        complication: 'Comp',
        question: 'Q',
        choices: [
          { label: 'Option A with no real consequence', tradeOff: '' }, // Missing trade-off
          { label: 'Option B', tradeOff: 'Consequence B' },
        ],
      };

      const res = await testDryRunPublish(baseEnv, { customDilemma: invalidDilemma });
      assert.equal(res.ok, false);
      assert.equal(res.qualityGatePassed, false);
      assert.ok(res.errors.some((e) => e.includes('trade-off')));
    });
  });

  // -----------------------------------------------------------
  // 6. Publishing Kill Switch
  // -----------------------------------------------------------
  describe('Publishing Kill-Switch Verification', () => {
    it('confirms MockTelegramClient is strictly active when PUBLISHING_ENABLED is false', () => {
      const envDisabled: Env = { ...baseEnv, PUBLISHING_ENABLED: 'false', DRY_RUN: 'false' };
      const killSwitch = verifyPublishingKillSwitch(envDisabled);

      assert.equal(killSwitch.status, 'PASS');
      assert.equal(killSwitch.publishingEnabled, false);
      assert.equal(killSwitch.clientType, 'MockTelegramClient');
      assert.equal(killSwitch.safeForProduction, true);
    });

    it('confirms MockTelegramClient is active when DRY_RUN is true even if PUBLISHING_ENABLED is true', () => {
      const envDryRun: Env = { ...baseEnv, PUBLISHING_ENABLED: 'true', DRY_RUN: 'true' };
      const killSwitch = verifyPublishingKillSwitch(envDryRun);

      assert.equal(killSwitch.publishingEnabled, true);
      assert.equal(killSwitch.dryRunMode, true);
      assert.equal(killSwitch.clientType, 'MockTelegramClient');
      assert.equal(killSwitch.safeForProduction, true);
    });

    it('flags active live publishing when both PUBLISHING_ENABLED is true and DRY_RUN is false', () => {
      const envLive: Env = { ...baseEnv, PUBLISHING_ENABLED: 'true', DRY_RUN: 'false' };
      const killSwitch = verifyPublishingKillSwitch(envLive);

      assert.equal(killSwitch.publishingEnabled, true);
      assert.equal(killSwitch.dryRunMode, false);
      assert.equal(killSwitch.clientType, 'HttpTelegramClient');
      assert.equal(killSwitch.safeForProduction, false);
    });
  });

  // -----------------------------------------------------------
  // 7. Full Suite Runner
  // -----------------------------------------------------------
  describe('Full Smoke Test Report', () => {
    it('runs entire suite and reports comprehensive summary', async () => {
      const report = await runFullSmokeTest(baseEnv, {
        telegramClient: new MockTelegramClient(),
        customGeminiPing: async () => 'PONG',
      });

      assert.equal(report.overallStatus, 'PASS');
      assert.equal(report.summary.health, 'PASS');
      assert.equal(report.summary.d1Transactional, 'PASS');
      assert.equal(report.summary.telegramConnectivity, 'PASS');
      assert.equal(report.summary.geminiConnectivity, 'PASS');
      assert.equal(report.summary.dryRunPublish, 'PASS');
      assert.equal(report.summary.killSwitch, 'PASS');
      assert.ok(report.timestamp);
    });
  });

  // -----------------------------------------------------------
  // 8. Worker Route Handling & Secret Authentication
  // -----------------------------------------------------------
  describe('Worker Fetch Routes & Authentication', () => {
    it('allows public access to /health', async () => {
      const req = new Request('http://localhost/health');
      const res = await worker.fetch(req, baseEnv);

      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.ok, true);
      assert.equal(data.worker, 'dilemmas-worker');
      assert.equal(data.dependencies.d1, 'PASS');
      assert.equal(data.configuration.telegramBotToken, 'CONFIGURED');
    });

    it('rejects unauthenticated requests to /smoke-test with 401', async () => {
      const req = new Request('http://localhost/smoke-test');
      const res = await worker.fetch(req, baseEnv);

      assert.equal(res.status, 401);
      const data = (await res.json()) as any;
      assert.equal(data.ok, false);
      assert.match(data.error, /Unauthorized/);
    });

    it('rejects invalid secret tokens with 401', async () => {
      const req = new Request('http://localhost/smoke-test', {
        headers: {
          'X-Smoke-Test-Secret': 'wrong_secret_token_123',
        },
      });
      const res = await worker.fetch(req, baseEnv);
      assert.equal(res.status, 401);
    });

    it('accepts valid secret token via X-Smoke-Test-Secret header', async () => {
      const req = new Request('http://localhost/smoke-test?action=kill-switch', {
        headers: {
          'X-Smoke-Test-Secret': TEST_SECRET,
        },
      });
      const res = await worker.fetch(req, baseEnv);
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.clientType, 'MockTelegramClient');
    });

    it('accepts valid secret token via X-Telegram-Bot-Api-Secret-Token header', async () => {
      const req = new Request('http://localhost/smoke/kill-switch', {
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': TEST_SECRET,
        },
      });
      const res = await worker.fetch(req, baseEnv);
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.status, 'PASS');
    });

    it('executes individual smoke test actions via subroutes', async () => {
      const req = new Request('http://localhost/smoke/d1', {
        headers: {
          'X-Smoke-Test-Secret': TEST_SECRET,
        },
      });
      const res = await worker.fetch(req, baseEnv);
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.write, 'PASS');
      assert.equal(data.read, 'PASS');
      assert.equal(data.cleanup, 'PASS');
    });
  });
});
