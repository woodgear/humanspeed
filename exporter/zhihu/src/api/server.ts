import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { feedRoutes } from "./routes/feed.js";
import { statusRoutes } from "./routes/status.js";

export async function createServer() {
  const fastify = Fastify({
    logger: false, // We use Winston instead
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
  });

  // Error handler
  fastify.setErrorHandler(errorHandler);

  // Register routes
  await fastify.register(authRoutes, { prefix: "/api" });
  await fastify.register(feedRoutes); // No prefix - handles both /api and /apis paths
  await fastify.register(statusRoutes, { prefix: "/api" });

  // Root endpoint
  fastify.get("/", async (request, reply) => {
    return {
      name: "Zhihu Feed Scraper API",
      version: "1.0.0",
      endpoints: {
        auth: {
          "POST /api/auth/qrcode": "Generate login QR code",
          "GET /api/auth/status": "Check login status",
          "GET /api/auth/verify": "Verify current login",
          "POST /api/auth/logout": "Logout",
        },
        feed: {
          "GET /api/feed": "Get feed items",
          "POST /api/feed/scrape": "Trigger feed scraping",
          "GET /api/feed/:id": "Get single feed item",
          "DELETE /api/feed": "Clear feed storage",
        },
        status: {
          "GET /api/status": "Health check",
          "GET /api/vnc": "VNC connection info",
          "GET /api/debug/screenshot": "Capture screenshot",
        },
      },
    };
  });

  return fastify;
}

export async function startServer() {
  try {
    const server = await createServer();

    await server.listen({
      port: config.port,
      host: "0.0.0.0",
    });

    logger.info(`API server listening on http://localhost:${config.port}`);
    logger.info(`Health check: http://localhost:${config.port}/api/status`);

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    throw error;
  }
}
