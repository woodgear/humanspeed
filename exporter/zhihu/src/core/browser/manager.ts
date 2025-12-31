import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { AppError, ErrorCodes } from '../types/api.js';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing browser...');

      this.browser = await chromium.launch({
        headless: false,
        args: [
          `--display=${config.display}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      this.context = await this.browser.newContext({
        viewport: {
          width: config.browserWidth,
          height: config.browserHeight,
        },
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      });

      // Anti-detection measures
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      this.page = await this.context.newPage();

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      throw new AppError(
        ErrorCodes.BROWSER_ERROR,
        'Failed to initialize browser',
        500,
        error
      );
    }
  }

  getPage(): Page {
    if (!this.page) {
      throw new AppError(
        ErrorCodes.BROWSER_ERROR,
        'Browser not initialized. Call initialize() first.',
        500
      );
    }
    return this.page;
  }

  getContext(): BrowserContext {
    if (!this.context) {
      throw new AppError(
        ErrorCodes.BROWSER_ERROR,
        'Browser context not available',
        500
      );
    }
    return this.context;
  }

  getBrowser(): Browser {
    if (!this.browser) {
      throw new AppError(
        ErrorCodes.BROWSER_ERROR,
        'Browser not available',
        500
      );
    }
    return this.browser;
  }

  isInitialized(): boolean {
    return this.browser !== null && this.context !== null && this.page !== null;
  }

  async screenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new AppError(ErrorCodes.BROWSER_ERROR, 'No page available', 500);
    }
    await this.page.screenshot({ path, fullPage: true });
    logger.debug(`Screenshot saved to ${path}`);
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up browser resources...');

    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      logger.info('Browser cleanup completed');
    } catch (error) {
      logger.error('Error during browser cleanup:', error);
    }
  }
}

export const browserManager = new BrowserManager();
