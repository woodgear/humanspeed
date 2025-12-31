import { FeedItem, QueryOptions } from '../types/feed.js';
import { logger } from '../utils/logger.js';

// Abstract storage interface
export interface IFeedStore {
  save(items: FeedItem[]): Promise<void>;
  getAll(options?: QueryOptions): Promise<FeedItem[]>;
  getById(id: string): Promise<FeedItem | null>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

// In-memory implementation
export class InMemoryFeedStore implements IFeedStore {
  private feeds: Map<string, FeedItem> = new Map();

  async save(items: FeedItem[]): Promise<void> {
    for (const item of items) {
      this.feeds.set(item.id, item);
    }
    logger.debug(`Saved ${items.length} items to memory store`);
  }

  async getAll(options: QueryOptions = {}): Promise<FeedItem[]> {
    const { limit, offset = 0, type } = options;

    let items = Array.from(this.feeds.values());

    // Filter by type if specified
    if (type) {
      items = items.filter((item) => item.type === type);
    }

    // Apply pagination
    const start = offset;
    const end = limit ? start + limit : undefined;

    return items.slice(start, end);
  }

  async getById(id: string): Promise<FeedItem | null> {
    return this.feeds.get(id) || null;
  }

  async clear(): Promise<void> {
    this.feeds.clear();
    logger.debug('Cleared memory store');
  }

  async count(): Promise<number> {
    return this.feeds.size;
  }
}

// Singleton instance
export const feedStore: IFeedStore = new InMemoryFeedStore();

// Future implementations can be added here:
// export class JsonFileFeedStore implements IFeedStore { ... }
// export class SqliteFeedStore implements IFeedStore { ... }
