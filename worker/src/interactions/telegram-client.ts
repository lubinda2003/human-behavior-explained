import type {
  SendMessageParams,
  SendPollParams,
  StopPollParams,
  TelegramMessage,
  TelegramPoll,
  TelegramUser,
} from './types';

export type {
  SendMessageParams,
  SendPollParams,
  StopPollParams,
  TelegramMessage,
  TelegramPoll,
  TelegramUser,
};

export interface TelegramClient {
  getMe(): Promise<TelegramUser>;
  sendMessage(params: SendMessageParams): Promise<TelegramMessage>;
  sendPoll(params: SendPollParams): Promise<TelegramMessage>;
  stopPoll(params: StopPollParams): Promise<TelegramPoll>;
}

export interface TelegramCallHistory {
  messages: SendMessageParams[];
  polls: SendPollParams[];
  stoppedPolls: StopPollParams[];
}

/**
 * MockTelegramClient simulates the Telegram Bot API in dry-run mode or during unit/integration tests.
 * Never makes real HTTP calls; generates deterministic, valid Telegram responses.
 */
export class MockTelegramClient implements TelegramClient {
  private static globalMessageCounter = 1000;
  private static globalPollCounter = 5000;
  private nextFailure: Error | null = null;
  public readonly history: TelegramCallHistory = {
    messages: [],
    polls: [],
    stoppedPolls: [],
  };

  private activePolls = new Map<string, TelegramPoll>();

  public reset(): void {
    this.history.messages = [];
    this.history.polls = [];
    this.history.stoppedPolls = [];
    this.activePolls.clear();
    this.nextFailure = null;
  }

  public failNext(errorMessage: string): void {
    this.nextFailure = new Error(errorMessage);
  }

  private checkFailure(): void {
    if (this.nextFailure) {
      const err = this.nextFailure;
      this.nextFailure = null;
      throw err;
    }
  }

  async getMe(): Promise<TelegramUser> {
    this.checkFailure();
    return {
      id: 987654321,
      is_bot: true,
      first_name: 'PickYourFateBot',
      username: 'PickYourFateBot',
    };
  }

  async sendMessage(params: SendMessageParams): Promise<TelegramMessage> {
    this.checkFailure();
    this.history.messages.push({ ...params });
    const msgId = ++MockTelegramClient.globalMessageCounter;
    return {
      message_id: msgId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: params.chat_id, type: 'channel' },
      text: params.text,
    };
  }

  async sendPoll(params: SendPollParams): Promise<TelegramMessage> {
    this.checkFailure();
    this.history.polls.push({ ...params });
    const msgId = ++MockTelegramClient.globalMessageCounter;
    const pollId = `tg_poll_${++MockTelegramClient.globalPollCounter}`;

    const poll: TelegramPoll = {
      id: pollId,
      question: params.question,
      options: params.options.map((text) => ({ text, voter_count: 0 })),
      total_voter_count: 0,
      is_closed: false,
      is_anonymous: params.is_anonymous ?? true,
      type: params.type ?? 'regular',
      allows_multiple_answers: params.allows_multiple_answers ?? false,
      correct_option_id: params.correct_option_id,
      explanation: params.explanation,
    };

    this.activePolls.set(pollId, poll);

    return {
      message_id: msgId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: params.chat_id, type: 'channel' },
      poll,
    };
  }

  async stopPoll(params: StopPollParams): Promise<TelegramPoll> {
    this.checkFailure();
    this.history.stoppedPolls.push({ ...params });

    // Look for poll associated with this message id if recorded
    for (const [id, poll] of this.activePolls.entries()) {
      poll.is_closed = true;
      return poll;
    }

    return {
      id: `tg_poll_stopped_${params.message_id}`,
      question: 'Stopped poll',
      options: [],
      total_voter_count: 0,
      is_closed: true,
      is_anonymous: false,
      type: 'regular',
      allows_multiple_answers: false,
    };
  }
}

/**
 * HttpTelegramClient makes genuine Telegram Bot API HTTP requests.
 */
export class HttpTelegramClient implements TelegramClient {
  private readonly baseUrl: string;

  constructor(botToken: string) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async getMe(): Promise<TelegramUser> {
    const res = await fetch(`${this.baseUrl}/getMe`, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });

    const data = (await res.json()) as { ok: boolean; result?: TelegramUser; description?: string };
    if (!data.ok || !data.result) {
      throw new Error(`Telegram getMe failed: ${data.description || res.statusText}`);
    }
    return data.result;
  }

  async sendMessage(params: SendMessageParams): Promise<TelegramMessage> {
    const res = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });

    const data = (await res.json()) as { ok: boolean; result?: TelegramMessage; description?: string };
    if (!data.ok || !data.result) {
      throw new Error(`Telegram sendMessage failed: ${data.description || res.statusText}`);
    }
    return data.result;
  }

  async sendPoll(params: SendPollParams): Promise<TelegramMessage> {
    const res = await fetch(`${this.baseUrl}/sendPoll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });

    const data = (await res.json()) as { ok: boolean; result?: TelegramMessage; description?: string };
    if (!data.ok || !data.result) {
      throw new Error(`Telegram sendPoll failed: ${data.description || res.statusText}`);
    }
    return data.result;
  }

  async stopPoll(params: StopPollParams): Promise<TelegramPoll> {
    const res = await fetch(`${this.baseUrl}/stopPoll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });

    const data = (await res.json()) as { ok: boolean; result?: TelegramPoll; description?: string };
    if (!data.ok || !data.result) {
      throw new Error(`Telegram stopPoll failed: ${data.description || res.statusText}`);
    }
    return data.result;
  }
}
