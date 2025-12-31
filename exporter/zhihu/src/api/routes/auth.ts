import { FastifyInstance } from "fastify";
import { zhihuAuth } from "../../scraper/auth.js";
import { ApiResponse } from "../../types/api.js";
import { logger } from "../../utils/logger.js";
import { browserManager } from "../../browser/manager.js";
import { sessionManager } from "../../browser/session.js";

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Generate QR code for login
  fastify.post("/auth/qrcode", async (request, reply) => {
    logger.info("QR code generation requested");

    const result = await zhihuAuth.loginWithQRCode();

    const response: ApiResponse = {
      success: true,
      data: result,
      timestamp: Date.now(),
    };

    reply.send(response);
  });

  // Check login status
  fastify.get<{
    Querystring: { sessionId: string };
  }>("/auth/status", async (request, reply) => {
    const { sessionId } = request.query;

    if (!sessionId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "sessionId query parameter is required",
        },
        timestamp: Date.now(),
      });
    }

    const status = await zhihuAuth.checkLoginStatus(sessionId);

    const response: ApiResponse = {
      success: true,
      data: status,
      timestamp: Date.now(),
    };

    reply.send(response);
  });

  // Verify current login state
  fastify.get("/auth/verify", async (request, reply) => {
    const isLoggedIn = await zhihuAuth.verifyLogin();

    const response: ApiResponse = {
      success: true,
      data: { isLoggedIn },
      timestamp: Date.now(),
    };

    reply.send(response);
  });

  // Save current session manually
  fastify.post("/auth/save-session", async (request, reply) => {
    logger.info("Manual session save requested");

    try {
      const context = browserManager.getContext();
      await sessionManager.saveSession(context);

      const response: ApiResponse = {
        success: true,
        data: { message: "Session saved successfully" },
        timestamp: Date.now(),
      };

      reply.send(response);
    } catch (error) {
      logger.error("Failed to save session:", error);
      reply.status(500).send({
        success: false,
        error: {
          code: "SESSION_SAVE_ERROR",
          message: "Failed to save session",
        },
        timestamp: Date.now(),
      });
    }
  });

  // Logout
  fastify.post("/auth/logout", async (request, reply) => {
    await zhihuAuth.logout();

    const response: ApiResponse = {
      success: true,
      data: { message: "Logged out successfully" },
      timestamp: Date.now(),
    };

    reply.send(response);
  });
}
