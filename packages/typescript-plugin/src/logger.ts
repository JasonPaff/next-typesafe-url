import type ts from "typescript/lib/tsserverlibrary";

/**
 * Logger wrapper for TypeScript plugin logging.
 * Uses TypeScript's built-in projectService logger.
 */
export class Logger {
  private readonly prefix = "[next-typesafe-url-plugin]";
  private debug: boolean;
  private logger: ts.server.Logger | undefined;

  constructor(info?: ts.server.PluginCreateInfo, debug = false) {
    this.debug = debug;
    this.logger = info?.project.projectService.logger;
  }

  /** Always log - for important messages */
  log(message: string): void {
    if (this.logger) {
      this.logger.info(`${this.prefix} ${message}`);
    }
  }

  /** Only log in debug mode - for verbose messages */
  info(message: string): void {
    if (this.debug && this.logger) {
      this.logger.info(`${this.prefix} ${message}`);
    }
  }

  error(message: string): void {
    if (this.logger) {
      this.logger.info(`${this.prefix} ERROR: ${message}`);
    }
  }
}
