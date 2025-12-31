import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env"), override: true });

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config = {
  // Server
  port: getEnvNumber("PORT", 3000),
  nodeEnv: getEnvString("NODE_ENV", "development"),

  // Browser
  display: getEnvString("DISPLAY", ":99"),
  vncPort: getEnvNumber("VNC_PORT", 5900),
  novncPort: getEnvNumber("NOVNC_PORT", 6080),
  browserWidth: getEnvNumber("BROWSER_WIDTH", 1920),
  browserHeight: getEnvNumber("BROWSER_HEIGHT", 1080),

  // Directories
  dataDir: getEnvString("DATA_DIR", "./data"),
  sessionDir: getEnvString("SESSION_DIR", "./data/sessions"),
  feedDir: getEnvString("FEED_DIR", "./data/feeds"),
  logDir: getEnvString("LOG_DIR", "./logs"),

  // Logging
  logLevel: getEnvString("LOG_LEVEL", "info"),

  // Scraper
  scrapeTimeout: getEnvNumber("SCRAPE_TIMEOUT", 30000),
  maxFeedItems: getEnvNumber("MAX_FEED_ITEMS", 100),
  scrollInterval: getEnvNumber("SCROLL_INTERVAL", 2000),
  sessionExpireDays: getEnvNumber("SESSION_EXPIRE_DAYS", 7),

  // Retry
  maxRetries: getEnvNumber("MAX_RETRIES", 3),
  retryDelay: getEnvNumber("RETRY_DELAY", 1000),
  maxRetryDelay: getEnvNumber("MAX_RETRY_DELAY", 10000),

  // Rate Limiting
  minRequestDelay: getEnvNumber("MIN_REQUEST_DELAY", 1000),
  maxRequestDelay: getEnvNumber("MAX_REQUEST_DELAY", 3000),
};

export default config;
