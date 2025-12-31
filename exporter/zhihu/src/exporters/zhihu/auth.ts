import { Page } from 'playwright';
import { logger } from '../utils/logger.js';
import { browserManager } from '../browser/manager.js';
import { sessionManager } from '../browser/session.js';
import { QRCodeResult, LoginStatus } from '../types/auth.js';
import { AppError, ErrorCodes } from '../types/api.js';
import { randomDelay } from '../utils/retry.js';

const ZHIHU_LOGIN_URL = 'https://www.zhihu.com/signin';
const QR_CODE_TIMEOUT = 300000; // 5 minutes

const SELECTORS = {
  // These selectors need to be verified/updated based on actual Zhihu HTML
  QR_TAB: '.SignFlow-tab--qrcode, [data-za-detail-view-id*="qr"]',
  QR_CODE_IMG: '.Qrcode-img img, .SignFlow-qrcode img',
  QR_CODE_CONTAINER: '.Qrcode-content, .SignFlow-qrcodeContainer',
  USER_AVATAR: '.AppHeader-profile .Avatar',
  LOGIN_FORM: '.SignFlow',
};

export class ZhihuAuth {
  private currentSessionId: string | null = null;
  private loginCheckInterval: NodeJS.Timeout | null = null;

  async loginWithQRCode(): Promise<QRCodeResult> {
    try {
      logger.info('Starting QR code login process...');

      const page = browserManager.getPage();

      // Navigate to login page
      await page.goto(ZHIHU_LOGIN_URL, { waitUntil: 'networkidle' });
      await randomDelay(1000, 2000);

      // Try to click QR code tab if it exists
      try {
        const qrTab = page.locator(SELECTORS.QR_TAB).first();
        if (await qrTab.isVisible({ timeout: 3000 })) {
          await qrTab.click();
          await randomDelay(500, 1000);
          logger.debug('Clicked QR code tab');
        }
      } catch (error) {
        logger.debug('QR tab not found or not needed');
      }

      // Wait for QR code to appear
      const qrCodeImg = page.locator(SELECTORS.QR_CODE_IMG).first();
      await qrCodeImg.waitFor({ state: 'visible', timeout: 10000 });

      // Get QR code as base64
      const qrCodeBase64 = await this.extractQRCode(page);

      this.currentSessionId = this.generateSessionId();

      logger.info(`QR code generated. Session ID: ${this.currentSessionId}`);

      return {
        base64: qrCodeBase64,
        sessionId: this.currentSessionId,
        expiresIn: QR_CODE_TIMEOUT / 1000, // in seconds
      };
    } catch (error) {
      logger.error('Failed to generate QR code:', error);
      throw new AppError(
        ErrorCodes.SCRAPE_ERROR,
        'Failed to generate QR code for login',
        500,
        error
      );
    }
  }

  async checkLoginStatus(sessionId: string): Promise<LoginStatus> {
    if (sessionId !== this.currentSessionId) {
      return {
        isLoggedIn: false,
        status: 'expired',
        message: 'Invalid or expired session',
      };
    }

    try {
      const page = browserManager.getPage();

      // Check if user avatar is present (indicates logged in)
      const avatar = page.locator(SELECTORS.USER_AVATAR).first();
      const isLoggedIn = await avatar.isVisible({ timeout: 1000 }).catch(() => false);

      if (isLoggedIn) {
        logger.info('Login successful!');

        // Save session
        const context = browserManager.getContext();
        await sessionManager.saveSession(context);

        this.currentSessionId = null; // Clear session ID

        return {
          isLoggedIn: true,
          status: 'confirmed',
          message: 'Login successful',
        };
      }

      // Check if still on login page
      const currentUrl = page.url();
      if (currentUrl.includes('/signin')) {
        return {
          isLoggedIn: false,
          status: 'pending',
          message: 'Waiting for QR code scan',
        };
      }

      // Might be logged in but URL changed
      return {
        isLoggedIn: false,
        status: 'pending',
        message: 'Checking login status...',
      };
    } catch (error) {
      logger.error('Error checking login status:', error);
      return {
        isLoggedIn: false,
        status: 'error',
        message: 'Failed to check login status',
      };
    }
  }

  async verifyLogin(): Promise<boolean> {
    try {
      const page = browserManager.getPage();

      // Navigate to homepage to verify login
      await page.goto('https://www.zhihu.com/', { waitUntil: 'networkidle' });

      // Check for user avatar
      const avatar = page.locator(SELECTORS.USER_AVATAR).first();
      const isLoggedIn = await avatar.isVisible({ timeout: 5000 }).catch(() => false);

      if (isLoggedIn) {
        logger.info('Login verified successfully');
        return true;
      }

      logger.warn('Login verification failed');
      return false;
    } catch (error) {
      logger.error('Error verifying login:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      logger.info('Logging out...');

      const context = browserManager.getContext();
      await context.clearCookies();
      await sessionManager.clearSession();

      logger.info('Logged out successfully');
    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  }

  private async extractQRCode(page: Page): Promise<string> {
    try {
      // Method 1: Get src attribute
      const qrImg = page.locator(SELECTORS.QR_CODE_IMG).first();
      const src = await qrImg.getAttribute('src');

      if (src && src.startsWith('data:image')) {
        // Already base64
        return src;
      }

      // Method 2: Screenshot the QR code element
      const buffer = await qrImg.screenshot();
      const base64 = buffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      logger.error('Failed to extract QR code:', error);
      throw error;
    }
  }

  private generateSessionId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const zhihuAuth = new ZhihuAuth();
