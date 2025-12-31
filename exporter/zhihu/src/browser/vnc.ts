import { spawn, ChildProcess } from "child_process";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

export class VNCService {
  private xvfbProcess: ChildProcess | null = null;
  private vncProcess: ChildProcess | null = null;
  private websockifyProcess: ChildProcess | null = null;

  async start(): Promise<void> {
    try {
      logger.info("Starting VNC service...");

      await this.startXvfb();
      await this.waitForXvfb();
      await this.startVNC();
      await this.startWebsockify();

      logger.info(
        `VNC service started. Connect to: localhost:${config.vncPort}`,
      );
      logger.info(
        `NoVNC web interface: http://localhost:${config.novncPort}/vnc.html?host=localhost&port=${config.novncPort}`,
      );
    } catch (error) {
      logger.error("Failed to start VNC service:", error);
      await this.stop();
      throw error;
    }
  }

  private startXvfb(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug(`Starting Xvfb on display ${config.display}...`);

      this.xvfbProcess = spawn("Xvfb", [
        config.display,
        "-screen",
        "0",
        `${config.browserWidth}x${config.browserHeight}x24`,
        "-nolisten",
        "tcp",
      ]);

      let resolved = false;

      this.xvfbProcess.on("error", (error) => {
        logger.error("Xvfb spawn error:", error);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      this.xvfbProcess.on("exit", (code, signal) => {
        logger.error(`Xvfb exited with code ${code}, signal ${signal}`);
        if (!resolved) {
          resolved = true;
          reject(new Error(`Xvfb exited prematurely with code ${code}`));
        }
      });

      this.xvfbProcess.stdout?.on("data", (data) => {
        logger.debug(`Xvfb stdout: ${data}`);
      });

      this.xvfbProcess.stderr?.on("data", (data) => {
        logger.debug(`Xvfb stderr: ${data}`);
      });

      // Give Xvfb time to start
      setTimeout(() => {
        if (!resolved) {
          logger.debug("Xvfb started successfully");
          resolved = true;
          resolve();
        }
      }, 2000);
    });
  }

  private async waitForXvfb(): Promise<void> {
    // Wait for X server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private startVNC(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug(`Starting x11vnc on port ${config.vncPort}...`);

      this.vncProcess = spawn("x11vnc", [
        "-display",
        config.display,
        "-forever",
        "-nopw",
        "-quiet",
        "-rfbport",
        config.vncPort.toString(),
        "-shared",
      ]);

      let resolved = false;

      this.vncProcess.on("error", (error) => {
        logger.error("VNC spawn error:", error);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      this.vncProcess.on("exit", (code, signal) => {
        logger.error(`x11vnc exited with code ${code}, signal ${signal}`);
        if (!resolved) {
          resolved = true;
          reject(new Error(`x11vnc exited prematurely with code ${code}`));
        }
      });

      this.vncProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        logger.debug(`VNC stdout: ${output}`);

        // VNC server outputs "PORT=" when ready
        if (output.includes("PORT=") && !resolved) {
          logger.debug("VNC server is ready");
          resolved = true;
          resolve();
        }
      });

      this.vncProcess.stderr?.on("data", (data) => {
        const errorMsg = data.toString();
        logger.debug(`VNC stderr: ${errorMsg}`);

        // Check for common error messages
        if (errorMsg.includes("error") || errorMsg.includes("failed")) {
          logger.error(`VNC error: ${errorMsg}`);
        }
      });

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          logger.debug("VNC server started (timeout fallback)");
          resolved = true;
          resolve();
        }
      }, 3000);
    });
  }

  private startWebsockify(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug(
        `Starting websockify on port ${config.novncPort} -> localhost:${config.vncPort}...`,
      );

      this.websockifyProcess = spawn("npx", [
        "websockify",
        "--web=./node_modules/@novnc/novnc",
        `${config.novncPort}`,
        `localhost:${config.vncPort}`,
      ]);

      let resolved = false;

      this.websockifyProcess.on("error", (error) => {
        logger.error("Websockify spawn error:", error);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      this.websockifyProcess.on("exit", (code, signal) => {
        logger.error(`Websockify exited with code ${code}, signal ${signal}`);
        if (!resolved) {
          resolved = true;
          reject(new Error(`Websockify exited prematurely with code ${code}`));
        }
      });

      this.websockifyProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        logger.debug(`Websockify stdout: ${output}`);

        if (output.includes("Listen") && !resolved) {
          logger.debug("Websockify server is ready");
          resolved = true;
          resolve();
        }
      });

      this.websockifyProcess.stderr?.on("data", (data) => {
        logger.debug(`Websockify stderr: ${data}`);
      });

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          logger.debug("Websockify started (timeout fallback)");
          resolved = true;
          resolve();
        }
      }, 3000);
    });
  }

  async stop(): Promise<void> {
    logger.info("Stopping VNC service...");

    if (this.websockifyProcess) {
      this.websockifyProcess.kill();
      this.websockifyProcess = null;
      logger.debug("Websockify process killed");
    }

    if (this.vncProcess) {
      this.vncProcess.kill();
      this.vncProcess = null;
      logger.debug("VNC process killed");
    }

    if (this.xvfbProcess) {
      this.xvfbProcess.kill();
      this.xvfbProcess = null;
      logger.debug("Xvfb process killed");
    }

    logger.info("VNC service stopped");
  }

  isRunning(): boolean {
    return (
      this.xvfbProcess !== null &&
      !this.xvfbProcess.killed &&
      this.vncProcess !== null &&
      !this.vncProcess.killed &&
      this.websockifyProcess !== null &&
      !this.websockifyProcess.killed
    );
  }

  getConnectionInfo(): {
    host: string;
    port: number;
    display: string;
    novncUrl: string;
  } {
    return {
      host: "localhost",
      port: config.vncPort,
      display: config.display,
      novncUrl: `http://localhost:${config.novncPort}/vnc.html?host=localhost&port=${config.novncPort}`,
    };
  }
}

export const vncService = new VNCService();
