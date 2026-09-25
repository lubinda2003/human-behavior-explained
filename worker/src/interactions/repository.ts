import type {
  CompletedContinuationContext,
  InteractionRecord,
  LifecycleState,
  PollOptionRecord,
  PollRecord,
  PostRecord,
  PublishedMessageRecord,
  ResultRecord,
  TelegramPoll,
  UserRecord,
  VoteRecord,
  WebhookEventRecord,
} from './types';
import { assertValidTransition } from './lifecycle';

export class D1InteractionRepository {
  constructor(private readonly db: D1Database) {}

  // ---------------------------------------------------------
  // USERS
  // ---------------------------------------------------------

  async upsertUser(user: {
    telegramUserId: number;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    languageCode?: string | null;
    isBot?: boolean;
    nowIso?: string;
  }): Promise<UserRecord> {
    const now = user.nowIso ?? new Date().toISOString();
    const id = `user_${user.telegramUserId}`;

    await this.db
      .prepare(
        `INSERT INTO users (id, telegram_user_id, username, first_name, last_name, language_code, is_bot, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (telegram_user_id) DO UPDATE SET
           username = excluded.username,
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           language_code = excluded.language_code,
           last_seen_at = excluded.last_seen_at`,
      )
      .bind(
        id,
        user.telegramUserId,
        user.username ?? null,
        user.firstName ?? null,
        user.lastName ?? null,
        user.languageCode ?? null,
        user.isBot ? 1 : 0,
        now,
        now,
      )
      .run();

    return {
      id,
      telegramUserId: user.telegramUserId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      languageCode: user.languageCode,
      isBot: user.isBot ?? false,
      firstSeenAt: now,
      lastSeenAt: now,
    };
  }

  async getUserByTelegramId(telegramUserId: number): Promise<UserRecord | null> {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE telegram_user_id = ?')
      .bind(telegramUserId)
      .first<any>();

    if (!row) return null;
    return {
      id: row.id,
      telegramUserId: row.telegram_user_id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      languageCode: row.language_code,
      isBot: Boolean(row.is_bot),
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
    };
  }

  // ---------------------------------------------------------
  // POSTS
  // ---------------------------------------------------------

  async createPost(post: PostRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO posts (
          id, content_type, category, tone, stakes, layout, hook_style, title,
          status, payload_json, parent_post_id, telegram_message_id, telegram_poll_message_id,
          raw_r2_key, scheduled_for, published_at, failure_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        post.id,
        post.contentType,
        post.category,
        post.tone,
        post.stakes,
        post.layout,
        post.hookStyle,
        post.title,
        post.status,
        JSON.stringify(post.payload),
        post.parentPostId ?? null,
        post.telegramMessageId ?? null,
        post.telegramPollMessageId ?? null,
        post.rawR2Key ?? null,
        post.scheduledFor ?? null,
        post.publishedAt ?? null,
        post.failureReason ?? null,
        post.createdAt,
        post.updatedAt ?? post.createdAt,
      )
      .run();
  }

