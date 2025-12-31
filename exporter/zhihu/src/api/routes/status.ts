import { FastifyInstance } from 'fastify';
import path from 'path';
import { browserManager } from '../../browser/manager.js';
import { vncService } from '../../browser/vnc.js';
import { sessionManager } from '../../browser/session.js';
import { feedStore } from '../../storage/feed-store.js';
import { ApiResponse } from '../../types/api.js';
import { config } from '../../config/index.js';

export async function statusRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check
  fastify.get('/status', async (request, reply) => {
    const hasValidSession = await sessionManager.hasValidSession();
    const feedCount = await feedStore.count();

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'ok',
        browser: browserManager.isInitialized(),
        vnc: vncService.isRunning(),
        session: hasValidSession,
        feedCount,
        uptime: process.uptime(),
        version: '1.0.0',
      },
      timestamp: Date.now(),
    };

    reply.send(response);
  });

  // VNC connection info
  fastify.get('/vnc', async (request, reply) => {
    const connectionInfo = vncService.getConnectionInfo();

    const response: ApiResponse = {
      success: true,
      data: connectionInfo,
      timestamp: Date.now(),
    };

    reply.send(response);
  });

  // Debug screenshot
  fastify.get('/debug/screenshot', async (request, reply) => {
    const screenshotPath = path.join(
      config.logDir,
      `screenshot-${Date.now()}.png`
    );

    await browserManager.screenshot(screenshotPath);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Screenshot captured',
        path: screenshotPath,
      },
      timestamp: Date.now(),
    };

    reply.send(response);
  });
}
