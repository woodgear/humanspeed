import { logger } from "./utils/logger.js";
import { vncService } from "./browser/vnc.js";
import { browserManager } from "./browser/manager.js";
import { sessionManager } from "./browser/session.js";
import { startServer } from "./api/server.js";
import { config } from "./config/index.js";
import { zhihuAuth } from "./scraper/auth.js";

async function promptUserLogin() {
  try {
    logger.info("=".repeat(60));
    logger.info("LOGIN REQUIRED");
    logger.info("=".repeat(60));
    logger.info("Please log in to Zhihu using one of these methods:");
    logger.info("");
    logger.info("Option 1: Use VNC to view browser and scan QR code");
    logger.info(`  Connect: vncviewer localhost:${config.vncPort}`);
    logger.info("");
    logger.info("Option 2: Generate QR code via API");
    logger.info(
      `  Command: curl -X POST http://localhost:${config.port}/api/auth/qrcode`,
    );
    logger.info("");
    logger.info("The browser will navigate to Zhihu login page now...");
    logger.info("=".repeat(60));

    // Navigate to Zhihu login page
    const page = browserManager.getPage();
    await page.goto("https://www.zhihu.com/signin", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    logger.info(
      "Browser navigated to login page. Waiting for user to log in...",
    );
    logger.info(
      "You can watch the login process via VNC or check login status:",
    );
    logger.info(`  curl http://localhost:${config.port}/api/auth/verify`);
  } catch (error) {
    logger.error("Failed to navigate to login page:", error);
    logger.warn(
      "Please manually navigate to https://www.zhihu.com/signin in the browser",
    );
  }
}

async function main() {
  logger.info("Starting Zhihu Feed Scraper...");
  logger.info(`Node environment: ${config.nodeEnv}`);

  try {
    // Step 1: Start VNC service
    logger.info("Step 1: Starting VNC service...");
    await vncService.start();

    // Step 2: Initialize browser
    logger.info("Step 2: Initializing browser...");
    await browserManager.initialize();

    // Step 3: Try to restore session
    logger.info("Step 3: Checking for saved session...");
    const context = browserManager.getContext();
    const restored = await sessionManager.restoreSession(context);

    if (restored) {
      logger.info("Session restored successfully");

      // Verify session is still valid
      const isValid = await zhihuAuth.verifyLogin();
      if (isValid) {
        logger.info("Session verified - user is logged in");
      } else {
        logger.warn("Session expired - login required");
        await promptUserLogin();
      }
    } else {
      logger.info("No valid session found. Login required.");
      await promptUserLogin();
    }

    // Step 4: Start API server
    logger.info("Step 4: Starting API server...");
    const server = await startServer();

    const vncInfo = vncService.getConnectionInfo();

    logger.info("=".repeat(60));
    logger.info("Zhihu Feed Scraper is ready!");
    logger.info("=".repeat(60));
    logger.info(`API Server: http://localhost:${config.port}`);
    logger.info(`Health Check: http://localhost:${config.port}/api/status`);
    logger.info("");
    logger.info("VNC Access:");
    logger.info(`  - NoVNC (Browser): ${vncInfo.novncUrl}`);
    logger.info(`  - VNC Client: localhost:${config.vncPort}`);
    logger.info("=".repeat(60));

    // Graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down gracefully...");

      try {
        await server.close();
        logger.info("API server stopped");

        await browserManager.cleanup();
        logger.info("Browser cleanup completed");

        await vncService.stop();
        logger.info("VNC service stopped");

        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("Fatal error during startup:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});
