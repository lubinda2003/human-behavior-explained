import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createMockD1Database } from './mock-d1';
import { SCHEMA_STATEMENTS } from '../src/store/schema';
import {
  D1InteractionRepository,
  MockTelegramClient,
  InteractionPlanner,
  TelegramInteractionPublisher,
  VoteTracker,
  ResultGenerator,
  InteractionClosureService,
  TelegramWebhookHandler,
  assertValidTransition,
  canTransition,
  InvalidLifecycleTransitionError,
  type PostRecord,
  type TelegramUpdate,
} from '../src/interactions';

describe('Pick Your Fate — Telegram Interaction Engine', () => {
  let db: D1Database;
  let repo: D1InteractionRepository;
  let telegram: MockTelegramClient;
  let planner: InteractionPlanner;
  let publisher: TelegramInteractionPublisher;
  let voteTracker: VoteTracker;
  let resultGen: ResultGenerator;
  let closureService: InteractionClosureService;
  let webhookHandler: TelegramWebhookHandler;

  const CHANNEL_ID = '@pickyourfate_test';
  const SECRET_TOKEN = 'test_telegram_secret_token_12345';

  beforeEach(async () => {
    db = createMockD1Database();
    // Initialize all D1 schema statements
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }

    repo = new D1InteractionRepository(db);
    telegram = new MockTelegramClient();
    planner = new InteractionPlanner(CHANNEL_ID);
    publisher = new TelegramInteractionPublisher(repo, telegram);
    voteTracker = new VoteTracker(repo);
    resultGen = new ResultGenerator();
    closureService = new InteractionClosureService(repo, telegram, resultGen);
    webhookHandler = new TelegramWebhookHandler(repo, voteTracker, {
      secretToken: SECRET_TOKEN,
    });
  });

  const sampleDilemmaPost: PostRecord = {
    id: 'post_nuclear_bunker_01',
    contentType: 'impossible_dilemma',
    category: 'survival',
    tone: 'tense',
    stakes: 'world-scale',
    layout: 'stacked',
    hookStyle: 'statement',
    title: 'The Subterranean Vault Airlock',
    status: 'draft',
    payload: {
      title: 'The Subterranean Vault Airlock',
      hook: 'Warning sirens wail as atmospheric scrubbers fail.',
      scenario: 'The primary airlock seal is cracked. You have 90 seconds of pressurized oxygen.',
      choices: [
        { label: 'Seal Sector B', tradeOff: 'Trap 3 crew members inside the outer vault', description: 'Immediate airtight safety' },
        { label: 'Manual Valve Override', tradeOff: 'Suffer severe lung radiation exposure', description: 'Save all crew members' },
      ],
      pollQuestion: 'Which protocol do you execute in Sector B?',
      payoff: {
        reveal: 'Sector B had a hidden auxiliary vent that opened 10 minutes later.',
        surprisingOutcome: 'Manual override spared the crew but incapacitated the engineer permanently.',
        communityTension: 'Split between immediate survival calculus versus sacrificial duty.',
      },
    },
    createdAt: new Date().toISOString(),
  };

  describe('1. D1 Persistence & Full Traceability', () => {
    it('creates and traces complete lifecycle: Post -> Telegram Msg -> Interaction -> Votes -> Result', async () => {
      const plan = planner.plan({
        id: sampleDilemmaPost.id,
        title: sampleDilemmaPost.title,
        contentType: sampleDilemmaPost.contentType,
        choices: (sampleDilemmaPost.payload as any).choices,
        pollQuestion: (sampleDilemmaPost.payload as any).pollQuestion,
      });

      const published = await publisher.publishInteraction({
        post: sampleDilemmaPost,
        plan,
        formattedText: '<b>THE AIRLOCK PROTOCOL</b>\nChoose wisely.',
      });

      // Trace 1: Post in D1
      const postInDb = await repo.getPost(sampleDilemmaPost.id);
      assert.ok(postInDb);
      assert.equal(postInDb.status, 'published');

      // Trace 2: Published messages in D1
      const messages = await repo.getPublishedMessagesForPost(sampleDilemmaPost.id);
      assert.equal(messages.length, 2); // main post + native poll
      assert.equal(messages[0].messageType, 'main_post');
      assert.equal(messages[1].messageType, 'native_poll');

      // Trace 3: Interaction in D1
      const interaction = await repo.getInteraction(published.interactionId);
      assert.ok(interaction);
      assert.equal(interaction.lifecycleState, 'OPEN');
      assert.equal(interaction.postId, sampleDilemmaPost.id);

      // Trace 4: Native poll in D1
      assert.ok(published.telegramPollId);
      const poll = await repo.getPollByTelegramId(published.telegramPollId);
      assert.ok(poll);
      assert.equal(poll.isAnonymous, true); // anonymous for channel chats per Telegram requirements

      const options = await repo.getPollOptions(poll.id);
      assert.equal(options.length, 2);
      assert.equal(options[0].optionText, 'Seal Sector B');

      // Trace 5: Vote recorded
      const voteRes = await voteTracker.processPollAnswer({
        poll_id: published.telegramPollId,
        user: { id: 7001, is_bot: false, first_name: 'Cmdr Shepard' },
        option_ids: [0],
      });
      assert.equal(voteRes.status, 'recorded');

      const user = await repo.getUserByTelegramId(7001);
      assert.ok(user);
      assert.equal(user.firstName, 'Cmdr Shepard');

      const activeVotes = await repo.getActiveVotesForInteraction(interaction.id);
      assert.equal(activeVotes.length, 1);
      assert.equal(activeVotes[0].telegramUserId, 7001);

      // Trace 6: Result closure and reveal
      const closureRes = await closureService.closeInteraction(interaction);
      assert.equal(closureRes.processed, true);

      const resultRecord = await repo.getResultByInteractionId(interaction.id);
      assert.ok(resultRecord);
      assert.equal(resultRecord.totalParticipants, 1);
      assert.equal(resultRecord.winningOptionIndex, 0);
      assert.equal(resultRecord.winningPercentage, 100);

      // Verify closed interaction state
      const finalInteraction = await repo.getInteraction(interaction.id);
      assert.equal(finalInteraction?.lifecycleState, 'COMPLETED');
    });
  });

  describe('2. Post Lifecycle & Invalid State Transitions', () => {
    it('accepts strictly valid forward state transitions', () => {
      assert.equal(canTransition('DRAFT', 'VALIDATED'), true);
      assert.equal(canTransition('VALIDATED', 'PUBLISHED'), true);
      assert.equal(canTransition('PUBLISHED', 'OPEN'), true);
      assert.equal(canTransition('OPEN', 'CLOSED'), true);
      assert.equal(canTransition('CLOSED', 'RESOLVING'), true);
      assert.equal(canTransition('RESOLVING', 'RESULT_POSTED'), true);
      assert.equal(canTransition('RESULT_POSTED', 'COMPLETED'), true);
      assert.equal(canTransition('OPEN', 'OPEN'), true); // Idempotent same state
    });

    it('rejects invalid state regressions and skips', () => {
      assert.equal(canTransition('CLOSED', 'OPEN'), false);
      assert.equal(canTransition('COMPLETED', 'RESOLVING'), false);
      assert.equal(canTransition('DRAFT', 'CLOSED'), false);
      assert.equal(canTransition('RESULT_POSTED', 'OPEN'), false);

      assert.throws(
        () => assertValidTransition('CLOSED', 'OPEN', 'int_test'),
        InvalidLifecycleTransitionError,
      );
    });
  });

  describe('3. Native Poll Creation & Payload Validation', () => {
    it('correctly creates native poll with anonymous configuration for channels and option metadata', async () => {
      const plan = planner.plan({
        id: 'test_poll_01',
        title: 'Tactical Dilemma',
        format: 'impossible_dilemma',
        choices: [
          { label: 'Option A: Sacrifice pawn', tradeOff: 'Loss of material' },
          { label: 'Option B: Expose king', tradeOff: 'High tactical vulnerability' },
        ],
      });

      assert.equal(plan.interactionType, 'poll');
      assert.ok(plan.pollConfig);
      assert.equal(plan.pollConfig.isAnonymous, true);
      assert.equal(plan.pollConfig.allowsMultipleAnswers, false);
      assert.equal(plan.pollConfig.options.length, 2);

      const pubResult = await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: 'test_poll_01' },
        plan,
        formattedText: 'Scenario text',
      });

      assert.ok(pubResult.telegramPollId);
      assert.equal(telegram.history.polls.length, 1);
      assert.equal(telegram.history.polls[0].is_anonymous, true);
    });
  });

  describe('4. Vote Tracking: Initial, Changed, and Withdrawn Votes', () => {
    let testPollId: string;
    let testInteractionId: string;

    beforeEach(async () => {
      const plan = planner.plan({
        id: 'vote_test_post',
        title: 'Split Decision',
        choices: [
          { label: 'Path Alpha', tradeOff: 'Resource loss' },
          { label: 'Path Beta', tradeOff: 'Time delay' },
        ],
      });

      const published = await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: 'vote_test_post' },
        plan,
        formattedText: 'Choose path',
      });

      testPollId = published.telegramPollId!;
      testInteractionId = published.interactionId;
    });

    it('records initial vote and updates option counts', async () => {
      const res = await voteTracker.processPollAnswer({
        poll_id: testPollId,
        user: { id: 9001, is_bot: false, first_name: 'Alice' },
        option_ids: [0],
      });

      assert.equal(res.status, 'recorded');
      assert.equal(res.version, 1);

      const poll = await repo.getPollByTelegramId(testPollId);
      assert.equal(poll?.totalVoterCount, 1);

      const options = await repo.getPollOptions(poll!.id);
      assert.equal(options[0].voteCount, 1);
      assert.equal(options[1].voteCount, 0);
    });

    it('handles changed votes without double-counting', async () => {
      // First vote: Option 0
      await voteTracker.processPollAnswer({
        poll_id: testPollId,
        user: { id: 9002, is_bot: false, first_name: 'Bob' },
        option_ids: [0],
      });

      // Change vote: Option 1
      const changeRes = await voteTracker.processPollAnswer({
        poll_id: testPollId,
        user: { id: 9002, is_bot: false, first_name: 'Bob' },
        option_ids: [1],
      });

      assert.equal(changeRes.status, 'changed');
      assert.equal(changeRes.version, 2);

      const poll = await repo.getPollByTelegramId(testPollId);
      // Total voters must remain 1, not 2!
      assert.equal(poll?.totalVoterCount, 1);

      const options = await repo.getPollOptions(poll!.id);
      // Option 0 decremented to 0, Option 1 incremented to 1
      assert.equal(options[0].voteCount, 0);
      assert.equal(options[1].voteCount, 1);

      const activeVotes = await repo.getActiveVotesForInteraction(testInteractionId);
      assert.equal(activeVotes.length, 1);
      assert.deepEqual(activeVotes[0].selectedOptionIndices, [1]);
    });

    it('handles vote withdrawal (empty option_ids) correctly', async () => {
      // Vote Option 1
      await voteTracker.processPollAnswer({
        poll_id: testPollId,
        user: { id: 9003, is_bot: false, first_name: 'Charlie' },
        option_ids: [1],
      });

      // Withdraw vote
      const withdrawRes = await voteTracker.processPollAnswer({
        poll_id: testPollId,
        user: { id: 9003, is_bot: false, first_name: 'Charlie' },
        option_ids: [],
      });

      assert.equal(withdrawRes.status, 'withdrawn');

      const poll = await repo.getPollByTelegramId(testPollId);
      assert.equal(poll?.totalVoterCount, 0);

      const options = await repo.getPollOptions(poll!.id);
      assert.equal(options[0].voteCount, 0);
      assert.equal(options[1].voteCount, 0);

      const activeVotes = await repo.getActiveVotesForInteraction(testInteractionId);
      assert.equal(activeVotes.length, 0);
    });

    it('ignores votes after interaction has CLOSED', async () => {
      const interaction = await repo.getInteraction(testInteractionId);
      await closureService.closeInteraction(interaction!);

      const res = await voteTracker.processPollAnswer({
        poll_id: testPollId,
        user: { id: 9004, is_bot: false, first_name: 'Late Voter' },
        option_ids: [0],
      });

      assert.equal(res.status, 'ignored_closed');
    });
  });

  describe('5. Webhook Security & Request Authentication', () => {
    it('accepts authorized webhook updates with matching secret token header', async () => {
      const headers = new Headers({
        'x-telegram-bot-api-secret-token': SECRET_TOKEN,
      });

      const update: TelegramUpdate = {
        update_id: 101,
        message: {
          message_id: 201,
          date: Date.now(),
          chat: { id: 123, type: 'channel' },
          text: 'hello',
        },
      };

      const res = await webhookHandler.handleUpdate(update, headers);
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
    });

    it('rejects unauthorized requests with invalid secret token', async () => {
      const headers = new Headers({
        'x-telegram-bot-api-secret-token': 'wrong_secret_attacker',
      });

      const update: TelegramUpdate = {
        update_id: 102,
      };

      const res = await webhookHandler.handleUpdate(update, headers);
      assert.equal(res.status, 401);
      assert.equal(res.body.ok, false);
    });

    it('rejects requests missing secret token header', async () => {
      const headers = new Headers();
      const update: TelegramUpdate = { update_id: 103 };

      const res = await webhookHandler.handleUpdate(update, headers);
      assert.equal(res.status, 401);
    });
  });

  describe('6. Duplicate Webhook Events & Idempotency', () => {
    it('safely deduplicates identical update_ids and avoids re-processing', async () => {
      const headers = new Headers({
        'x-telegram-bot-api-secret-token': SECRET_TOKEN,
      });

      const plan = planner.plan({
        id: 'dup_test_post',
        title: 'Dup Decision',
        choices: [{ label: 'A' }, { label: 'B' }],
      });
      const published = await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: 'dup_test_post' },
        plan,
        formattedText: 'Dup text',
      });

      const pollAnswerUpdate: TelegramUpdate = {
        update_id: 8888,
        poll_answer: {
          poll_id: published.telegramPollId!,
          user: { id: 555, is_bot: false, first_name: 'Eve' },
          option_ids: [0],
        },
      };

      // First delivery
      const firstRes = await webhookHandler.handleUpdate(pollAnswerUpdate, headers);
      assert.equal(firstRes.status, 200);
      assert.equal(firstRes.body.ok, true);
      assert.notEqual((firstRes.body as any).voteResult?.status, undefined);

      // Duplicate delivery (retry from Telegram)
      const secondRes = await webhookHandler.handleUpdate(pollAnswerUpdate, headers);
      assert.equal(secondRes.status, 200);
      assert.equal((secondRes.body as any).duplicate, true);

      // Verify voter count was NOT incremented twice
      const poll = await repo.getPollByTelegramId(published.telegramPollId!);
      assert.equal(poll?.totalVoterCount, 1);
    });
  });

  describe('7. Scheduled Closure & Duplicate Result Prevention', () => {
    it('closes interaction when duration expires and sends result reveal', async () => {
      const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();
      const plan = planner.plan(
        {
          id: 'closure_test_post',
          title: 'Expiring Dilemma',
          choices: [
            { label: 'Defend Perimeter', tradeOff: 'High casualties' },
            { label: 'Retreat to Citadel', tradeOff: 'Abandon outer districts' },
          ],
        },
        { customDurationSeconds: 10 },
      );

      const published = await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: 'closure_test_post' },
        plan,
        formattedText: 'Defend or retreat',
        nowIso: new Date(Date.now() - 100 * 1000).toISOString(), // published 100s ago
      });

      // Cast 2 votes
      await voteTracker.processPollAnswer({
        poll_id: published.telegramPollId!,
        user: { id: 101, is_bot: false, first_name: 'Soldier 1' },
        option_ids: [0],
      });
      await voteTracker.processPollAnswer({
        poll_id: published.telegramPollId!,
        user: { id: 102, is_bot: false, first_name: 'Soldier 2' },
        option_ids: [0],
      });
      await voteTracker.processPollAnswer({
        poll_id: published.telegramPollId!,
        user: { id: 103, is_bot: false, first_name: 'Soldier 3' },
        option_ids: [1],
      });

      // Scheduled tick processing
      const closed = await closureService.processDueInteractions(new Date().toISOString());
      assert.equal(closed.length, 1);
      assert.equal(closed[0].interactionId, published.interactionId);
      assert.equal(closed[0].totalParticipants, 3);

      // Verify result post was delivered to Telegram
      assert.ok(telegram.history.messages.length >= 2); // main post + result post
      const resultMsg = telegram.history.messages.find((m) => m.text.includes('THE VERDICT'));
      assert.ok(resultMsg);
      assert.ok(resultMsg.text.includes('Defend Perimeter'));
      assert.ok(resultMsg.text.includes('66.7%')); // 2 of 3 votes
      assert.ok(resultMsg.text.includes('Retreat to Citadel'));
      assert.ok(resultMsg.text.includes('33.3%')); // 1 of 3 votes
      assert.ok(resultMsg.text.includes('<tg-spoiler>')); // Contains spoiler payoff

      // Stop poll was called in Telegram
      assert.equal(telegram.history.stoppedPolls.length, 1);
    });

    it('is strictly idempotent on duplicate scheduled runs: prevents duplicate result posts', async () => {
      const plan = planner.plan(
        {
          id: 'idempotent_closure_post',
          title: 'Idempotent Dilemma',
          choices: [{ label: 'Option 1' }, { label: 'Option 2' }],
        },
        { customDurationSeconds: 10 },
      );

      const published = await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: 'idempotent_closure_post' },
        plan,
        formattedText: 'Idempotency test',
        nowIso: new Date(Date.now() - 50 * 1000).toISOString(),
      });

      const initialMessageCount = telegram.history.messages.length;

      // First run: processes interaction
      const run1 = await closureService.processDueInteractions(new Date().toISOString());
      assert.equal(run1.length, 1);
      assert.equal(run1[0].processed, true);

      const messagesAfterFirst = telegram.history.messages.length;
      assert.equal(messagesAfterFirst, initialMessageCount + 1); // exactly 1 result post

      // Second concurrent or subsequent run
      const run2 = await closureService.processDueInteractions(new Date().toISOString());
      // No more OPEN interactions due for closure
      assert.equal(run2.length, 0);

      // Verify no extra messages were sent to Telegram
      assert.equal(telegram.history.messages.length, messagesAfterFirst);
    });
  });

  describe('8. Non-Poll Interactions (Open Discussion & Prediction)', () => {
    it('supports open discussion scenarios without forcing native poll', async () => {
      const plan = planner.plan({
        id: 'mystery_post_01',
        title: 'The Stolen Antidote',
        format: 'open_discussion',
        discussionPrompt: 'Review the lab access logs. Who forged the signature?',
      });

      assert.equal(plan.interactionType, 'open_discussion');
      assert.equal(plan.pollConfig, undefined); // No poll!

      const published = await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: 'mystery_post_01', contentType: 'open_discussion' },
        plan,
        formattedText: '<b>THE STOLEN ANTIDOTE</b>\nInvestigate the suspect.',
      });

      // Only 1 message sent (discussion prompt, no poll)
      assert.equal(telegram.history.polls.length, 0);
      assert.equal(published.telegramPollId, undefined);

      const pubMsgs = await repo.getPublishedMessagesForPost('mystery_post_01');
      assert.equal(pubMsgs.length, 1);
      assert.equal(pubMsgs[0].messageType, 'discussion_prompt');

      // Closure resolves discussion without errors
      const interaction = await repo.getInteraction(published.interactionId);
      const closeRes = await closureService.closeInteraction(interaction!);
      assert.equal(closeRes.processed, true);

      const finalInteraction = await repo.getInteraction(published.interactionId);
      assert.equal(finalInteraction?.lifecycleState, 'COMPLETED');
    });

    it('supports prediction interactions with scheduled closure', async () => {
      const plan = planner.plan({
        id: 'pred_post_01',
        title: 'Quantum Computing Breakthrough',
        format: 'prediction',
        choices: [
          { label: 'RSA cracked before 2030', tradeOff: 'Global cryptography reset' },
          { label: 'Post-quantum algorithms prevail', tradeOff: 'Decade-long migration costs' },
        ],
      });

      assert.equal(plan.interactionType, 'prediction_vote');
      assert.ok(plan.pollConfig);
      assert.equal(plan.pollConfig.isAnonymous, true);

      const published = await publisher.publishInteraction({
        post: { ...sampleDilemmaPost, id: 'pred_post_01', contentType: 'prediction' },
        plan,
        formattedText: 'Predict the cryptographic frontier.',
      });

      assert.ok(published.telegramPollId);
      assert.equal(telegram.history.polls.length, 1);
    });
  });
});
