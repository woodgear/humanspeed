import fs from "fs/promises";
import path from "path";
import { BrowserContext } from "playwright";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { Session } from "../types/auth.js";

export class SessionManager {
  private sessionPath: string;

  constructor() {
    this.sessionPath = path.join(config.sessionDir, "zhihu-session.json");
  }

  async saveSession(context: BrowserContext): Promise<void> {
    try {
      logger.info("Saving session...");

      // Ensure directory exists
      await fs.mkdir(config.sessionDir, { recursive: true });

      const cookies = await context.cookies();
      logger.debug(`Retrieved ${cookies.length} cookies`);

      // Get localStorage (requires page on zhihu domain)
      const pages = context.pages();
      let localStorage = {};

      if (pages.length > 0) {
        const page = pages[0];
        const url = page.url();
        logger.debug(`Current page URL: ${url}`);

        // Only try to get localStorage if we're on zhihu domain
        if (url.includes("zhihu.com")) {
          try {
            localStorage = await page.evaluate(() => {
              const storage: Record<string, string> = {};
              for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key) {
                  storage[key] = window.localStorage.getItem(key) || "";
                }
              }
              return storage;
            });
            logger.debug(
              `Retrieved ${Object.keys(localStorage).length} localStorage items`,
            );
          } catch (error) {
            logger.warn(
              "Failed to get localStorage, continuing with cookies only:",
              error,
            );
          }
        } else {
          logger.warn(
            `Page is not on zhihu.com (${url}), skipping localStorage`,
          );
        }
      } else {
        logger.warn("No pages available, saving cookies only");
      }

      const session: Session = {
        cookies,
        localStorage,
        timestamp: Date.now(),
      };

      await fs.writeFile(
        this.sessionPath,
        JSON.stringify(session, null, 2),
        "utf-8",
      );

      logger.info(`Session saved successfully to ${this.sessionPath}`);
      logger.info(
        `Saved ${cookies.length} cookies and ${Object.keys(localStorage).length} localStorage items`,
      );
    } catch (error) {
      logger.error("Failed to save session:", error);
      throw error;
    }
  }

  async restoreSession(context: BrowserContext): Promise<boolean> {
    try {
      logger.info("Attempting to restore session...");

      const session = await this.loadSession();

      if (!session) {
        logger.info("No session file found");
        return false;
      }

      if (this.isExpired(session)) {
        logger.warn("Session has expired");
        await this.clearSession();
        return false;
      }

      // Restore cookies
      await context.addCookies(session.cookies);
      logger.debug(`Restored ${session.cookies.length} cookies`);

      // Restore localStorage (requires navigation to the domain first)
      if (Object.keys(session.localStorage).length > 0) {
        try {
          const pages = context.pages();
          if (pages.length > 0) {
            const page = pages[0];
            const url = page.url();

            // Navigate to zhihu.com if not already there
            if (!url.includes("zhihu.com")) {
              logger.debug(
                "Navigating to zhihu.com to restore localStorage...",
              );
              await page.goto("https://www.zhihu.com/", {
                waitUntil: "domcontentloaded",
                timeout: 10000,
              });
            }

            await page.evaluate((storage) => {
              for (const [key, value] of Object.entries(storage)) {
                window.localStorage.setItem(key, value as string);
              }
            }, session.localStorage);
            logger.debug(
              `Restored ${Object.keys(session.localStorage).length} localStorage items`,
            );
          }
        } catch (error) {
          logger.warn(
            "Failed to restore localStorage, continuing with cookies only:",
            error,
          );
        }
      }

      logger.info("Session restored successfully");
      return true;
    } catch (error) {
      logger.error("Failed to restore session:", error);
      return false;
    }
  }

  private async loadSession(): Promise<Session | null> {
    try {
      const data = await fs.readFile(this.sessionPath, "utf-8");
      return JSON.parse(data) as Session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  isExpired(session: Session): boolean {
    const expireDuration = config.sessionExpireDays * 24 * 60 * 60 * 1000;
    return Date.now() - session.timestamp > expireDuration;
  }

  async clearSession(): Promise<void> {
    try {
      await fs.unlink(this.sessionPath);
      logger.info("Session cleared");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.error("Failed to clear session:", error);
      }
    }
  }

  async hasValidSession(): Promise<boolean> {
    const session = await this.loadSession();
    return session !== null && !this.isExpired(session);
  }
}

export const sessionManager = new SessionManager();
