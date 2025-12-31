import { FastifyInstance } from "fastify";
import { zhihuFeedScraper } from "../../scraper/feed.js";
import { feedStore } from "../../storage/feed-store.js";
import { logger } from "../../utils/logger.js";
import {
  convertFeedItemToResource,
  convertFeedItemsToList,
} from "../../utils/k8s-converter.js";
import { ScrapeJobResource, Status } from "../../types/k8s-style.js";

export async function feedRoutes(fastify: FastifyInstance): Promise<void> {
  // List feed items (K8s-style)
  // Auto-scrapes if needed
  fastify.get<{
    Querystring: {
      limit?: number;
      offset?: number;
      type?: "answer" | "article" | "zvideo" | "pin";
    };
  }>("/apis/zhihu.scraper.io/v1/feeditems", async (request, reply) => {
    const { limit = 20, offset = 0, type } = request.query;

    // Auto-scrape if we don't have enough items
    const total = await feedStore.count();
    const needed = offset + limit;

    if (total < needed) {
      const toScrape = Math.max(needed - total, 10); // Scrape at least 10
      logger.info(
        `Auto-scraping ${toScrape} items (have ${total}, need ${needed})`,
      );

      try {
        const newItems = await zhihuFeedScraper.scrapeFeed({
          maxItems: toScrape,
        });
        await feedStore.save(newItems);
        logger.info(`Auto-scrape completed: ${newItems.length} items`);
      } catch (error) {
        logger.error("Auto-scrape failed:", error);
        // Continue with existing items even if scrape fails
      }
    }

    const items = await feedStore.getAll({ limit, offset, type });
    const updatedTotal = await feedStore.count();

    const feedItemList = convertFeedItemsToList(
      items,
      updatedTotal,
      limit,
      offset,
    );

    reply.send(feedItemList);
  });

  // Get single feed item (K8s-style)
  fastify.get<{
    Params: { name: string };
  }>("/apis/zhihu.scraper.io/v1/feeditems/:name", async (request, reply) => {
    const { name } = request.params;

    const item = await feedStore.getById(name);

    if (!item) {
      const status: Status = {
        kind: "Status",
        apiVersion: "v1",
        metadata: {
          name: "",
          creationTimestamp: new Date().toISOString(),
        },
        status: {
          conditions: [
            {
              type: "NotFound",
              status: "True",
              lastTransitionTime: new Date().toISOString(),
              reason: "ResourceNotFound",
              message: `FeedItem "${name}" not found`,
            },
          ],
        },
      };
      return reply.status(404).send(status);
    }

    const feedItemResource = convertFeedItemToResource(item);
    reply.send(feedItemResource);
  });

  // Legacy endpoint for backward compatibility
  fastify.get("/api/feed", async (request, reply) => {
    reply.redirect(301, "/apis/zhihu.scraper.io/v1/feeditems");
  });
}
