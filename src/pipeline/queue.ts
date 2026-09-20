/**
 * Content Queue Store
 * Provides persistent pre-generation so publishing does not depend on immediate API availability.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ContentItem } from './types.js';

export class ContentQueueStore {
  private queuePath: string;

  constructor(customPath?: string) {
    this.queuePath =
      customPath || path.resolve(process.cwd(), 'data', 'content-queue.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.queuePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.queuePath)) {
      fs.writeFileSync(this.queuePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  public async loadQueue(): Promise<ContentItem[]> {
    try {
      const raw = fs.readFileSync(this.queuePath, 'utf-8');
      return JSON.parse(raw) as ContentItem[];
    } catch {
      return [];
    }
  }

  public async saveQueue(items: ContentItem[]): Promise<void> {
    fs.writeFileSync(this.queuePath, JSON.stringify(items, null, 2), 'utf-8');
  }

  public async enqueue(item: ContentItem): Promise<void> {
    const queue = await this.loadQueue();
    // Do not add if already exists
    const exists = queue.some((q) => q.id === item.id);
    if (!exists) {
      queue.push(item);
      await this.saveQueue(queue);
    }
  }

  public async dequeueNext(): Promise<ContentItem | null> {
    const queue = await this.loadQueue();
    const nextIndex = queue.findIndex((item) => item.status === 'queued');
    if (nextIndex === -1) {
      return null;
    }

    const [item] = queue.splice(nextIndex, 1);
    await this.saveQueue(queue);
    return item;
  }

  public async peek(): Promise<ContentItem[]> {
    const queue = await this.loadQueue();
    return queue.filter((item) => item.status === 'queued');
  }

  public async remove(id: string): Promise<boolean> {
    const queue = await this.loadQueue();
    const initialLen = queue.length;
    const filtered = queue.filter((item) => item.id !== id);
    if (filtered.length !== initialLen) {
      await this.saveQueue(filtered);
      return true;
    }
    return false;
  }

  public async updateItem(updated: ContentItem): Promise<void> {
    const queue = await this.loadQueue();
    const idx = queue.findIndex((i) => i.id === updated.id);
    if (idx >= 0) {
      queue[idx] = updated;
      await this.saveQueue(queue);
    }
  }

  public async count(): Promise<number> {
    const items = await this.peek();
    return items.length;
  }
}
