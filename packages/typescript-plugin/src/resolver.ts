import * as path from "path";
import type ts from "typescript/lib/tsserverlibrary";
import type { ResolvedConfig, RouteResolution } from "./types";

/**
 * Resolves a route string to its corresponding routeType.ts file path.
 *
 * Resolution strategy:
 * 1. Parse route into segments
 * 2. Build direct path in app directory
 * 3. Check both .ts and .tsx extensions
 */
export function resolveRouteToFile(
  typescript: typeof ts,
  route: string,
  projectPath: string,
  config: ResolvedConfig
): RouteResolution | null {
  const segments = parseRouteSegments(route);
  const possiblePaths = buildPossiblePaths(typescript, segments, projectPath, config);

  // Check which path exists
  for (const filePath of possiblePaths) {
    if (typescript.sys.fileExists(filePath)) {
      return {
        filePath,
        exists: true,
      };
    }
  }

  // Return first possible path even if doesn't exist (for error reporting)
  if (possiblePaths.length > 0) {
    return {
      filePath: possiblePaths[0]!,
      exists: false,
    };
  }

  return null;
}

/**
 * Parses a route string into path segments.
 *
 * Examples:
 * - "/" -> []
 * - "/users" -> ["users"]
 * - "/users/[id]" -> ["users", "[id]"]
 * - "/foo/[id]/nest" -> ["foo", "[id]", "nest"]
 */
function parseRouteSegments(route: string): string[] {
  if (route === "/") {
    return [];
  }

  // Remove leading slash and split
  return route.slice(1).split("/").filter(Boolean);
}

/**
 * Builds possible file paths for a route.
 *
 * Handles:
 * - Dynamic segments: [param], [...param], [[...param]]
 * - Underscore escaping: %5F -> _
 */
function buildPossiblePaths(
  typescript: typeof ts,
  segments: string[],
  projectPath: string,
  config: ResolvedConfig
): string[] {
  const appDirPath = path.join(projectPath, config.appDir);
  const paths: string[] = [];

  // Handle underscore escaping (%5F -> _)
  const escapedSegments = segments.map((seg) => seg.replace(/%5F/g, "_"));

  // Build directory path from segments
  const routeDir =
    escapedSegments.length > 0
      ? path.join(appDirPath, ...escapedSegments)
      : appDirPath;

  // Add both .ts and .tsx variants
  paths.push(path.join(routeDir, `${config.routeTypeFileName}.ts`));
  paths.push(path.join(routeDir, `${config.routeTypeFileName}.tsx`));

  return paths;
}

/**
 * Scans for routeType.ts files considering route groups.
 *
 * Route groups (directories like "(group-name)") don't appear in the URL
 * but affect file system structure. This function recursively searches
 * through route group directories to find the matching routeType file.
 *
 * Example: "/foo/[id]" might exist at:
 * - src/app/foo/[id]/routeType.ts (direct)
 * - src/app/(group)/foo/[id]/routeType.ts (with route group)
 * - src/app/(a)/(b)/foo/[id]/routeType.ts (nested groups)
 */
export function findRouteTypeWithGroups(
  typescript: typeof ts,
  route: string,
  projectPath: string,
  config: ResolvedConfig
): string | null {
  const appDirPath = path.join(projectPath, config.appDir);
  const segments = parseRouteSegments(route);

  // Handle underscore escaping
  const escapedSegments = segments.map((seg) => seg.replace(/%5F/g, "_"));

  return searchDir(typescript, appDirPath, escapedSegments, config);
}

/**
 * Recursively searches directories for the routeType file.
 */
function searchDir(
  typescript: typeof ts,
  currentDir: string,
  remainingSegments: string[],
  config: ResolvedConfig
): string | null {
  // Base case: no more segments, check for routeType file here
  if (remainingSegments.length === 0) {
    for (const ext of ["ts", "tsx"]) {
      const filePath = path.join(currentDir, `${config.routeTypeFileName}.${ext}`);
      if (typescript.sys.fileExists(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  const [nextSegment, ...rest] = remainingSegments;
  if (!nextSegment) {
    return null;
  }

  // Try direct path first
  const directPath = path.join(currentDir, nextSegment);
  if (typescript.sys.directoryExists(directPath)) {
    const result = searchDir(typescript, directPath, rest, config);
    if (result) return result;
  }

  // Try route groups - directories matching pattern (group-name)
  try {
    const entries = typescript.sys.readDirectory(currentDir, undefined, undefined, ["*/"]);

    for (const entry of entries) {
      // Extract directory name from path
      const parts = entry.split(/[/\\]/);
      const dirName = parts[parts.length - 1] || parts[parts.length - 2];
      if (!dirName) continue;

      // Check if it's a route group (parentheses pattern)
      if (/^\([^)]+\)$/.test(dirName)) {
        const groupPath = path.join(currentDir, dirName);
        // Search within the group with the SAME remaining segments
        // (route groups don't consume URL segments)
        const result = searchDir(typescript, groupPath, remainingSegments, config);
        if (result) return result;
      }
    }
  } catch {
    // Directory read failed, continue without route group search
  }

  return null;
}
