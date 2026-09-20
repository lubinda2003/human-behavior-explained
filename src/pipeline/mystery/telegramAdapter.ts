/**
 * Telegram Investigation Adapter & Mock Runner
 * Provides a clean adapter layer for dispatching multi-step investigation content to Telegram.
 * Supports offline mocking and deterministic CI execution without requiring real bot credentials.
 */

import {
  InvestigationStep,
  TelegramDispatchResult,
  TelegramPollResult,
  SelectedChoiceRecord,
  InvestigationChoice,
} from './types.js';
import { MysteryContentFormatter } from './contentFormatter.js';
import { MysteryQualityChecker } from './quality.js';

export interface TelegramSendOptions {
  chatId?: string;
  visualFilePath?: string;
  disableNotification?: boolean;
}

export interface InvestigationTelegramAdapter {
  sendCaseIntro(step: InvestigationStep, options?: TelegramSendOptions): Promise<TelegramDispatchResult>;
  sendEvidence(step: InvestigationStep, options?: TelegramSendOptions): Promise<TelegramDispatchResult>;
  sendInvestigationPoll(step: InvestigationStep, options?: TelegramSendOptions): Promise<TelegramDispatchResult>;
  processPollResult(
    pollId: string,
    pollResult: TelegramPollResult,
    availableChoices: InvestigationChoice[]
  ): Promise<SelectedChoiceRecord>;
  sendClueReveal(step: InvestigationStep, options?: TelegramSendOptions): Promise<TelegramDispatchResult>;
  sendFinalReveal(step: InvestigationStep, options?: TelegramSendOptions): Promise<TelegramDispatchResult>;
}

export class MockTelegramInvestigationAdapter implements InvestigationTelegramAdapter {
  public dispatchedMessages: TelegramDispatchResult[] = [];
  public dispatchedPolls: Array<{ pollId: string; question: string; options: string[] }> = [];
  private messageCounter = 1000;
  private pollCounter = 5000;
  private simulatedWinningIndex = 0;

  constructor(defaultWinningIndex = 0) {
    this.simulatedWinningIndex = defaultWinningIndex;
  }

  public setSimulatedWinningOption(index: number): void {
    this.simulatedWinningIndex = index;
  }

  public async sendCaseIntro(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchStep('CASE_INTRO', step, options);
  }

  public async sendEvidence(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchStep('EVIDENCE', step, options);
  }

  public async sendInvestigationPoll(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    const formattedText = MysteryContentFormatter.formatPost(step.draft);
    this.validateHtml(formattedText);

    const pollId = `mock-poll-${++this.pollCounter}`;
    const pollDef = step.draft.poll || {
      question: 'Select an investigative lead:',
      options: ['Option A', 'Option B', 'Option C'],
    };

    this.dispatchedPolls.push({
      pollId,
      question: pollDef.question,
      options: pollDef.options,
    });

    const result: TelegramDispatchResult = {
      success: true,
      messageId: ++this.messageCounter,
      pollId,
      stepType: 'INVESTIGATION_POLL',
      formattedText,
      hasVisual: false,
      dispatchedAt: new Date().toISOString(),
    };

    this.dispatchedMessages.push(result);
    return result;
  }

  public async processPollResult(
    pollId: string,
    pollResult: TelegramPollResult,
    availableChoices: InvestigationChoice[]
  ): Promise<SelectedChoiceRecord> {
    const winningIdx = pollResult.winningOptionIndex ?? this.simulatedWinningIndex;
    const choice = availableChoices[winningIdx] || availableChoices[0];

    if (!choice) {
      throw new Error(`No available choice found for winning poll index ${winningIdx}`);
    }

    const winningOption = pollResult.options[winningIdx];
    const totalVotes = pollResult.totalVoters || 100;
    const voterCount = winningOption?.voterCount || Math.round(totalVotes * 0.58);
    const votePercentage = Math.round((voterCount / Math.max(totalVotes, 1)) * 100);

    return {
      choiceId: choice.id,
      optionIndex: choice.optionIndex,
      label: choice.label,
      targetBranchId: choice.targetBranchId,
      votePercentage,
      totalVotes,
      selectedAt: new Date().toISOString(),
    };
  }

