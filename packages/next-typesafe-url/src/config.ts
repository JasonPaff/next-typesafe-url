/**
 * Configuration options for next-typesafe-url CLI
 */
export interface Config {
  /**
   * Watch for file changes in src/app and src/pages and regenerate the types file
   * @default false
   */
  watch?: boolean;

  /**
   * The path to your src directory relative to the cwd the cli is run from
   * @default "./src"
   */
  srcPath?: string;

  /**
   * The path of the generated .d.ts file relative to the cwd the cli is run from
   * @default "./_next-typesafe-url_.d.ts"
   */
  outputPath?: string;

  /**
   * A list of file extensions to consider as page files
   * Can be an array of strings or a comma-separated string
   * @default ["tsx", "ts", "jsx", "js"]
   */
  pageExtensions?: string[] | string;

  /**
   * Override the default name of the RouteType file in the app directory
   * @default "routeType"
   */
  filename?: string;

  /**
   * Routes that are not discoverable by scanning the app/pages directories,
   * e.g. static assets served from /public or paths handled by rewrites.
   * They are added to the generated types as valid inputs for `$path` only.
   *
   * A plain string registers a static route (no dynamic segments, no params).
   * To register a dynamic route, use the object form and point `routeType`
   * at a file that exports a `Route` object and `RouteType` type, exactly
   * like a normal routeType.ts file.
   * Every route must start with "/"
   * @default []
   */
  externalRoutes?: ExternalRouteEntry[];
}

/**
 * A single externalRoutes entry: either a static route string, or a
 * dynamic route paired with the path to its routeType file (relative
 * to the directory the CLI is run from)
 */
export type ExternalRouteEntry =
  | string
  | {
      route: string;
      routeType: string;
    };

/**
 * Resolved configuration with all options explicitly set
 */
export interface ResolvedConfig {
  watch: boolean;
  srcPath: string;
  outputPath: string;
  pageExtensions: string[];
  filename: string;
  externalRoutes: ExternalRouteEntry[];
}

/**
 * Default configuration values
 */
export const defaultConfig: ResolvedConfig = {
  watch: false,
  srcPath: "./src",
  outputPath: "./_next-typesafe-url_.d.ts",
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  filename: "routeType",
  externalRoutes: [],
};

/**
 * Identity helper that provides type checking and autocompletion
 * for next-typesafe-url config files
 *
 * @example
 * // next-typesafe-url.config.ts
 * import { defineConfig } from "next-typesafe-url";
 *
 * export default defineConfig({
 *   outputPath: "./types/routes.d.ts",
 *   externalRoutes: ["/admin/index.html"],
 * });
 */
export function defineConfig(config: Config): Config {
  return config;
}

// a segment is either bracket-free or one of the well formed dynamic shapes:
// [name], [...name], [[...name]]
const VALID_DYNAMIC_SEGMENT =
  /^(\[[A-Za-z_$][\w$]*\]|\[\.\.\.[A-Za-z_$][\w$]*\]|\[\[\.\.\.[A-Za-z_$][\w$]*\]\])$/;

function hasMalformedSegments(route: string): boolean {
  return route
    .split("/")
    .some(
      (segment) =>
        (segment.includes("[") || segment.includes("]")) &&
        !VALID_DYNAMIC_SEGMENT.test(segment),
    );
}

function hasDynamicSegments(route: string): boolean {
  return route
    .split("/")
    .some((segment) => VALID_DYNAMIC_SEGMENT.test(segment));
}

/**
 * Returns a list of error messages for invalid `externalRoutes` entries.
 *
 * String entries register static routes: they must start with "/" and
 * cannot contain dynamic segments- dynamic routes need a routeType
 * validator, so they must use the object form.
 * Object entries must have a route starting with "/" with well formed
 * dynamic segments, and a non-empty routeType path.
 */
export function getExternalRouteErrors(
  externalRoutes: ExternalRouteEntry[],
): string[] {
  const errors: string[] = [];

  for (const entry of externalRoutes) {
    if (typeof entry === "string") {
      if (!entry.startsWith("/")) {
        errors.push(`"${entry}" must start with "/"`);
      } else if (entry.includes("[") || entry.includes("]")) {
        errors.push(
          `"${entry}" contains dynamic segments- register dynamic external routes with the object form: { route: "${entry}", routeType: "./path/to/routeType.ts" }`,
        );
      }
    } else if (
      typeof entry === "object" &&
      entry !== null &&
      typeof entry.route === "string" &&
      typeof entry.routeType === "string"
    ) {
      if (!entry.route.startsWith("/")) {
        errors.push(`"${entry.route}" must start with "/"`);
      } else if (hasMalformedSegments(entry.route)) {
        errors.push(
          `"${entry.route}" has malformed dynamic segments- use [name], [...name], or [[...name]]`,
        );
      } else if (!hasDynamicSegments(entry.route)) {
        errors.push(
          `"${entry.route}" has no dynamic segments- register static external routes as plain strings`,
        );
      }
      if (entry.routeType.trim() === "") {
        errors.push(`"${entry.route}" has an empty routeType path`);
      }
    } else {
      errors.push(
        `${JSON.stringify(entry)} is not a valid externalRoutes entry`,
      );
    }
  }

  return errors;
}
