#!/usr/bin/env node
/**
 * CLI for Telegram Psychology Content Pipeline
 *
 * Usage:
 *   npx tsx src/pipeline/cli.ts generate [--count 2] [--dry-run]
 *   npx tsx src/pipeline/cli.ts publish [--dry-run]
 *   npx tsx src/pipeline/cli.ts generate-and-publish [--dry-run]
 *   npx tsx src/pipeline/cli.ts queue
 *   npx tsx src/pipeline/cli.ts memory
 *   npx tsx src/pipeline/cli.ts status
 *   npx tsx src/pipeline/cli.ts test-visuals
 */

import { PipelineCoordinator } from './coordinator.js';
import { ContentMemoryStore } from './memory.js';
import { ContentQueueStore } from './queue.js';
import { ContentPillar } from './types.js';
import { VisualGenerator } from './visuals/index.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }

  return { command, flags };
}

async function main() {
  const { command, flags } = parseArgs();
  const coordinator = new PipelineCoordinator();
  const queueStore = new ContentQueueStore();
  const memoryStore = new ContentMemoryStore();

  const isDryRun = Boolean(flags['dry-run'] || flags['dryrun']);

  try {
    switch (command) {
      case 'generate': {
        const count = flags.count ? parseInt(flags.count as string, 10) : 1;
        const pillar = flags.pillar as ContentPillar | undefined;
        const topic = flags.topic as string | undefined;

        console.log(`[CLI] Generating ${count} post(s)...`);
        const items = await coordinator.generatePosts({
          count,
          pillar,
          topic,
          dryRun: isDryRun,
        });

        console.log(`\nSuccessfully generated and queued ${items.length} post(s):`);
        items.forEach((item, idx) => {
          console.log(
            `  ${idx + 1}. "${item.draft.title}" [${item.pillar}] ${item.visualDecision.needed ? '(+ Graphic)' : '(Text Only)'}`
          );
        });
        break;
      }

      case 'publish': {
        console.log(`[CLI] Publishing next post${isDryRun ? ' (DRY RUN)' : ''}...`);
        const res = await coordinator.publishNext({ dryRun: isDryRun });
        if (res.success && res.item) {
          console.log(
            `\n[SUCCESS] Published: "${res.item.draft.title}" [${res.item.pillar}]`
          );
          if (res.item.graphicPath) {
            console.log(`Graphic: ${res.item.graphicPath}`);
          }
        } else {
          console.error(`\n[FAILED] Could not publish next post: ${res.result?.error || 'Unknown error'}`);
          process.exit(1);
        }
        break;
      }

      case 'generate-and-publish': {
        console.log(`[CLI] Generating and publishing immediately${isDryRun ? ' (DRY RUN)' : ''}...`);
        const pillar = flags.pillar as ContentPillar | undefined;
        const topic = flags.topic as string | undefined;

        const res = await coordinator.generateAndPublish({
          pillar,
          topic,
          dryRun: isDryRun,
        });

        if (res.success && res.item) {
          console.log(
            `\n[SUCCESS] Completed pipeline: "${res.item.draft.title}" [${res.item.pillar}]`
          );
        } else {
          console.error('\n[FAILED] Could not complete generate-and-publish pipeline.');
          process.exit(1);
        }
        break;
      }

      case 'queue': {
        const items = await queueStore.peek();
        console.log(`\n=== Current Queue (${items.length} item${items.length === 1 ? '' : 's'}) ===`);
        if (items.length === 0) {
          console.log('Queue is empty. Use "generate" command to prepare posts.');
        } else {
          items.forEach((item, idx) => {
            console.log(
              `${idx + 1}. [${item.pillar}] "${item.draft.title}"\n   ID: ${item.id} | Visual: ${item.visualDecision.needed ? item.visualDecision.template : 'None'}`
            );
          });
        }
        break;
      }

      case 'memory': {
        const memory = await memoryStore.loadMemory();
        console.log(`\n=== Content Memory (${memory.length} items recorded) ===`);
        memory.slice(0, 15).forEach((item, idx) => {
          console.log(
            `${idx + 1}. [${item.pillar}] "${item.title}" (${item.publicationDate.slice(0, 10)})\n   Concept: ${item.coreConcept}\n   Sources: ${item.sources.join(', ')}`
          );
        });
        break;
      }

      case 'status': {
        const status = await coordinator.getStatus();
        console.log('\n=== Telegram Psychology Pipeline Status ===');
        console.log(`Pending Queue Items : ${status.queueCount}`);
        console.log(`Total Published Posts: ${status.memoryCount}`);
        console.log(`Next Recommended Pillar: [${status.nextTargetPillar}]`);
        console.log('\nRecent Publications:');
        status.recentMemory.forEach((m, idx) => {
          console.log(`  ${idx + 1}. [${m.pillar}] "${m.title}" (${m.date.slice(0, 10)})`);
        });
        break;
      }

      case 'test-visuals': {
        console.log('[CLI] Generating test graphics for all 7 templates...');
        const gen = new VisualGenerator();
        const testSpecs = [
          {
            title: 'Concept Diagram: Dual Process Mind',
            tag: 'COGNITIVE ARCHITECTURE',
            template: 'concept_diagram' as const,
            payload: {
              template: 'concept_diagram' as const,
              data: {
                centralConcept: 'System 1 vs System 2 Thinking',
                centralDescription: 'The brain alternates between fast associative heuristics and effortful logical deliberation.',
                pillars: [
                  { title: 'System 1 (Fast)', description: 'Subconscious, automatic, emotionally charged, low energy cost.', badge: 'INTUITION' },
                  { title: 'System 2 (Slow)', description: 'Conscious, deliberate, rule-governed, easily fatigued.', badge: 'ANALYTIC' },
                  { title: 'Ego Depletion', description: 'Under stress, cognitive control surrenders to default heuristics.', badge: 'VULNERABILITY' },
                ],
              },
            },
          },
          {
            title: 'Process Flow: Formation of Phobias',
            tag: 'BEHAVIORAL CHAIN',
            template: 'process_flow' as const,
            payload: {
              template: 'process_flow' as const,
              data: {
                steps: [
                  { number: 1, title: 'Classical Event', description: 'Neutral conditioned stimulus paired with traumatic response.', highlight: 'Conditioning' },
                  { number: 2, title: 'Avoidance', description: 'Immediate withdrawal from the trigger prevents habituation.', highlight: 'Negative Reinforcement' },
                  { number: 3, title: 'Cognitive Loop', description: 'Belief develops that avoidance was what preserved survival.', highlight: 'Perpetuation' },
                ],
              },
            },
          },
        ];

        for (const spec of testSpecs) {
          const res = await gen.renderGraphic(spec, 'cli-test');
          console.log(`Generated: ${res.filePath} (${res.width}x${res.height}, ${res.buffer.length} bytes)`);
        }
        console.log('[SUCCESS] All test visuals rendered successfully.');
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Available commands: generate, publish, generate-and-publish, queue, memory, status, test-visuals');
        process.exit(1);
    }
  } catch (err) {
    console.error('Fatal CLI execution error:', err);
    process.exit(1);
  }
}

main();
