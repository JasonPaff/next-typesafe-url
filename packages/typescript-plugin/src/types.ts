import type ts from "typescript/lib/tsserverlibrary";

/**
 * Plugin configuration options from tsconfig.json
 */
export interface PluginConfig {
  /** Path to Next.js app directory (relative to project root) */
  appDir?: string;
  /** Name of route type definition files (without extension) */
  routeTypeFileName?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedConfig {
  appDir: string;
  routeTypeFileName: string;
  debug: boolean;
}

/**
 * Information about a detected route string
 */
export interface RouteStringInfo {
  /** The route string value (e.g., "/users/[id]") */
  route: string;
  /** Start position of the string literal in the file */
  start: number;
  /** End position of the string literal in the file */
  end: number;
  /** The full span including quotes */
  span: ts.TextSpan;
}

/**
 * Result of resolving a route to its file path
 */
export interface RouteResolution {
  /** Absolute path to the routeType.ts file */
  filePath: string;
  /** Whether the file exists */
  exists: boolean;
}