  public async sendClueReveal(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchStep('CLUE_REVEAL', step, options);
  }

  public async sendFinalReveal(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchStep('FINAL_REVEAL', step, options);
  }

  private async dispatchStep(
    stepType: 'CASE_INTRO' | 'EVIDENCE' | 'CLUE_REVEAL' | 'FINAL_REVEAL',
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    const formattedText = MysteryContentFormatter.formatPost(step.draft);
    this.validateHtml(formattedText);

    const result: TelegramDispatchResult = {
      success: true,
      messageId: ++this.messageCounter,
      stepType,
      formattedText,
      hasVisual: !!options?.visualFilePath,
      visualPath: options?.visualFilePath,
      dispatchedAt: new Date().toISOString(),
    };

    this.dispatchedMessages.push(result);
    return result;
  }

  private validateHtml(html: string): void {
    const qc = MysteryQualityChecker.validateTelegramHtml(html);
    if (!qc.isValid) {
      throw new Error(`Telegram HTML validation failed on mock dispatch: ${qc.errors.join(', ')}`);
    }
  }
}

export class LiveTelegramInvestigationAdapter implements InvestigationTelegramAdapter {
  private botToken: string;
  private channelId: string;

  constructor(customBotToken?: string, customChannelId?: string) {
    this.botToken =
      customBotToken !== undefined
        ? customBotToken
        : process.env.TELEGRAM_BOT_TOKEN || '';
    this.channelId =
      customChannelId !== undefined
        ? customChannelId
        : process.env.TELEGRAM_CHANNEL_ID || '';

    if (!this.botToken) {
      console.warn('⚠️ LiveTelegramInvestigationAdapter initialized without TELEGRAM_BOT_TOKEN.');
    }
    if (!this.channelId) {
      console.warn('⚠️ LiveTelegramInvestigationAdapter initialized without TELEGRAM_CHANNEL_ID.');
    }
  }

  public async sendCaseIntro(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchPostWithVisual('CASE_INTRO', step, options);
  }

  public async sendEvidence(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchPostWithVisual('EVIDENCE', step, options);
  }

