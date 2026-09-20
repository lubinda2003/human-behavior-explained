/**
 * Mystery Live Telegram Adapter & Runner Test Suite (Phase 4)
 * Tests:
 * 1. LiveTelegramInvestigationAdapter credentials validation
 * 2. Telegram Bot API sendMessage call & response handling (mocked fetch)
 * 3. Telegram Bot API sendPhoto call & FormData handling (mocked fetch)
 * 4. Telegram Bot API sendPoll call & options validation (mocked fetch)
 * 5. Telegram API error response rejection & error propagation
 * 6. LiveMysteryTestRunner end-to-end orchestration with mocked Telegram API
 * 7. Verification of live-test-report.json generation and schema
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LiveTelegramInvestigationAdapter,
  LiveMysteryTestRunner,
  CURATED_MYSTERY_CASES,
  InvestigationStep,
  InvestigationModel,
} from '../src/pipeline/mystery/index.js';

describe('Live Telegram Investigation Adapter & Runner (Phase 4)', () => {
  const sampleCase = CURATED_MYSTERY_CASES[0];
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = originalFetch;
  });

  afterEach(() => {
    // Restore fetch
    global.fetch = originalFetch;
  });

  describe('1. Adapter Credentials & Validation', () => {
    it('throws when attempting dispatch without TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID', async () => {
      const adapter = new LiveTelegramInvestigationAdapter('', '');
      const step: InvestigationStep = {
        stepNumber: 1,
        format: 'CASE_INTRO',
        draft: InvestigationModel.buildCaseIntroDraft(sampleCase),
      };

      await assert.rejects(
        async () => {
          await adapter.sendCaseIntro(step);
        },
        /TELEGRAM_BOT_TOKEN is required/
      );
    });

    it('rejects investigation poll with fewer than 2 options', async () => {
      const adapter = new LiveTelegramInvestigationAdapter('mock_token', '@mock_channel');
      const brokenPollStep: InvestigationStep = {
        stepNumber: 3,
        format: 'INVESTIGATION_POLL',
        draft: {
          caseId: sampleCase.caseId,
          caseTitle: sampleCase.title,
          format: 'INVESTIGATION_POLL',
          headline: 'Invalid Poll',
          hook: 'Vote hook',
          bodyParagraphs: ['Vote body'],
          poll: {
            question: 'Which suspect?',
            options: ['Only one option'], // Invalid
          },
        },
      };

      await assert.rejects(
        async () => {
          await adapter.sendInvestigationPoll(brokenPollStep);
        },
        /minimum 2 options required/
      );
    });
  });

  describe('2. Telegram API HTTP Methods Mocking', () => {
    it('sends text message via Telegram sendMessage API', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

      global.fetch = async (url: any, init?: any) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            ok: true,
            result: { message_id: 88210 },
          }),
        } as any;
      };

      const adapter = new LiveTelegramInvestigationAdapter('test_bot_123', '@mystery_channel');
      const step: InvestigationStep = {
        stepNumber: 1,
        format: 'CASE_INTRO',
        draft: InvestigationModel.buildCaseIntroDraft(sampleCase),
      };

      const result = await adapter.sendCaseIntro(step);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.messageId, 88210);
      assert.ok(capturedUrl.includes('api.telegram.org/bottest_bot_123/sendMessage'));
      assert.strictEqual(capturedBody.chat_id, '@mystery_channel');
      assert.strictEqual(capturedBody.parse_mode, 'HTML');
      assert.ok(capturedBody.text.includes('The Locked Conservatory'));
    });

    it('sends photo with caption via Telegram sendPhoto API', async () => {
      let capturedUrl = '';
      let capturedMethod = '';

      // Create a temporary dummy image
      const tempImgPath = path.resolve(process.cwd(), 'data', 'test-adapter-dummy.png');
      fs.writeFileSync(tempImgPath, Buffer.from('fake-png-data'));

      global.fetch = async (url: any, init?: any) => {
        capturedUrl = String(url);
        capturedMethod = init.method;
        return {
          ok: true,
          json: async () => ({
            ok: true,
            result: { message_id: 99401 },
          }),
        } as any;
      };

      try {
        const adapter = new LiveTelegramInvestigationAdapter('test_bot_456', '@mystery_channel');
        const step: InvestigationStep = {
          stepNumber: 2,
          format: 'EVIDENCE',
          draft: InvestigationModel.buildEvidenceDraft(sampleCase, sampleCase.evidence[0]),
        };

        const result = await adapter.sendEvidence(step, { visualFilePath: tempImgPath });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.messageId, 99401);
        assert.strictEqual(result.hasVisual, true);
        assert.ok(capturedUrl.includes('api.telegram.org/bottest_bot_456/sendPhoto'));
        assert.strictEqual(capturedMethod, 'POST');
      } finally {
        if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);
      }
    });

    it('sends interactive poll via Telegram sendPoll API', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

      global.fetch = async (url: any, init?: any) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            ok: true,
            result: {
              message_id: 77102,
              poll: { id: 'poll_unique_9981' },
            },
          }),
        } as any;
      };

      const adapter = new LiveTelegramInvestigationAdapter('test_bot_789', '@mystery_channel');
      const step: InvestigationStep = {
        stepNumber: 3,
        format: 'INVESTIGATION_POLL',
        draft: InvestigationModel.buildInvestigationPollDraft(sampleCase),
      };

      const result = await adapter.sendInvestigationPoll(step);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.messageId, 77102);
      assert.strictEqual(result.pollId, 'poll_unique_9981');
      assert.ok(capturedUrl.includes('api.telegram.org/bottest_bot_789/sendPoll'));
      assert.strictEqual(capturedBody.chat_id, '@mystery_channel');
      assert.ok(capturedBody.options.length >= 2);
    });

    it('handles Telegram API error responses and throws descriptive exception', async () => {
      global.fetch = async () => {
        return {
          ok: true,
          json: async () => ({
            ok: false,
            description: 'Bad Request: chat not found',
          }),
        } as any;
      };

      const adapter = new LiveTelegramInvestigationAdapter('test_bot_err', '@invalid_chat');
      const step: InvestigationStep = {
        stepNumber: 1,
        format: 'CASE_INTRO',
        draft: InvestigationModel.buildCaseIntroDraft(sampleCase),
      };

      await assert.rejects(
        async () => {
          await adapter.sendCaseIntro(step);
        },
        /Telegram sendMessage API error: Bad Request: chat not found/
      );
    });
  });

  describe('3. End-to-End Live Mystery Test Runner Orchestration', () => {
    it('executes full live mystery test flow with mocked Telegram endpoints and writes live-test-report.json', async () => {
      let messageCounter = 10000;
      let pollCounter = 40000;

      global.fetch = async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/sendPoll')) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              result: {
                message_id: ++messageCounter,
                poll: { id: `live_poll_${++pollCounter}` },
              },
            }),
          } as any;
        }

        return {
          ok: true,
          json: async () => ({
            ok: true,
            result: {
              message_id: ++messageCounter,
            },
          }),
        } as any;
      };

      const testOutputDir = path.resolve(process.cwd(), 'data', 'test-live-run-temp');

      const report = await LiveMysteryTestRunner.runLiveTest({
        botToken: 'mock_test_token_xyz',
        channelId: '@test_mystery_channel',
        caseIndex: 0,
        selectedChoiceIndex: 1,
        outputDirectory: testOutputDir,
      });

      assert.strictEqual(report.caseId, sampleCase.caseId);
      assert.strictEqual(report.status, 'RESOLVED');
      assert.strictEqual(report.steps.length, 5);
      assert.strictEqual(report.qcResults.caseValid, true);
      assert.strictEqual(report.qcResults.visualsValid, true);
      assert.strictEqual(report.qcResults.pacingValid, true);
      assert.strictEqual(report.qcResults.telegramHtmlValid, true);

      // Verify report file
      const reportFile = path.join(testOutputDir, 'live-test-report.json');
      assert.ok(fs.existsSync(reportFile));

      const parsedReport = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
      assert.strictEqual(parsedReport.caseId, sampleCase.caseId);
      assert.strictEqual(parsedReport.status, 'RESOLVED');
      assert.strictEqual(parsedReport.steps.length, 5);

      // Verify each step record
      assert.strictEqual(parsedReport.steps[0].stepType, 'CASE_INTRO');
      assert.ok(parsedReport.steps[0].messageId > 0);

      assert.strictEqual(parsedReport.steps[1].stepType, 'EVIDENCE');
      assert.ok(parsedReport.steps[1].messageId > 0);

      assert.strictEqual(parsedReport.steps[2].stepType, 'INVESTIGATION_POLL');
      assert.ok(parsedReport.steps[2].pollId.startsWith('live_poll_'));

      assert.strictEqual(parsedReport.steps[3].stepType, 'CLUE_REVEAL');
      assert.ok(parsedReport.steps[3].messageId > 0);

      assert.strictEqual(parsedReport.steps[4].stepType, 'FINAL_REVEAL');
      assert.ok(parsedReport.steps[4].messageId > 0);

      // Clean up test directory
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    });
  });
});
