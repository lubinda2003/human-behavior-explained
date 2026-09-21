/**
 * GitHub Actions Workflow Configuration Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('GitHub Actions Workflow Configuration', () => {
  const workflowPath = path.resolve(
    process.cwd(),
    '.github',
    'workflows',
    'content-pipeline.yml'
  );

  it('workflow file should exist', () => {
    assert.ok(
      fs.existsSync(workflowPath),
      `Expected workflow file at ${workflowPath}`
    );
  });

  it('should use workflow_dispatch only (no automatic cron scheduling)', () => {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    assert.ok(
      content.includes('workflow_dispatch:'),
      'Must contain manual workflow_dispatch trigger'
    );
    assert.ok(
      !content.includes('schedule:') && !content.includes('cron:'),
      'Must NOT contain automatic cron schedules to prevent unintended publishing'
    );
  });

  it('should support workflow_dispatch with required actions', () => {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    assert.ok(content.includes('workflow_dispatch:'), 'Must support manual workflow_dispatch');
    assert.ok(content.includes('publish_next'), 'Must support publish_next action');
    assert.ok(content.includes('generate_posts'), 'Must support generate_posts action');
    assert.ok(content.includes('generate_and_publish'), 'Must support generate_and_publish action');
    assert.ok(content.includes('dry_run'), 'Must support dry_run action');
  });

  it('should reference required environment secrets', () => {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    assert.ok(content.includes('GEMINI_API_KEY'), 'Must wire GEMINI_API_KEY secret');
    assert.ok(content.includes('TELEGRAM_BOT_TOKEN'), 'Must wire TELEGRAM_BOT_TOKEN secret');
    assert.ok(content.includes('TELEGRAM_CHANNEL_ID'), 'Must wire TELEGRAM_CHANNEL_ID secret');
  });

  it('should declare write permissions to commit content memory and queue updates', () => {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    assert.ok(
      content.includes('contents: write'),
      'Must have contents: write permission to commit back to repository'
    );
    assert.ok(
      content.includes('git add data/'),
      'Must commit data/ changes back to repo'
    );
  });

  it('should use deterministic npm ci for dependency installation', () => {
    const content = fs.readFileSync(workflowPath, 'utf-8');
    assert.ok(
      content.includes('run: npm ci'),
      'Must run npm ci for deterministic installation'
    );
    assert.ok(
      !content.includes('npm ci || npm install'),
      'Must not rely on non-deterministic npm ci || npm install'
    );
  });
});
