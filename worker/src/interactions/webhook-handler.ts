import type { D1InteractionRepository } from './repository';
import type { VoteTracker } from './vote-tracker';
import type { TelegramUpdate } from './types';

export interface WebhookHandlerOptions {
  secretToken?: string;
}

export class TelegramWebhookHandler {
  constructor(
    private readonly repo: D1InteractionRepository,
    private readonly voteTracker: VoteTracker,
    private readonly options?: WebhookHandlerOptions,
  ) {}

  /**
   * Validates webhook authentication headers.
   * Safe error handling without logging or leaking secrets.
   */
  validateAuth(requestHeaders: Headers): boolean {
    const configuredSecret = this.options?.secretToken;
    if (!configuredSecret) {
      // No secret configured, allow (e.g. local development / tests)
      return true;
    }

    const providedSecret = requestHeaders.get('x-telegram-bot-api-secret-token');
    if (!providedSecret) {
      return false;
    }

    // Constant-time-like string comparison to avoid timing attacks
    if (providedSecret.length !== configuredSecret.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < providedSecret.length; i++) {
      mismatch |= providedSecret.charCodeAt(i) ^ configuredSecret.charCodeAt(i);
    }
    return mismatch === 0;
  }

  async handleUpdate(
    update: TelegramUpdate,
    requestHeaders?: Headers,
    nowIso?: string,
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const now = nowIso ?? new Date().toISOString();

    // 1. Webhook Authentication
    if (requestHeaders && !this.validateAuth(requestHeaders)) {
      console.warn('[TelegramWebhookHandler] Rejected unauthorized request: secret token mismatch');
      return {
        status: 401,
        body: { ok: false, error: 'Unauthorized: invalid secret token' },
      };
    }

    if (!update || typeof update.update_id !== 'number') {
      return {
        status: 400,
        body: { ok: false, error: 'Bad Request: missing update_id' },
      };
    }

    // 2. Idempotency & Deduplication
    const isNewEvent = await this.repo.recordWebhookEvent({
      updateId: update.update_id,
      eventType: update.poll_answer
        ? 'poll_answer'
        : update.poll
        ? 'poll'
        : update.message
        ? 'message'
        : 'other',
      payloadJson: JSON.stringify(update),
      receivedAt: now,
      status: 'processed',
    });

    if (!isNewEvent) {
      // Duplicate update already received; return 200 OK idempotently
      return {
        status: 200,
        body: { ok: true, duplicate: true, update_id: update.update_id },
      };
    }

    // 3. Process poll_answer (non-anonymous / direct user votes)
    if (update.poll_answer) {
      const voteResult = await this.voteTracker.processPollAnswer(update.poll_answer, now);
      return {
        status: 200,
        body: { ok: true, update_id: update.update_id, voteResult },
      };
    }

    // 4. Process poll updates (anonymous / channel polls)
    if (update.poll) {
      await this.repo.updatePollCountsFromTelegram(update.poll, now);
      return {
        status: 200,
        body: { ok: true, update_id: update.update_id, pollUpdated: true },
      };
    }

    // Other updates (e.g. service messages) acknowledged safely
    return {
      status: 200,
      body: { ok: true, update_id: update.update_id, acknowledged: true },
    };
  }
}
