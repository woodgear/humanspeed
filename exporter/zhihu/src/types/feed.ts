export interface FeedItem {
  id: string;
  type: 'answer' | 'article' | 'zvideo' | 'pin';
  title: string;
  excerpt: string;
  author: Author;
  stats: Stats;
  url: string;
  createdAt: string;
  tags: string[];
}

export interface Author {
  name: string;
  url: string;
  avatar: string;
}

export interface Stats {
  voteCount: number;
  commentCount: number;
}

export interface ScrapeOptions {
  maxItems?: number;
  timeout?: number;
  scrollInterval?: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  type?: FeedItem['type'];
}
