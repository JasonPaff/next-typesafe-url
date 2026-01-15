import type ts from "typescript/lib/tsserverlibrary";

/**
 * Logger wrapper for TypeScript plugin logging.
 * Uses TypeScript's built-in projectService logger.
 */
export class Logger {
  private readonly prefix = "[next-typesafe-url]";
  private enabled: boolean;
  private logger: ts.server.Logger | undefined;

  constructor(info?: ts.server.PluginCreateInfo, debug = false) {
    this.enabled = debug;
    this.logger = info?.project.projectService.logger;
  }

  info(message: string): void {
    if (this.enabled && this.logger) {
      this.logger.info(`${this.prefix} ${message}`);
    }
  }

  error(message: string): void {
    // Always log errors regardless of debug mode
    if (this.logger) {
      this.logger.info(`${this.prefix} ERROR: ${message}`);
    }
  }
}
