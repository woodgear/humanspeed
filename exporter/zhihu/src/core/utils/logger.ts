import winston from 'winston';
import path from 'path';
import { config } from '../config/index.js';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${msg}\n${stack}` : msg;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(config.logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(config.logDir, 'combined.log'),
    }),
  ],
});

export default logger;
