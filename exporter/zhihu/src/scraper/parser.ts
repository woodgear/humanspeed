import { Page } from "playwright";
import { JSDOM } from "jsdom";
import { FeedItem } from "../types/feed.js";
import { logger } from "../utils/logger.js";

// These selectors need to be verified/updated based on actual Zhihu HTML structure
const SELECTORS = {
  FEED_CONTAINER: ".Topstory-mainColumn, .TopstoryMain",
  FEED_ITEM: ".ContentItem, .TopstoryItem",
  TITLE: ".ContentItem-title, h2.ContentItem-title",
  EXCERPT: ".RichContent-inner, .ContentItem-more, .RichText",
  AUTHOR_NAME: ".AuthorInfo-name, .UserLink-link",
  AUTHOR_LINK: ".AuthorInfo-name a, .UserLink",
  AUTHOR_AVATAR: ".AuthorInfo-avatar img, .Avatar",
  VOTE_COUNT: ".VoteButton--up",
  COMMENT_COUNT: '[aria-label*="评论"], .ContentItem-actions button',
  CONTENT_URL: ".ContentItem-title a, .TitleLink",
  TIME: ".ContentItem-time, time",
  TAGS: ".Tag-content, .TopicTag",
};

interface RawFeedItem {
  zopId: string;
  dataId: string;
  classList: string;
  title: string;
  excerpt: string;
  authorName: string;
  authorLink: string;
  authorAvatar: string;
  voteText: string;
  contentUrl: string;
  timeAttr: string;
  timeText: string;
  tags: string[];
  commentButtons: string[];
}

export class FeedParser {
  async parseItems(page: Page): Promise<FeedItem[]> {
    try {
      logger.debug("Getting HTML from browser...");

      // Get HTML from browser
      const html = await page.content();

      logger.debug("Parsing HTML with jsdom in Node.js...");

      // Parse in Node.js with jsdom - same DOM API as browser
      const items = this.parseItemsFromHTML(html);

      logger.info(
        `Parsing complete: ${items.length} items successfully extracted`,
      );

      return items;
    } catch (error) {
      logger.error("Error parsing feed items:", error);
      throw error;
    }
  }

  // This function uses standard DOM APIs - works in both browser and Node.js
  parseItemsFromHTML(html: string): FeedItem[] {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const allItems = document.querySelectorAll(SELECTORS.FEED_ITEM);

    // Filter out nested items - only keep top-level feed items
    const items = Array.from(allItems).filter((item) => {
      // Check if this item is nested inside another feed item
      let parent = item.parentElement;
      while (parent) {
        if (parent.matches && parent.matches(SELECTORS.FEED_ITEM)) {
          return false; // This is a nested item, skip it
        }
        parent = parent.parentElement;
      }
      return true; // This is a top-level item
    });

    logger.info(
      `Found ${allItems.length} elements, ${items.length} top-level items after filtering nested ones`,
    );

    const results: FeedItem[] = [];
    const seenIds = new Set<string>();

    items.forEach((item, i) => {
      try {
        const rawItem = this.extractRawDataFromElement(item);
        const feedItem = this.parseSingleItemFromRaw(rawItem, i);

        if (feedItem) {
          // Deduplicate by ID
          if (seenIds.has(feedItem.id)) {
            logger.debug(
              `✗ [${i + 1}/${items.length}] duplicate ID: ${feedItem.id}`,
            );
            return;
          }

          seenIds.add(feedItem.id);
          results.push(feedItem);
          logger.info(
            `✓ [${i + 1}/${items.length}] ${feedItem.title.substring(0, 60)}...`,
          );
          logger.debug(
            `  → ID: ${feedItem.id}, Author: ${feedItem.author.name}, Type: ${feedItem.type}`,
          );
        } else {
          logger.debug(`✗ [${i + 1}/${items.length}] skipped (no ID)`);
        }
      } catch (error) {
        logger.warn(`✗ [${i + 1}/${items.length}] parse failed:`, error);
      }
    });

    logger.info(
      `Deduplicated: ${results.length} unique items from ${items.length} elements`,
    );
    return results;
  }

