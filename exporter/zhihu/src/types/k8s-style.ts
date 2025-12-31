// Kubernetes-style API types

export interface ObjectMeta {
  name: string;
  namespace?: string;
  uid?: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface TypeMeta {
  kind: string;
  apiVersion: string;
}

export interface FeedItemResource extends TypeMeta {
  metadata: ObjectMeta;
  spec: {
    title: string;
    excerpt: string;
    url: string;
    author: {
      name: string;
      url: string;
      avatar: string;
    };
    tags: string[];
  };
  status: {
    type: 'answer' | 'article' | 'zvideo' | 'pin';
    stats: {
      voteCount: number;
      commentCount: number;
    };
  };
}

export interface FeedItemList extends TypeMeta {
  metadata: {
    continue?: string;
    remainingItemCount?: number;
  };
  items: FeedItemResource[];
}

export interface ScrapeJobResource extends TypeMeta {
  metadata: ObjectMeta;
  spec: {
    maxItems?: number;
    timeout?: number;
    clearCache?: boolean;
  };
  status: {
    phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed';
    itemsScraped?: number;
    startTime?: string;
    completionTime?: string;
    message?: string;
  };
}

export interface Status extends TypeMeta {
  metadata: ObjectMeta;
  status: {
    conditions: Array<{
      type: string;
      status: 'True' | 'False' | 'Unknown';
      lastTransitionTime: string;
      reason: string;
      message: string;
    }>;
  };
}
