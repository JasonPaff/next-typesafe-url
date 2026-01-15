import * as path from "path";
import type ts from "typescript/lib/tsserverlibrary";
import type { PluginConfig, ResolvedConfig } from "./types";

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ResolvedConfig = {
  appDir: "src/app",
  routeTypeFileName: "routeType",
  debug: false,
};

/**
 * Resolves plugin configuration by merging user config with defaults
 */
export function resolveConfig(pluginConfig: PluginConfig | undefined): ResolvedConfig {
  return {
    appDir: pluginConfig?.appDir ?? DEFAULT_CONFIG.appDir,
    routeTypeFileName: pluginConfig?.routeTypeFileName ?? DEFAULT_CONFIG.routeTypeFileName,
    debug: pluginConfig?.debug ?? DEFAULT_CONFIG.debug,
  };
}

/**
 * Attempts to auto-detect app directory location.
 * Checks common Next.js conventions: src/app and app
 */
export function detectAppDir(
  typescript: typeof ts,
  projectPath: string
): string | null {
  const possiblePaths = ["src/app", "app"];

  for (const possiblePath of possiblePaths) {
    const fullPath = path.join(projectPath, possiblePath);
    if (typescript.sys.directoryExists(fullPath)) {
      return possiblePath;
    }
  }

  return null;
}