  public async sendInvestigationPoll(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    this.ensureCredentials();

    const formattedText = MysteryContentFormatter.formatPost(step.draft);
    this.validateHtml(formattedText);

    const poll = step.draft.poll;
    if (!poll || !Array.isArray(poll.options) || poll.options.length < 2) {
      throw new Error('Cannot send investigation poll: missing poll question or options (minimum 2 options required).');
    }

    const targetChatId = options?.chatId || this.channelId;
    const question = poll.question.slice(0, 300);
    const pollOptions = poll.options.map((opt) => opt.slice(0, 100));

    const url = `https://api.telegram.org/bot${this.botToken}/sendPoll`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        question,
        options: pollOptions,
        is_anonymous: false,
        type: 'regular',
        disable_notification: options?.disableNotification ?? false,
      }),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: {
        message_id: number;
        poll?: { id: string };
      };
      description?: string;
    };

    if (!data.ok || !data.result) {
      throw new Error(`Telegram sendPoll API error: ${data.description || 'Unknown error'}`);
    }

    return {
      success: true,
      messageId: data.result.message_id,
      pollId: data.result.poll?.id || String(data.result.message_id),
      stepType: 'INVESTIGATION_POLL',
      formattedText,
      hasVisual: false,
      dispatchedAt: new Date().toISOString(),
    };
  }

  public async processPollResult(
    pollId: string,
    pollResult: TelegramPollResult,
    availableChoices: InvestigationChoice[]
  ): Promise<SelectedChoiceRecord> {
    const winningIdx = pollResult.winningOptionIndex ?? 0;
    const choice = availableChoices[winningIdx] || availableChoices[0];

    if (!choice) {
      throw new Error(`No available choice found for winning poll index ${winningIdx}`);
    }

    const winningOption = pollResult.options[winningIdx];
    const totalVotes = pollResult.totalVoters || 1;
    const voterCount = winningOption?.voterCount || 1;
    const votePercentage = Math.round((voterCount / Math.max(totalVotes, 1)) * 100);

    return {
      choiceId: choice.id,
      optionIndex: choice.optionIndex,
      label: choice.label,
      targetBranchId: choice.targetBranchId,
      votePercentage,
      totalVotes,
      selectedAt: new Date().toISOString(),
    };
  }

  public async sendClueReveal(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchPostWithVisual('CLUE_REVEAL', step, options);
  }

  public async sendFinalReveal(
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    return this.dispatchPostWithVisual('FINAL_REVEAL', step, options);
  }

  private async dispatchPostWithVisual(
    stepType: 'CASE_INTRO' | 'EVIDENCE' | 'CLUE_REVEAL' | 'FINAL_REVEAL',
    step: InvestigationStep,
    options?: TelegramSendOptions
  ): Promise<TelegramDispatchResult> {
    this.ensureCredentials();

    const formattedText = MysteryContentFormatter.formatPost(step.draft);
    this.validateHtml(formattedText);

    const targetChatId = options?.chatId || this.channelId;

    if (options?.visualFilePath) {
      const fs = await import('node:fs');
      if (fs.existsSync(options.visualFilePath)) {
        return this.sendPhotoWithText(targetChatId, options.visualFilePath, formattedText, stepType, options?.disableNotification);
      }
    }

    return this.sendTextMessage(targetChatId, formattedText, stepType, options?.disableNotification);
  }

  private async sendTextMessage(
    chatId: string,
    text: string,
    stepType: 'CASE_INTRO' | 'EVIDENCE' | 'CLUE_REVEAL' | 'FINAL_REVEAL',
    disableNotification?: boolean
  ): Promise<TelegramDispatchResult> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        disable_notification: disableNotification ?? false,
      }),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!data.ok || !data.result) {
      throw new Error(`Telegram sendMessage API error: ${data.description || 'Unknown error'}`);
    }

    return {
      success: true,
      messageId: data.result.message_id,
      stepType,
      formattedText: text,
      hasVisual: false,
      dispatchedAt: new Date().toISOString(),
    };
  }

  private async sendPhotoWithText(
    chatId: string,
    photoPath: string,
    captionText: string,
    stepType: 'CASE_INTRO' | 'EVIDENCE' | 'CLUE_REVEAL' | 'FINAL_REVEAL',
    disableNotification?: boolean
  ): Promise<TelegramDispatchResult> {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;

    const fileBuffer = fs.readFileSync(photoPath);
    const fileName = path.basename(photoPath) || 'mystery-visual.png';
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', blob, fileName);
    formData.append('parse_mode', 'HTML');
    formData.append('caption', captionText.slice(0, 1024));
    if (disableNotification) {
      formData.append('disable_notification', 'true');
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };

    if (!data.ok || !data.result) {
      throw new Error(`Telegram sendPhoto API error: ${data.description || 'Unknown error'}`);
    }

    return {
      success: true,
      messageId: data.result.message_id,
      stepType,
      formattedText: captionText,
      hasVisual: true,
      visualPath: photoPath,
      dispatchedAt: new Date().toISOString(),
    };
  }

  private ensureCredentials(): void {
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for live Telegram publishing.');
    }
    if (!this.channelId) {
      throw new Error('TELEGRAM_CHANNEL_ID is required for live Telegram publishing.');
    }
  }

  private validateHtml(html: string): void {
    const qc = MysteryQualityChecker.validateTelegramHtml(html);
    if (!qc.isValid) {
      throw new Error(`Telegram HTML validation failed on live dispatch: ${qc.errors.join(', ')}`);
    }
  }
}

