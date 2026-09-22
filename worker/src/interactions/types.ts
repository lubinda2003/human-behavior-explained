/**
 * Core types for Pick Your Fate Telegram Interaction Engine.
 * Represents entities persisted in Cloudflare D1 and domain models for
 * interaction lifecycles, Telegram payloads, and vote processing.
 */

export type LifecycleState =
  | 'DRAFT'
  | 'VALIDATED'
  | 'PUBLISHED'
  | 'OPEN'
  | 'CLOSED'
  | 'RESOLVING'
  | 'RESULT_POSTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type InteractionType =
  | 'poll'
  | 'open_discussion'
  | 'prediction_vote'
  | 'scenario_choice'
  | 'result_reveal';

export type CloseStrategy = 'scheduled' | 'manual' | 'never';

export type VoteStatus = 'active' | 'withdrawn' | 'changed';

export type ResultStatus = 'generated' | 'published' | 'failed';

export interface UserRecord {
  id: string;
  telegramUserId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  isBot: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface PostRecord {
  id: string;
  contentType: string;
  category: string;
  tone: string;
  stakes: string;
  layout: string;
  hookStyle: string;
  title: string;
  status: string;
  payload: Record<string, unknown>;
  parentPostId?: string | null;
  telegramMessageId?: number | null;
  telegramPollMessageId?: number | null;
  rawR2Key?: string | null;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PublishedMessageRecord {
  id: string;
  postId: string;
  telegramMessageId: number;
  telegramChatId: string;
  messageType: 'main_post' | 'native_poll' | 'result_reveal' | 'discussion_prompt';
  parseMode: 'HTML';
  textContent?: string | null;
  publishedAt: string;
}

export interface InteractionRecord {
  id: string;
  postId: string;
  interactionType: InteractionType;
  lifecycleState: LifecycleState;
  targetChatId: string;
  mainMessageId?: number | null;
  closeStrategy: CloseStrategy;
  durationSeconds?: number | null;
  opensAt?: string | null;
  closesAt?: string | null;
  closedAt?: string | null;
  resolvedAt?: string | null;
  resultPostId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PollRecord {
  id: string;
  interactionId: string;
  telegramPollId?: string | null;
  telegramMessageId?: number | null;
  question: string;
  pollType: 'regular' | 'quiz';
  isAnonymous: boolean;
  allowsMultipleAnswers: boolean;
  correctOptionId?: number | null;
  explanation?: string | null;
  openPeriodSeconds?: number | null;
  closeDate?: string | null;
  isClosed: boolean;
  totalVoterCount: number;
  createdAt: string;
  closedAt?: string | null;
}

export interface PollOptionRecord {
  id: string;
  pollId: string;
  optionIndex: number;
  optionText: string;
  tradeOff?: string | null;
  voteCount: number;
}

export interface VoteRecord {
  id: string;
  pollId: string;
  interactionId: string;
  userId: string;
  telegramUserId: number;
  selectedOptionIndices: number[];
  status: VoteStatus;
  version: number;
  votedAt: string;
  updatedAt: string;
}

export interface VoteDistributionItem {
  optionIndex: number;
  optionText: string;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

export interface ResultRecord {
  id: string;
  interactionId: string;
  postId: string;
  totalParticipants: number;
  winningOptionIndex?: number | null;
  winningOptionText?: string | null;
  winningPercentage?: number | null;
  voteDistribution: VoteDistributionItem[];
  payoff: Record<string, unknown>;
  revealText: string;
  resultPostMessageId?: number | null;
  status: ResultStatus;
  publishedAt?: string | null;
  createdAt: string;
}

export interface WebhookEventRecord {
  updateId: number;
  eventType: string;
  payloadJson?: string | null;
  receivedAt: string;
  processedAt?: string | null;
  status: 'processed' | 'ignored' | 'failed';
}

/** Telegram Bot API update models */
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramPollOption {
  text: string;
  voter_count: number;
}

export interface TelegramPoll {
  id: string;
  question: string;
  options: TelegramPollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: 'regular' | 'quiz';
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
}

export interface TelegramPollAnswer {
  poll_id: string;
  voter_chat?: { id: number; title?: string };
  user?: TelegramUser;
  option_ids: number[];
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: { id: number | string; type: string; title?: string };
  text?: string;
  poll?: TelegramPoll;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  poll?: TelegramPoll;
  poll_answer?: TelegramPollAnswer;
}

/** Send and stop poll parameters */
export interface SendPollParams {
  chat_id: string | number;
  question: string;
  options: string[];
  is_anonymous?: boolean;
  type?: 'regular' | 'quiz';
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  open_period?: number;
  close_date?: number;
  reply_to_message_id?: number;
}

export interface SendMessageParams {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  reply_to_message_id?: number;
  disable_web_page_preview?: boolean;
}

export interface StopPollParams {
  chat_id: string | number;
  message_id: number;
}