  async getPost(id: string): Promise<PostRecord | null> {
    const row = await this.db.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<any>();
    if (!row) return null;
    return {
      id: row.id,
      contentType: row.content_type,
      category: row.category,
      tone: row.tone,
      stakes: row.stakes,
      layout: row.layout,
      hookStyle: row.hook_style,
      title: row.title,
      status: row.status,
      payload: JSON.parse(row.payload_json),
      parentPostId: row.parent_post_id,
      telegramMessageId: row.telegram_message_id,
      telegramPollMessageId: row.telegram_poll_message_id,
      rawR2Key: row.raw_r2_key,
      scheduledFor: row.scheduled_for,
      publishedAt: row.published_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updatePostStatus(
    id: string,
    status: string,
    extra?: {
      publishedAt?: string;
      telegramMessageId?: number;
      telegramPollMessageId?: number;
      failureReason?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE posts SET
          status = ?,
          published_at = COALESCE(?, published_at),
          telegram_message_id = COALESCE(?, telegram_message_id),
          telegram_poll_message_id = COALESCE(?, telegram_poll_message_id),
          failure_reason = COALESCE(?, failure_reason),
          updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        status,
        extra?.publishedAt ?? null,
        extra?.telegramMessageId ?? null,
        extra?.telegramPollMessageId ?? null,
        extra?.failureReason ?? null,
        now,
        id,
      )
      .run();
  }

  async getRecentPosts(limit: number = 10): Promise<PostRecord[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT ?')
      .bind(limit)
      .all<any>();

    return (results || []).map((row) => ({
      id: row.id,
      contentType: row.content_type,
      category: row.category,
      tone: row.tone,
      stakes: row.stakes,
      layout: row.layout,
      hookStyle: row.hook_style,
      title: row.title,
      status: row.status,
      payload: JSON.parse(row.payload_json || '{}'),
      parentPostId: row.parent_post_id,
      telegramMessageId: row.telegram_message_id,
      telegramPollMessageId: row.telegram_poll_message_id,
      rawR2Key: row.raw_r2_key,
      scheduledFor: row.scheduled_for,
      publishedAt: row.published_at,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // ---------------------------------------------------------
  // PUBLISHED MESSAGES
  // ---------------------------------------------------------

  async createPublishedMessage(msg: PublishedMessageRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO published_messages (
          id, post_id, telegram_message_id, telegram_chat_id, message_type, parse_mode, text_content, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        msg.id,
        msg.postId,
        msg.telegramMessageId,
        msg.telegramChatId,
        msg.messageType,
        msg.parseMode,
        msg.textContent ?? null,
        msg.publishedAt,
      )
      .run();
  }

  async getPublishedMessagesForPost(postId: string): Promise<PublishedMessageRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM published_messages WHERE post_id = ? ORDER BY published_at ASC')
      .bind(postId)
      .all<any>();

    return (result.results ?? []).map((row) => ({
      id: row.id,
      postId: row.post_id,
      telegramMessageId: row.telegram_message_id,
      telegramChatId: row.telegram_chat_id,
      messageType: row.message_type,
      parseMode: row.parse_mode,
      textContent: row.text_content,
      publishedAt: row.published_at,
    }));
  }

  // ---------------------------------------------------------
  // INTERACTIONS
  // ---------------------------------------------------------

  async createInteraction(interaction: InteractionRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO interactions (
          id, post_id, interaction_type, lifecycle_state, target_chat_id, main_message_id,
          close_strategy, duration_seconds, opens_at, closes_at, closed_at, resolved_at,
          result_post_id, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        interaction.id,
        interaction.postId,
        interaction.interactionType,
        interaction.lifecycleState,
        interaction.targetChatId,
        interaction.mainMessageId ?? null,
        interaction.closeStrategy,
        interaction.durationSeconds ?? null,
        interaction.opensAt ?? null,
        interaction.closesAt ?? null,
        interaction.closedAt ?? null,
        interaction.resolvedAt ?? null,
        interaction.resultPostId ?? null,
        interaction.metadata ? JSON.stringify(interaction.metadata) : null,
        interaction.createdAt || new Date().toISOString(),
        interaction.updatedAt || interaction.createdAt || new Date().toISOString(),
      )
      .run();
  }

  async getInteraction(id: string): Promise<InteractionRecord | null> {
    const row = await this.db.prepare('SELECT * FROM interactions WHERE id = ?').bind(id).first<any>();
    if (!row) return null;
    return this.mapInteractionRow(row);
  }

  async getInteractionByPostId(postId: string): Promise<InteractionRecord | null> {
    const row = await this.db.prepare('SELECT * FROM interactions WHERE post_id = ?').bind(postId).first<any>();
    if (!row) return null;
    return this.mapInteractionRow(row);
  }

  async getInteractionsDueForClosure(nowIso: string): Promise<InteractionRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM interactions
         WHERE lifecycle_state = 'OPEN'
           AND closes_at IS NOT NULL
           AND closes_at <= ?
         ORDER BY closes_at ASC`,
      )
      .bind(nowIso)
      .all<any>();

    return (result.results ?? []).map((row) => this.mapInteractionRow(row));
  }

  /**
   * Atomic closure: conditionally transition from OPEN to CLOSED.
   * Returns true if this invocation successfully locked and closed the interaction.
   * If another worker already closed it, returns false (safe idempotency).
   */
  async atomicCloseInteraction(id: string, closedAt: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE interactions
         SET lifecycle_state = 'CLOSED', closed_at = ?, updated_at = ?
         WHERE id = ? AND lifecycle_state = 'OPEN'`,
      )
      .bind(closedAt, closedAt, id)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  async updateInteractionLifecycle(
    id: string,
    nextState: LifecycleState,
    extra?: Partial<InteractionRecord>,
  ): Promise<boolean> {
    const current = await this.getInteraction(id);
    if (!current) {
      throw new Error(`Interaction ${id} not found`);
    }

    assertValidTransition(current.lifecycleState, nextState, id);

    const now = new Date().toISOString();
    const result = await this.db
      .prepare(
        `UPDATE interactions SET
          lifecycle_state = ?,
          opens_at = COALESCE(?, opens_at),
          closed_at = COALESCE(?, closed_at),
          resolved_at = COALESCE(?, resolved_at),
          result_post_id = COALESCE(?, result_post_id),
          main_message_id = COALESCE(?, main_message_id),
          updated_at = ?
         WHERE id = ? AND lifecycle_state = ?`,
      )
      .bind(
        nextState,
        extra?.opensAt ?? null,
        extra?.closedAt ?? null,
        extra?.resolvedAt ?? null,
        extra?.resultPostId ?? null,
        extra?.mainMessageId ?? null,
        now,
        id,
        current.lifecycleState,
      )
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  private mapInteractionRow(row: any): InteractionRecord {
    return {
      id: row.id,
      postId: row.post_id,
      interactionType: row.interaction_type,
      lifecycleState: row.lifecycle_state,
      targetChatId: row.target_chat_id,
      mainMessageId: row.main_message_id,
      closeStrategy: row.close_strategy,
      durationSeconds: row.duration_seconds,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
      closedAt: row.closed_at,
      resolvedAt: row.resolved_at,
      resultPostId: row.result_post_id,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ---------------------------------------------------------
  // POLLS & OPTIONS
  // ---------------------------------------------------------

  async createPoll(poll: PollRecord, options: PollOptionRecord[]): Promise<void> {
    const statements: D1PreparedStatement[] = [];

    statements.push(
      this.db
        .prepare(
          `INSERT INTO polls (
            id, interaction_id, telegram_poll_id, telegram_message_id, question,
            poll_type, is_anonymous, allows_multiple_answers, correct_option_id,
            explanation, open_period_seconds, close_date, is_closed, total_voter_count,
            created_at, closed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          poll.id,
          poll.interactionId,
          poll.telegramPollId ?? null,
          poll.telegramMessageId ?? null,
          poll.question,
          poll.pollType,
          poll.isAnonymous ? 1 : 0,
          poll.allowsMultipleAnswers ? 1 : 0,
          poll.correctOptionId ?? null,
          poll.explanation ?? null,
          poll.openPeriodSeconds ?? null,
          poll.closeDate ?? null,
          poll.isClosed ? 1 : 0,
          poll.totalVoterCount,
          poll.createdAt,
          poll.closedAt ?? null,
        ),
    );

    for (const opt of options) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO poll_options (id, poll_id, option_index, option_text, trade_off, vote_count)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(opt.id, opt.pollId, opt.optionIndex, opt.optionText, opt.tradeOff ?? null, opt.voteCount),
      );
    }

    await this.db.batch(statements);
  }

  async getPollByTelegramId(telegramPollId: string): Promise<PollRecord | null> {
    const row = await this.db.prepare('SELECT * FROM polls WHERE telegram_poll_id = ?').bind(telegramPollId).first<any>();
    if (!row) return null;
    return this.mapPollRow(row);
  }

  async getPollByInteractionId(interactionId: string): Promise<PollRecord | null> {
    const row = await this.db.prepare('SELECT * FROM polls WHERE interaction_id = ?').bind(interactionId).first<any>();
    if (!row) return null;
    return this.mapPollRow(row);
  }

  async getPollOptions(pollId: string): Promise<PollOptionRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM poll_options WHERE poll_id = ? ORDER BY option_index ASC')
      .bind(pollId)
      .all<any>();

    return (result.results ?? []).map((row) => ({
      id: row.id,
      pollId: row.poll_id,
      optionIndex: row.option_index,
      optionText: row.option_text,
      tradeOff: row.trade_off,
      voteCount: row.vote_count,
    }));
  }

  async closePoll(pollId: string, closedAt: string): Promise<void> {
    await this.db
      .prepare('UPDATE polls SET is_closed = 1, closed_at = ? WHERE id = ?')
      .bind(closedAt, pollId)
      .run();
  }

  async updatePollCountsFromTelegram(pollData: TelegramPoll, closedAt?: string): Promise<void> {
    const existing = await this.getPollByTelegramId(pollData.id);
    if (!existing) return;

    const statements: D1PreparedStatement[] = [];

    statements.push(
      this.db
        .prepare(
          `UPDATE polls
           SET total_voter_count = ?, is_closed = ?, closed_at = COALESCE(?, closed_at)
           WHERE id = ?`,
        )
        .bind(
          pollData.total_voter_count,
          pollData.is_closed ? 1 : 0,
          pollData.is_closed ? (closedAt ?? new Date().toISOString()) : null,
          existing.id,
        ),
    );

    if (Array.isArray(pollData.options)) {
      pollData.options.forEach((opt, idx) => {
        statements.push(
          this.db
            .prepare(
              `UPDATE poll_options
               SET vote_count = ?
               WHERE poll_id = ? AND option_index = ?`,
            )
            .bind(opt.voter_count, existing.id, idx),
        );
      });
    }

    await this.db.batch(statements);
  }

  private mapPollRow(row: any): PollRecord {
    return {
      id: row.id,
      interactionId: row.interaction_id,
      telegramPollId: row.telegram_poll_id,
      telegramMessageId: row.telegram_message_id,
      question: row.question,
      pollType: row.poll_type,
      isAnonymous: Boolean(row.is_anonymous),
      allowsMultipleAnswers: Boolean(row.allows_multiple_answers),
      correctOptionId: row.correct_option_id,
      explanation: row.explanation,
      openPeriodSeconds: row.open_period_seconds,
      closeDate: row.close_date,
      isClosed: Boolean(row.is_closed),
      totalVoterCount: row.total_voter_count,
      createdAt: row.created_at,
      closedAt: row.closed_at,
    };
  }

  // ---------------------------------------------------------
  // VOTES & POLL ANSWERS
  // ---------------------------------------------------------

  async getUserVote(pollId: string, userId: string): Promise<VoteRecord | null> {
    const row = await this.db
      .prepare('SELECT * FROM votes WHERE poll_id = ? AND user_id = ?')
      .bind(pollId, userId)
      .first<any>();

    if (!row) return null;
    return {
      id: row.id,
      pollId: row.poll_id,
      interactionId: row.interaction_id,
      userId: row.user_id,
      telegramUserId: row.telegram_user_id,
      selectedOptionIndices: JSON.parse(row.selected_option_indices),
      status: row.status,
      version: row.version,
      votedAt: row.voted_at,
      updatedAt: row.updated_at,
    };
  }

  async getActiveVotesForInteraction(interactionId: string): Promise<VoteRecord[]> {
    const result = await this.db
      .prepare("SELECT * FROM votes WHERE interaction_id = ? AND status = 'active'")
      .bind(interactionId)
      .all<any>();

    return (result.results ?? []).map((row) => ({
      id: row.id,
      pollId: row.poll_id,
      interactionId: row.interaction_id,
      userId: row.user_id,
      telegramUserId: row.telegram_user_id,
      selectedOptionIndices: JSON.parse(row.selected_option_indices),
      status: row.status,
      version: row.version,
      votedAt: row.voted_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Applies a vote update (new vote, changed vote, or withdrawal).
   * Executes atomic D1 batch statements to update votes, option counts, and total voters.
   */
  async applyVoteUpdate(params: {
    pollId: string;
    interactionId: string;
    userId: string;
    telegramUserId: number;
    newOptionIndices: number[];
    nowIso?: string;
  }): Promise<{ action: 'voted' | 'changed' | 'withdrawn' | 'noop'; version: number }> {
    const now = params.nowIso ?? new Date().toISOString();
    const existing = await this.getUserVote(params.pollId, params.userId);

    const isWithdrawal = params.newOptionIndices.length === 0;

    // Case 1: No previous vote
    if (!existing) {
      if (isWithdrawal) {
        return { action: 'noop', version: 0 };
      }

      const voteId = `vote_${params.pollId}_${params.userId}`;
      const statements: D1PreparedStatement[] = [
        this.db
          .prepare(
            `INSERT INTO votes (id, poll_id, interaction_id, user_id, telegram_user_id, selected_option_indices, status, version, voted_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)`,
          )
          .bind(
            voteId,
            params.pollId,
            params.interactionId,
            params.userId,
            params.telegramUserId,
            JSON.stringify(params.newOptionIndices),
            now,
            now,
          ),
      ];

      // Increment selected options
      for (const idx of params.newOptionIndices) {
        statements.push(
          this.db
            .prepare('UPDATE poll_options SET vote_count = vote_count + 1 WHERE poll_id = ? AND option_index = ?')
            .bind(params.pollId, idx),
        );
      }

      // Increment poll total_voter_count
      statements.push(
        this.db
          .prepare('UPDATE polls SET total_voter_count = total_voter_count + 1 WHERE id = ?')
          .bind(params.pollId),
      );

      await this.db.batch(statements);
      return { action: 'voted', version: 1 };
    }

    // Case 2: Existing vote
    const prevIndices = existing.selectedOptionIndices;
    const sameSelection =
      prevIndices.length === params.newOptionIndices.length &&
      prevIndices.every((v, i) => v === params.newOptionIndices[i]);

    if (sameSelection && (isWithdrawal ? existing.status === 'withdrawn' : existing.status === 'active')) {
      return { action: 'noop', version: existing.version };
    }

    const nextVersion = existing.version + 1;
    const statements: D1PreparedStatement[] = [];

    if (isWithdrawal) {
      // User withdrew vote: decrement previously selected options
      if (existing.status === 'active') {
        for (const idx of prevIndices) {
          statements.push(
            this.db
              .prepare(
                'UPDATE poll_options SET vote_count = MAX(0, vote_count - 1) WHERE poll_id = ? AND option_index = ?',
              )
              .bind(params.pollId, idx),
          );
        }
        statements.push(
          this.db
            .prepare('UPDATE polls SET total_voter_count = MAX(0, total_voter_count - 1) WHERE id = ?')
            .bind(params.pollId),
        );
      }

      statements.push(
        this.db
          .prepare(
            `UPDATE votes SET selected_option_indices = '[]', status = 'withdrawn', version = ?, updated_at = ?
             WHERE id = ?`,
          )
          .bind(nextVersion, now, existing.id),
      );

      await this.db.batch(statements);
      return { action: 'withdrawn', version: nextVersion };
    }

    // Changed or re-cast vote
    if (existing.status === 'active') {
      // Decrement old choices
      for (const idx of prevIndices) {
        statements.push(
          this.db
            .prepare(
              'UPDATE poll_options SET vote_count = MAX(0, vote_count - 1) WHERE poll_id = ? AND option_index = ?',
            )
            .bind(params.pollId, idx),
        );
      }
    } else {
      // Was withdrawn, re-activating -> increment total voters
      statements.push(
        this.db
          .prepare('UPDATE polls SET total_voter_count = total_voter_count + 1 WHERE id = ?')
          .bind(params.pollId),
      );
    }

    // Increment new choices
    for (const idx of params.newOptionIndices) {
      statements.push(
        this.db
          .prepare('UPDATE poll_options SET vote_count = vote_count + 1 WHERE poll_id = ? AND option_index = ?')
          .bind(params.pollId, idx),
      );
    }

    statements.push(
      this.db
        .prepare(
          `UPDATE votes SET selected_option_indices = ?, status = 'active', version = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(JSON.stringify(params.newOptionIndices), nextVersion, now, existing.id),
    );

    await this.db.batch(statements);
    return { action: 'changed', version: nextVersion };
  }

  // ---------------------------------------------------------
  // RESULTS & REVEALS
  // ---------------------------------------------------------

  async saveResult(result: ResultRecord): Promise<boolean> {
    const existing = await this.getResultByInteractionId(result.interactionId);
    if (existing) {
      return false; // Prevent duplicate result records
    }

    await this.db
      .prepare(
        `INSERT INTO results (
          id, interaction_id, post_id, total_participants, winning_option_index,
          winning_option_text, winning_percentage, vote_distribution_json, payoff_json,
          reveal_text, result_post_message_id, status, published_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        result.id,
        result.interactionId,
        result.postId,
        result.totalParticipants,
        result.winningOptionIndex ?? null,
        result.winningOptionText ?? null,
        result.winningPercentage ?? null,
        JSON.stringify(result.voteDistribution),
        JSON.stringify(result.payoff),
        result.revealText,
        result.resultPostMessageId ?? null,
        result.status,
        result.publishedAt ?? null,
        result.createdAt,
      )
      .run();

    return true;
  }

  async getResultByInteractionId(interactionId: string): Promise<ResultRecord | null> {
    const row = await this.db
      .prepare('SELECT * FROM results WHERE interaction_id = ?')
      .bind(interactionId)
      .first<any>();

    if (!row) return null;
    return {
      id: row.id,
      interactionId: row.interaction_id,
      postId: row.post_id,
      totalParticipants: row.total_participants,
      winningOptionIndex: row.winning_option_index,
      winningOptionText: row.winning_option_text,
      winningPercentage: row.winning_percentage,
      voteDistribution: JSON.parse(row.vote_distribution_json),
      payoff: JSON.parse(row.payoff_json),
      revealText: row.reveal_text,
      resultPostMessageId: row.result_post_message_id,
      status: row.status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    };
  }

  async updateResultStatus(
    id: string,
    status: 'generated' | 'published' | 'failed',
    extra?: { publishedAt?: string; resultPostMessageId?: number },
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE results SET
          status = ?,
          published_at = COALESCE(?, published_at),
          result_post_message_id = COALESCE(?, result_post_message_id)
         WHERE id = ?`,
      )
      .bind(status, extra?.publishedAt ?? null, extra?.resultPostMessageId ?? null, id)
      .run();
  }

  /**
   * Retrieves the most recently completed interaction result with its associated
   * post and message metadata for story arc continuation.
   */
  async getLatestCompletedContinuation(): Promise<CompletedContinuationContext | null> {
    const row = await this.db
      .prepare(
        `SELECT
          r.id as result_id,
          r.interaction_id,
          r.post_id,
          r.total_participants,
          r.winning_option_index,
          r.winning_option_text,
          r.winning_percentage,
          r.payoff_json,
          r.reveal_text,
          r.published_at as result_published_at,
          r.created_at as result_created_at,
          p.title as post_title,
          p.category as post_category,
          p.content_type as post_content_type,
          p.tone as post_tone,
          p.stakes as post_stakes,
          p.parent_post_id,
          p.telegram_message_id,
          p.telegram_poll_message_id,
          i.resolved_at
         FROM results r
         JOIN interactions i ON r.interaction_id = i.id
         JOIN posts p ON r.post_id = p.id
         WHERE i.lifecycle_state = 'COMPLETED' OR r.status = 'published'
         ORDER BY r.created_at DESC
         LIMIT 1`,
      )
      .first<any>();

    if (!row) return null;

    let payoff: Record<string, unknown> = {};
    try {
      payoff = JSON.parse(row.payoff_json || '{}');
    } catch {
      payoff = {};
    }

    return {
      resultId: row.result_id,
      interactionId: row.interaction_id,
      postId: row.post_id,
      postTitle: row.post_title,
      category: row.post_category,
      contentType: row.post_content_type,
      tone: row.post_tone,
      stakes: row.post_stakes,
      winningOptionText: row.winning_option_text ?? null,
      winningOptionIndex: row.winning_option_index ?? null,
      winningPercentage: row.winning_percentage ?? null,
      revealText: row.reveal_text,
      payoff,
      totalParticipants: row.total_participants,
      telegramMessageId: row.telegram_message_id ?? null,
      telegramPollMessageId: row.telegram_poll_message_id ?? null,
      parentPostId: row.parent_post_id ?? null,
      resolvedAt: row.resolved_at ?? null,
    };
  }

  /**
   * Checks whether a post already has a direct child post in D1.
   */
  async hasChildPost(postId: string): Promise<boolean> {
    const row = await this.db
      .prepare('SELECT id FROM posts WHERE parent_post_id = ? LIMIT 1')
      .bind(postId)
      .first<any>();
    return Boolean(row);
  }

  // ---------------------------------------------------------
  // WEBHOOK EVENTS DEDUPLICATION
  // ---------------------------------------------------------

  async hasProcessedWebhookEvent(updateId: number): Promise<boolean> {
    const row = await this.db
      .prepare('SELECT update_id FROM webhook_events WHERE update_id = ?')
      .bind(updateId)
      .first<{ update_id: number }>();
    return Boolean(row);
  }

  async recordWebhookEvent(event: WebhookEventRecord): Promise<boolean> {
    try {
      await this.db
        .prepare(
          `INSERT INTO webhook_events (update_id, event_type, payload_json, received_at, processed_at, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          event.updateId,
          event.eventType,
          event.payloadJson ?? null,
          event.receivedAt,
          event.processedAt ?? event.receivedAt,
          event.status,
        )
        .run();
      return true;
    } catch {
      // Primary key constraint violation on update_id
      return false;
    }
  }

  // ---------------------------------------------------------
  // INTERACTION LOCKS
  // ---------------------------------------------------------

  async acquireLock(interactionId: string, lockedBy: string, ttlSeconds: number = 60): Promise<boolean> {
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    // Clean up expired lock if present
    await this.db
      .prepare('DELETE FROM interaction_locks WHERE interaction_id = ? AND expires_at < ?')
      .bind(interactionId, nowIso)
      .run();

    try {
      await this.db
        .prepare(
          `INSERT INTO interaction_locks (interaction_id, locked_by, locked_at, expires_at)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(interactionId, lockedBy, nowIso, expiresIso)
        .run();
      return true;
    } catch {
      return false;
    }
  }

  async releaseLock(interactionId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM interaction_locks WHERE interaction_id = ?')
      .bind(interactionId)
      .run();
  }
}
