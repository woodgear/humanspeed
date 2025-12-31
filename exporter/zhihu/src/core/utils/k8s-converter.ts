import { FeedItem } from '../types/feed.js';
import { FeedItemResource, FeedItemList } from '../types/k8s-style.js';

export function convertFeedItemToResource(item: FeedItem): FeedItemResource {
  return {
    kind: 'FeedItem',
    apiVersion: 'zhihu.scraper.io/v1',
    metadata: {
      name: item.id,
      creationTimestamp: item.createdAt,
      labels: {
        'zhihu.scraper.io/type': item.type,
        'zhihu.scraper.io/author': item.author.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
      },
      annotations: {
        'zhihu.scraper.io/url': item.url,
      },
    },
    spec: {
      title: item.title,
      excerpt: item.excerpt,
      url: item.url,
      author: item.author,
      tags: item.tags,
    },
    status: {
      type: item.type,
      stats: item.stats,
    },
  };
}

export function convertFeedItemsToList(
  items: FeedItem[],
  total: number,
  limit: number,
  offset: number
): FeedItemList {
  const hasMore = offset + items.length < total;
  
  return {
    kind: 'FeedItemList',
    apiVersion: 'zhihu.scraper.io/v1',
    metadata: {
      remainingItemCount: hasMore ? total - (offset + items.length) : 0,
    },
    items: items.map(convertFeedItemToResource),
  };
}