  // Extract data from a DOM element using standard DOM APIs
  private extractRawDataFromElement(item: Element): RawFeedItem {
    const getAttr = (selector: string, attr: string): string => {
      const el = item.querySelector(selector);
      return el?.getAttribute(attr) || "";
    };

    const getText = (selector: string): string => {
      const el = item.querySelector(selector);
      return el?.textContent?.trim() || "";
    };

    return {
      zopId: item.getAttribute("data-zop") || "",
      dataId: item.getAttribute("data-id") || "",
      classList: item.getAttribute("class") || "",
      title: getText(SELECTORS.TITLE),
      excerpt: getText(SELECTORS.EXCERPT),
      authorName: getText(SELECTORS.AUTHOR_NAME),
      authorLink: getAttr(SELECTORS.AUTHOR_LINK, "href"),
      authorAvatar: getAttr(SELECTORS.AUTHOR_AVATAR, "src"),
      voteText: getText(SELECTORS.VOTE_COUNT),
      contentUrl: getAttr(SELECTORS.CONTENT_URL, "href"),
      timeAttr: getAttr(SELECTORS.TIME, "datetime"),
      timeText: getText(SELECTORS.TIME),
      tags: Array.from(item.querySelectorAll(SELECTORS.TAGS))
        .map((tag) => tag.textContent?.trim() || "")
        .filter((t) => t),
      commentButtons: Array.from(
        item.querySelectorAll(SELECTORS.COMMENT_COUNT),
      ).map((btn) => btn.textContent?.trim() || ""),
    };
  }

  private parseSingleItemFromRaw(
    raw: RawFeedItem,
    index: number,
  ): FeedItem | null {
    // Extract ID
    const id = this.extractIdFromRaw(raw);
    if (!id) {
      return null;
    }

    // Extract type
    const type = this.extractTypeFromRaw(raw);

    // Process title
    const title = raw.title || "Untitled";

    // Process excerpt (truncate if needed)
    let excerpt = raw.excerpt || "";
    if (excerpt.length > 200) {
      excerpt = excerpt.substring(0, 200) + "...";
    }

    // Process author
    const author = {
      name: raw.authorName || "Anonymous",
      url: raw.authorLink ? `https://www.zhihu.com${raw.authorLink}` : "",
      avatar: raw.authorAvatar || "",
    };

    // Process stats
    const stats = {
      voteCount: this.parseCount(raw.voteText),
      commentCount: this.extractCommentCount(raw.commentButtons),
    };

    // Process URL
    let url = raw.contentUrl || "";
    if (url && !url.startsWith("http")) {
      url = `https://www.zhihu.com${url}`;
    }

    // Process time
    const createdAt = raw.timeAttr || raw.timeText || new Date().toISOString();

    // Tags are already extracted
    const tags = raw.tags;

    return {
      id,
      type,
      title,
      excerpt,
      author,
      stats,
      url,
      createdAt,
      tags,
    };
  }

  private extractIdFromRaw(raw: RawFeedItem): string | null {
    // Try data-zop attribute
    if (raw.zopId) {
      logger.debug(`Found ID from data-zop: ${raw.zopId}`);
      return raw.zopId;
    }

    // Try data-id attribute
    if (raw.dataId) {
      logger.debug(`Found ID from data-id: ${raw.dataId}`);
      return raw.dataId;
    }

    // Try to extract from URL
    if (raw.contentUrl) {
      const match = raw.contentUrl.match(/\/(\d+)/);
      if (match) {
        logger.debug(`Found ID from URL: ${match[1]}`);
        return match[1];
      }
    }

    logger.warn(
      `No ID found for item. zopId: ${raw.zopId}, dataId: ${raw.dataId}, contentUrl: ${raw.contentUrl}`,
    );
    return null;
  }

  private extractTypeFromRaw(raw: RawFeedItem): FeedItem["type"] {
    const classList = raw.classList;
    if (!classList) return "answer";

    if (classList.includes("Article")) return "article";
    if (classList.includes("Video") || classList.includes("Zvideo"))
      return "zvideo";
    if (classList.includes("Pin")) return "pin";

    return "answer";
  }

  private extractCommentCount(commentButtons: string[]): number {
    for (const text of commentButtons) {
      if (text.includes("评论") || text.includes("comment")) {
        return this.parseCount(text);
      }
    }
    return 0;
  }

  private parseCount(text: string): number {
    const match = text.match(/(\d+\.?\d*)\s*([万千kKwW]?)/);
    if (!match) return 0;

    const num = parseFloat(match[1]);
    const unit = match[2];

    if (unit === "万" || unit === "w" || unit === "W") {
      return Math.floor(num * 10000);
    } else if (unit === "千" || unit === "k" || unit === "K") {
      return Math.floor(num * 1000);
    }

    return Math.floor(num);
  }
}

export const feedParser = new FeedParser();
