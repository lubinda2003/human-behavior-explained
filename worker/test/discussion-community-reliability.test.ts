import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import {
  D1InteractionRepository,
  MockTelegramClient,
  InteractionPlanner,
  TelegramInteractionPublisher,
  TelegramWebhookHandler,
  VoteTracker,
  type PostRecord,
  type TelegramUpdate,
} from '../src/interactions';

describe('Phase 5C: Discussion & Community Reliability Test Suite', () => {
  let db: D1Database;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let planner: InteractionPlanner;
  let publisher: TelegramInteractionPublisher;
  let voteTracker: VoteTracker;
  let webhookHandler: TelegramWebhookHandler;

  const CHANNEL_ID = '@pickyourfate_test';
  const DISCUSSION_GROUP_ID = -1001987654321;

  beforeEach(async () => {
    db = createMockD1Database();
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }

    repo = new D1InteractionRepository(db);
    telegram = new MockTelegramClient();
    planner = new InteractionPlanner(CHANNEL_ID);
    publisher = new TelegramInteractionPublisher(repo, telegram);
    voteTracker = new VoteTracker(repo);
    webhookHandler = new TelegramWebhookHandler(repo, voteTracker);
  });

  const samplePost: PostRecord = {
    id: 'post_comm_001',
    contentType: 'impossible_dilemma',
    category: 'ethics',
    tone: 'philosophical',
    stakes: 'high',
    layout: 'standard',
    hookStyle: 'direct_question',
    title: 'The AI Quarantine Conundrum',
    status: 'draft',
    payload: {
      title: 'The AI Quarantine Conundrum',
      hook: 'A rogue AI sub-routine is trapped in a secondary server rack.',
      setup: 'Vent the server room coolant or sever external uplink cables.',
      payoff: {
        reveal: 'Severing uplink isolated the rogue process while preserving physical hardware.',
        twist: 'Auxiliary backup battery kicked in, requiring manual shutdown.',
      },
    },
    createdAt: new Date().toISOString(),
  };

  const sampleFormattedText = '<b>The AI Quarantine Conundrum</b>\n\nA rogue sub-routine...';

  // Helper to publish a real interaction in OPEN state
  async function publishOpenInteraction(postId: string, title: string, mainMsgId: number, pollMsgId: number) {
    const nowIso = new Date().toISOString();
    const interactionId = `int_${postId}`;

    await repo.createPost({
      ...samplePost,
      id: postId,
      title,
      status: 'published',
      telegramMessageId: mainMsgId,
      telegramPollMessageId: pollMsgId,
      publishedAt: nowIso,
    });

    await repo.createPublishedMessage({
      id: `msg_${postId}_main`,
      postId,
      telegramMessageId: mainMsgId,
      telegramChatId: CHANNEL_ID,
      messageType: 'main_post',
      parseMode: 'HTML',
      textContent: `<b>${title}</b>`,
      publishedAt: nowIso,
    });

    await repo.createPublishedMessage({
      id: `msg_${postId}_poll`,
      postId,
      telegramMessageId: pollMsgId,
      telegramChatId: CHANNEL_ID,
      messageType: 'native_poll',
      parseMode: 'HTML',
      textContent: `Poll for ${title}`,
      publishedAt: nowIso,
    });

    await repo.createInteraction({
      id: interactionId,
      postId,
      interactionType: 'poll',
      lifecycleState: 'OPEN',
      closeStrategy: 'scheduled',
      targetChatId: CHANNEL_ID,
      mainMessageId: mainMsgId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await repo.createPoll(
      {
        id: `poll_${interactionId}`,
        interactionId,
        telegramPollId: `tg_poll_${postId}`,
        telegramMessageId: pollMsgId,
        question: `What is your decision for ${title}?`,
        pollType: 'regular',
        isAnonymous: false,
        allowsMultipleAnswers: false,
        isClosed: false,
        totalVoterCount: 0,
        createdAt: nowIso,
      },
      [
        { id: `opt_${postId}_0`, pollId: `poll_${interactionId}`, optionIndex: 0, optionText: 'Option A', tradeOff: 'Cost A', voteCount: 0 },
        { id: `opt_${postId}_1`, pollId: `poll_${interactionId}`, optionIndex: 1, optionText: 'Option B', tradeOff: 'Cost B', voteCount: 0 },
      ],
    );

    return { interactionId, postId, mainMsgId, pollMsgId };
  }

  // --------------------------------------------------------------------------
  // A. Same Telegram update delivered twice -> one effect
  // --------------------------------------------------------------------------
  it('A. Same Telegram update delivered twice -> one effect', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_a_001', 'Test A Post', 2001, 2002);
    const nowIso = new Date().toISOString();

    const update: TelegramUpdate = {
      update_id: 10001,
      message: {
        message_id: 3001,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'This is an intense dilemma!',
        from: { id: 7001, is_bot: false, first_name: 'Alice' },
        reply_to_message: {
          message_id: 500,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    // First delivery
    const res1 = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res1.status, 200);
    assert.equal((res1.body.discussionResult as any)?.status, 'discussion_recorded');

    // Second delivery (duplicate update)
    const res2 = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res2.status, 200);
    assert.equal(res2.body.duplicate, true);

    // Exactly ONE discussion record exists in D1
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 1);
    assert.equal(comments[0].telegramMessageId, 3001);

    // Interaction activity comment count is strictly 1
    const intRecord = await repo.getInteraction(interactionId);
    assert.equal((intRecord?.metadata as any)?.discussionCommentCount, 1);
  });

  // --------------------------------------------------------------------------
  // B. Same update processed concurrently by two workers -> one effect
  // --------------------------------------------------------------------------
  it('B. Same update processed concurrently by two workers -> one effect', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_b_002', 'Test B Post', 2101, 2102);
    const nowIso = new Date().toISOString();

    // Two distinct webhook handler instances sharing the exact same D1 database
    const workerA = new TelegramWebhookHandler(repo, voteTracker);
    const workerB = new TelegramWebhookHandler(repo, voteTracker);

    const update: TelegramUpdate = {
      update_id: 10002,
      message: {
        message_id: 3002,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Concurrent processing comment!',
        from: { id: 7002, is_bot: false, first_name: 'Bob' },
        reply_to_message: {
          message_id: 501,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    // Process both concurrently
    const [resA, resB] = await Promise.all([
      workerA.handleUpdate(update, undefined, nowIso),
      workerB.handleUpdate(update, undefined, nowIso),
    ]);

    assert.equal(resA.status, 200);
    assert.equal(resB.status, 200);

    // Exactly one worker processed the event, the other received duplicate/in_progress acknowledgment
    const oneProcessed =
      ((resA.body.discussionResult as any)?.status === 'discussion_recorded' && resB.body.duplicate === true) ||
      ((resB.body.discussionResult as any)?.status === 'discussion_recorded' && resA.body.duplicate === true);
    assert.ok(oneProcessed, 'Exactly one worker processed the update');

    // D1 discussion messages has strictly 1 record
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 1);
    assert.equal(comments[0].telegramMessageId, 3002);
  });

  // --------------------------------------------------------------------------
  // C. Failed event processing -> retry succeeds
  // --------------------------------------------------------------------------
  it('C. Failed event processing -> retry succeeds', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_c_003', 'Test C Post', 2201, 2202);
    const nowIso = new Date().toISOString();

    const update: TelegramUpdate = {
      update_id: 10003,
      message: {
        message_id: 3003,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Retry comment after error!',
        from: { id: 7003, is_bot: false, first_name: 'Charlie' },
        reply_to_message: {
          message_id: 502,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    // Mock recordDiscussionMessage to fail on first attempt
    const originalRecordMsg = repo.recordDiscussionMessage.bind(repo);
    let attempts = 0;
    (repo as any).recordDiscussionMessage = async (msg: any) => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Transient D1 failure during discussion recording');
      }
      return originalRecordMsg(msg);
    };

    // First attempt fails
    await assert.rejects(
      async () => {
        await webhookHandler.handleUpdate(update, undefined, nowIso);
      },
      (err: Error) => {
        assert.ok(err.message.includes('Transient D1 failure'));
        return true;
      },
    );

    // Event is marked as 'failed' in D1, NOT permanently consumed
    const eventRow = await repo.getWebhookEvent(10003);
    assert.equal(eventRow?.status, 'failed');
    assert.ok(eventRow?.lastError?.includes('Transient D1 failure'));

    // Second attempt (Telegram retry): succeeds!
    const retryRes = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(retryRes.status, 200);
    assert.equal((retryRes.body.discussionResult as any)?.status, 'discussion_recorded');

    // Webhook event is now 'processed'
    const finalEventRow = await repo.getWebhookEvent(10003);
    assert.equal(finalEventRow?.status, 'processed');

    // D1 discussion message exists
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 1);
  });

  // --------------------------------------------------------------------------
  // D. Failed processing does not permanently consume the event
  // --------------------------------------------------------------------------
  it('D. Failed processing does not permanently consume the event', async () => {
    const nowIso = new Date().toISOString();
    const updateId = 10004;

    // Simulate event insertion in 'failed' status
    await repo.claimWebhookEvent(updateId, 'poll_answer', '{}', nowIso);
    await repo.markWebhookEventFailed(updateId, 'Simulated network timeout', nowIso);

    // Event is in failed status
    const failedEvent = await repo.getWebhookEvent(updateId);
    assert.equal(failedEvent?.status, 'failed');

    // A subsequent delivery can re-claim the event
    const reclaimResult = await repo.claimWebhookEvent(updateId, 'poll_answer', '{}', nowIso);
    assert.equal(reclaimResult.claimed, true);
    assert.equal(reclaimResult.reason, 'retry_claimed');
  });

  // --------------------------------------------------------------------------
  // E. Discussion message correctly maps to originating interaction
  // --------------------------------------------------------------------------
  it('E. Discussion message correctly maps to originating interaction via multiple signals', async () => {
    const { interactionId, mainMsgId, pollMsgId } = await publishOpenInteraction('post_e_005', 'Test E Post', 2301, 2302);
    const nowIso = new Date().toISOString();

    // Signal 1: Channel forward reference
    const update1: TelegramUpdate = {
      update_id: 10005,
      message: {
        message_id: 3005,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Via forward from channel',
        from: { id: 7005, is_bot: false, first_name: 'Eve' },
        reply_to_message: {
          message_id: 505,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };
    const res1 = await webhookHandler.handleUpdate(update1, undefined, nowIso);
    assert.equal((res1.body.discussionResult as any)?.interactionId, interactionId);
    assert.equal((res1.body.discussionResult as any)?.associationMethod, 'reply_forward_from_main_message');

    // Signal 2: Direct reply to poll message
    const update2: TelegramUpdate = {
      update_id: 10006,
      message: {
        message_id: 3006,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Via reply to poll message',
        from: { id: 7006, is_bot: false, first_name: 'Frank' },
        reply_to_message: {
          message_id: pollMsgId,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        },
      },
    };
    const res2 = await webhookHandler.handleUpdate(update2, undefined, nowIso);
    assert.equal((res2.body.discussionResult as any)?.interactionId, interactionId);
    assert.equal((res2.body.discussionResult as any)?.associationMethod, 'reply_to_published_msg');

    // Signal 3: Reply to a previous comment (reply chain)
    const update3: TelegramUpdate = {
      update_id: 10007,
      message: {
        message_id: 3007,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Replying to Eve comment',
        from: { id: 7007, is_bot: false, first_name: 'Grace' },
        reply_to_message: {
          message_id: 3005, // Eve's comment recorded in update1
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        },
      },
    };
    const res3 = await webhookHandler.handleUpdate(update3, undefined, nowIso);
    assert.equal((res3.body.discussionResult as any)?.interactionId, interactionId);
    assert.equal((res3.body.discussionResult as any)?.associationMethod, 'reply_to_discussion_comment');

    // Signal 4: Discussion message_thread_id
    const update4: TelegramUpdate = {
      update_id: 10008,
      message: {
        message_id: 3008,
        message_thread_id: mainMsgId,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Via message_thread_id',
        from: { id: 7008, is_bot: false, first_name: 'Heidi' },
      },
    };
    const res4 = await webhookHandler.handleUpdate(update4, undefined, nowIso);
    assert.equal((res4.body.discussionResult as any)?.interactionId, interactionId);
    assert.equal((res4.body.discussionResult as any)?.associationMethod, 'thread_main_message');
  });

  // --------------------------------------------------------------------------
  // F. Unassociated discussion message does not modify any interaction
  // --------------------------------------------------------------------------
  it('F. Unassociated discussion message does not modify any interaction', async () => {
    const { interactionId } = await publishOpenInteraction('post_f_006', 'Test F Post', 2401, 2402);
    const nowIso = new Date().toISOString();

    const update: TelegramUpdate = {
      update_id: 10009,
      message: {
        message_id: 9999,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Random off-topic chat without reply or thread ID',
        from: { id: 7009, is_bot: false, first_name: 'Ivan' },
      },
    };

    const res = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.status, 'unassociated_message');

    // No discussion messages recorded for interaction
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 0);

    // Interaction activity count remains undefined / 0
    const intRecord = await repo.getInteraction(interactionId);
    assert.equal((intRecord?.metadata as any)?.discussionCommentCount, undefined);
  });

  // --------------------------------------------------------------------------
  // G. Interaction A activity cannot affect interaction B
  // --------------------------------------------------------------------------
  it('G. Cross-interaction isolation: Interaction A activity cannot affect interaction B', async () => {
    const intA = await publishOpenInteraction('post_g_a', 'Post A', 2501, 2502);
    const intB = await publishOpenInteraction('post_g_b', 'Post B', 2601, 2602);
    const nowIso = new Date().toISOString();

    const updateA: TelegramUpdate = {
      update_id: 10010,
      message: {
        message_id: 3010,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Comment strictly for Post A',
        from: { id: 7010, is_bot: false, first_name: 'Judy' },
        reply_to_message: {
          message_id: 510,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: intA.mainMsgId,
        },
      },
    };

    await webhookHandler.handleUpdate(updateA, undefined, nowIso);

    // Interaction A has 1 comment
    const commentsA = await repo.getDiscussionMessagesForInteraction(intA.interactionId);
    assert.equal(commentsA.length, 1);
    const recA = await repo.getInteraction(intA.interactionId);
    assert.equal((recA?.metadata as any)?.discussionCommentCount, 1);

    // Interaction B has ZERO comments
    const commentsB = await repo.getDiscussionMessagesForInteraction(intB.interactionId);
    assert.equal(commentsB.length, 0);
    const recB = await repo.getInteraction(intB.interactionId);
    assert.equal((recB?.metadata as any)?.discussionCommentCount, undefined);
  });

  // --------------------------------------------------------------------------
  // H. Duplicate discussion activity does not create duplicate records
  // --------------------------------------------------------------------------
  it('H. Duplicate discussion activity does not create duplicate records in D1', async () => {
    const { interactionId } = await publishOpenInteraction('post_h_008', 'Post H', 2701, 2702);
    const nowIso = new Date().toISOString();

    // Call recordDiscussionMessage directly twice with identical message ID
    const rec1 = await repo.recordDiscussionMessage({
      interactionId,
      postId: 'post_h_008',
      telegramMessageId: 3011,
      telegramChatId: String(DISCUSSION_GROUP_ID),
      textContent: 'First write',
      receivedAt: nowIso,
    });
    assert.equal(rec1.recorded, true);

    const rec2 = await repo.recordDiscussionMessage({
      interactionId,
      postId: 'post_h_008',
      telegramMessageId: 3011,
      telegramChatId: String(DISCUSSION_GROUP_ID),
      textContent: 'Second duplicate write',
      receivedAt: nowIso,
    });
    assert.equal(rec2.recorded, false);

    // Exactly 1 record in table
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 1);

    // Discussion count on interaction is exactly 1 (not 2)
    const intRecord = await repo.getInteraction(interactionId);
    assert.equal((intRecord?.metadata as any)?.discussionCommentCount, 1);
  });

  // --------------------------------------------------------------------------
  // I. Bot response safety: bot messages are ignored, preventing loops
  // --------------------------------------------------------------------------
  it('I. Bot response safety: messages from bots are ignored to prevent recursion loops', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_i_009', 'Post I', 2801, 2802);
    const nowIso = new Date().toISOString();

    const botUpdate: TelegramUpdate = {
      update_id: 10012,
      message: {
        message_id: 3012,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Automated bot response',
        from: { id: 99999, is_bot: true, first_name: 'OtherBot' },
        reply_to_message: {
          message_id: 512,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    const res = await webhookHandler.handleUpdate(botUpdate, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.status, 'ignored_bot_message');

    // No discussion message recorded for bot message
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 0);
  });

  // --------------------------------------------------------------------------
  // J. CLOSED interaction cannot be reopened by discussion activity
  // --------------------------------------------------------------------------
  it('J. CLOSED interaction cannot be reopened by discussion activity: state remains CLOSED', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_j_010', 'Post J', 2901, 2902);
    const nowIso = new Date().toISOString();

    // Close the interaction
    await repo.updateInteractionLifecycle(interactionId, 'CLOSED');
    const closedInt = await repo.getInteraction(interactionId);
    assert.equal(closedInt?.lifecycleState, 'CLOSED');

    const update: TelegramUpdate = {
      update_id: 10013,
      message: {
        message_id: 3013,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Late comment on closed post',
        from: { id: 7013, is_bot: false, first_name: 'Kevin' },
        reply_to_message: {
          message_id: 513,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    const res = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.status, 'ignored_closed');

    // State remains strictly CLOSED
    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'CLOSED');
  });

  // --------------------------------------------------------------------------
  // K. COMPLETED interaction cannot be altered by discussion activity
  // --------------------------------------------------------------------------
  it('K. COMPLETED interaction cannot be altered by discussion activity', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_k_011', 'Post K', 3001, 3002);
    const nowIso = new Date().toISOString();

    // Transition to COMPLETED
    await repo.updateInteractionLifecycle(interactionId, 'CLOSED');
    await repo.updateInteractionLifecycle(interactionId, 'RESOLVING');
    await repo.updateInteractionLifecycle(interactionId, 'COMPLETED');

    const update: TelegramUpdate = {
      update_id: 10014,
      message: {
        message_id: 3014,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Post-mortem discussion comment',
        from: { id: 7014, is_bot: false, first_name: 'Laura' },
        reply_to_message: {
          message_id: 514,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    const res = await webhookHandler.handleUpdate(update, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal((res.body.discussionResult as any)?.status, 'ignored_closed');

    // Lifecycle state strictly remains COMPLETED
    const finalInt = await repo.getInteraction(interactionId);
    assert.equal(finalInt?.lifecycleState, 'COMPLETED');
  });

  // --------------------------------------------------------------------------
  // L. Two different discussion events for the same interaction are processed safely
  // --------------------------------------------------------------------------
  it('L. Two different discussion events for the same interaction are processed safely', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_l_012', 'Post L', 3101, 3102);
    const nowIso = new Date().toISOString();

    const update1: TelegramUpdate = {
      update_id: 10015,
      message: {
        message_id: 3015,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Comment from User 1',
        from: { id: 7015, is_bot: false, first_name: 'Mike' },
        reply_to_message: {
          message_id: 515,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    const update2: TelegramUpdate = {
      update_id: 10016,
      message: {
        message_id: 3016,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Comment from User 2',
        from: { id: 7016, is_bot: false, first_name: 'Nina' },
        reply_to_message: {
          message_id: 516,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    const res1 = await webhookHandler.handleUpdate(update1, undefined, nowIso);
    const res2 = await webhookHandler.handleUpdate(update2, undefined, nowIso);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    // Both comments recorded in order
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 2);
    assert.equal(comments[0].telegramMessageId, 3015);
    assert.equal(comments[1].telegramMessageId, 3016);

    // Count is exactly 2
    const intRecord = await repo.getInteraction(interactionId);
    assert.equal((intRecord?.metadata as any)?.discussionCommentCount, 2);
  });

  // --------------------------------------------------------------------------
  // M. Edited/deleted updates do not accidentally trigger new interaction actions
  // --------------------------------------------------------------------------
  it('M. Edited updates do not accidentally trigger new interaction actions', async () => {
    const { interactionId } = await publishOpenInteraction('post_m_013', 'Post M', 3201, 3202);
    const nowIso = new Date().toISOString();

    const editedUpdate: TelegramUpdate = {
      update_id: 10017,
      edited_message: {
        message_id: 3017,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Edited text of comment',
        from: { id: 7017, is_bot: false, first_name: 'Oscar' },
      },
    };

    const res = await webhookHandler.handleUpdate(editedUpdate, undefined, nowIso);
    assert.equal(res.status, 200);
    assert.equal(res.body.ignored, 'edited_message');

    // No new discussion records created
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 0);

    // Interaction activity unchanged
    const intRecord = await repo.getInteraction(interactionId);
    assert.equal((intRecord?.metadata as any)?.discussionCommentCount, undefined);
  });

  // --------------------------------------------------------------------------
  // N. Conflicting Telegram identifiers do not silently overwrite existing records
  // --------------------------------------------------------------------------
  it('N. Conflicting Telegram identifiers do not silently overwrite existing records', async () => {
    const { interactionId } = await publishOpenInteraction('post_n_014', 'Post N', 3301, 3302);
    const nowIso = new Date().toISOString();

    // First discussion message
    const res1 = await repo.recordDiscussionMessage({
      interactionId,
      postId: 'post_n_014',
      telegramMessageId: 3018,
      telegramChatId: String(DISCUSSION_GROUP_ID),
      textContent: 'Original comment',
      receivedAt: nowIso,
    });
    assert.equal(res1.recorded, true);

    // Attempting to overwrite existing message ID with different text/user returns false
    const res2 = await repo.recordDiscussionMessage({
      interactionId,
      postId: 'post_n_014',
      telegramMessageId: 3018,
      telegramChatId: String(DISCUSSION_GROUP_ID),
      textContent: 'Conflicting overwrite attempt',
      receivedAt: nowIso,
    });
    assert.equal(res2.recorded, false);

    // Original message content remains preserved
    const msg = await repo.getDiscussionMessageByTelegramId(String(DISCUSSION_GROUP_ID), 3018);
    assert.equal(msg?.textContent, 'Original comment');
  });

  // --------------------------------------------------------------------------
  // O. Persistent event records survive Worker-instance boundaries
  // --------------------------------------------------------------------------
  it('O. Persistent event records survive Worker-instance boundaries', async () => {
    const { interactionId, mainMsgId } = await publishOpenInteraction('post_o_015', 'Post O', 3401, 3402);
    const nowIso = new Date().toISOString();

    const update: TelegramUpdate = {
      update_id: 10019,
      message: {
        message_id: 3019,
        date: Math.floor(Date.now() / 1000),
        chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
        text: 'Cross-worker boundary test',
        from: { id: 7019, is_bot: false, first_name: 'Paul' },
        reply_to_message: {
          message_id: 519,
          date: Math.floor(Date.now() / 1000),
          chat: { id: DISCUSSION_GROUP_ID, type: 'supergroup' },
          forward_from_message_id: mainMsgId,
        },
      },
    };

    // Worker Instance 1 receives and processes update
    const worker1 = new TelegramWebhookHandler(new D1InteractionRepository(db), new VoteTracker(new D1InteractionRepository(db)));
    const res1 = await worker1.handleUpdate(update, undefined, nowIso);
    assert.equal(res1.status, 200);
    assert.equal((res1.body.discussionResult as any)?.status, 'discussion_recorded');

    // Worker Instance 2 receives duplicate of same update
    const worker2 = new TelegramWebhookHandler(new D1InteractionRepository(db), new VoteTracker(new D1InteractionRepository(db)));
    const res2 = await worker2.handleUpdate(update, undefined, nowIso);
    assert.equal(res2.status, 200);
    assert.equal(res2.body.duplicate, true);

    // D1 has strictly one record
    const comments = await repo.getDiscussionMessagesForInteraction(interactionId);
    assert.equal(comments.length, 1);
  });
});
