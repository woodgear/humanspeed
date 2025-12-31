import { Page } from "playwright";
import { logger } from "../utils/logger.js";
import { browserManager } from "../browser/manager.js";
import { feedParser } from "./parser.js";
import { FeedItem, ScrapeOptions } from "../types/feed.js";
import { AppError, ErrorCodes } from "../types/api.js";
import { config } from "../config/index.js";
import { randomDelay, sleep } from "../utils/retry.js";

const ZHIHU_FEED_URL = "https://www.zhihu.com/";

export class ZhihuFeedScraper {
  private seenIds = new Set<string>();

  async scrapeFeed(options: ScrapeOptions = {}): Promise<FeedItem[]> {
    const {
      maxItems = config.maxFeedItems,
      timeout = config.scrapeTimeout,
      scrollInterval = config.scrollInterval,
    } = options;

    try {
      logger.info(`Starting feed scrape (max items: ${maxItems})...`);

      const page = browserManager.getPage();

      // Navigate to feed page
      await page.goto(ZHIHU_FEED_URL, { waitUntil: "networkidle", timeout });

      // Wait for feed container
      await this.waitForFeedContainer(page);

      const allItems: FeedItem[] = [];
      const startTime = Date.now();

      while (allItems.length < maxItems) {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          logger.warn(`Scrape timeout reached after ${timeout}ms`);
          break;
        }

        // Parse current visible items
        logger.debug("Starting to parse visible items...");
        const items = await feedParser.parseItems(page);
        logger.debug(`Finished parsing, got ${items.length} items`);

        // Add new items (deduplicated)
        const newItems = items.filter((item) => !this.seenIds.has(item.id));
        newItems.forEach((item) => {
          this.seenIds.add(item.id);
          allItems.push(item);
        });

        logger.info(
          `Parsed ${items.length} items, ${newItems.length} new. Total: ${allItems.length}/${maxItems}`,
        );

        // Check if we have enough items
        if (allItems.length >= maxItems) {
          break;
        }

        // Scroll to load more
        const hasMore = await this.scrollAndWait(page, scrollInterval);

        if (!hasMore) {
          logger.info("Reached end of feed or no more new content");
          break;
        }

        // Random delay to avoid detection
        await randomDelay(config.minRequestDelay, config.maxRequestDelay);
      }

      logger.info(`Scrape completed. Collected ${allItems.length} items.`);

      return allItems.slice(0, maxItems);
    } catch (error) {
      logger.error("Error during feed scraping:", error);
      throw new AppError(
        ErrorCodes.SCRAPE_ERROR,
        "Failed to scrape feed",
        500,
        error,
      );
    }
  }

  private async waitForFeedContainer(page: Page): Promise<void> {
    try {
      await page.waitForSelector(".Topstory-mainColumn, .TopstoryMain", {
        state: "visible",
        timeout: 10000,
      });
      logger.debug("Feed container loaded");
    } catch (error) {
      logger.error("Feed container not found");
      throw new AppError(
        ErrorCodes.SCRAPE_ERROR,
        "Feed container not found on page",
        500,
      );
    }
  }

  private async scrollAndWait(page: Page, interval: number): Promise<boolean> {
    try {
      // Get current scroll height
      const previousHeight = await page.evaluate("document.body.scrollHeight");

      // Scroll to bottom
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");

      // Wait for potential new content
      await sleep(interval);

      // Check if page height increased
      const newHeight = await page.evaluate("document.body.scrollHeight");

      if (newHeight > previousHeight) {
        logger.debug(
          `Page height increased: ${previousHeight} -> ${newHeight}`,
        );
        return true;
      }

      // Try waiting a bit more
      await sleep(interval);
      const finalHeight = await page.evaluate("document.body.scrollHeight");

      return finalHeight > previousHeight;
    } catch (error) {
      logger.warn("Error during scroll:", error);
      return false;
    }
  }

  clearSeenIds(): void {
    this.seenIds.clear();
    logger.debug("Cleared seen IDs cache");
  }

  getSeenCount(): number {
    return this.seenIds.size;
  }
}

export const zhihuFeedScraper = new ZhihuFeedScraper();
