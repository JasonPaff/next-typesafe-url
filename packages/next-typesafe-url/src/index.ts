// !!! huge credit to yesmeck https://github.com/yesmeck/remix-routes as well as Tanner Linsley https://tanstack.com/router/v1 for the inspiration for this
import { buildPath } from "./utils";
import type {
  AllRoutes,
  PathOptions,
  PathOptionsWithValidator,
  RouterInputs,
  RouterOutputs,
  InferRoute,
  DynamicRoute,
  InferPagePropsType,
  InferLayoutPropsType,
  DynamicLayout,
  StaticRoute,
  UseParamsResult,
  ServerParseParamsResult,
} from "./types";
import type { Config } from "./config";

export type {
  AllRoutes,
  PathOptions,
  PathOptionsWithValidator,
  RouterInputs,
  RouterOutputs,
  InferRoute,
  DynamicRoute,
  InferPagePropsType,
  InferLayoutPropsType,
  DynamicLayout,
  StaticRoute,
  UseParamsResult,
  ServerParseParamsResult,
  Config,
};

// * TESTED
/**
 * Serializes and encodes the passed search and route param objects and merges them with the route string.
 *
 * If your `Route` object is passed as `validator`, the params are typed as the
 * validator's OUTPUT types and are run through the encode direction of the
 * schema first. This lets zod codecs define custom serialization per field
 * (e.g. `Date` objects, custom id formats, comma separated arrays).
 *
 * If a route's schemas contain a codec, `validator` is REQUIRED and omitting
 * it is a compile error. Without the runtime schema the codec's encode step
 * can't run, and the params would silently fall back to plain JSON
 * serialization and produce a URL the decode side can't parse.
 *
 * @throws If a dynamic segment or catch-all segment in the route does not have a corresponding value in routeParams.
 * @throws If any of the passed values are not a non-empty string, number, boolean, array, object, or null.
 * @throws If a validator is passed and the params fail to encode.
 *
 * @example $path({ route: "/foo/[bar]", routeParams: { bar: "baz" } }) -> "/foo/baz"
 * @example $path({ route: "/foo", searchParams: { bar: "baz" } }) -> "/foo?bar=baz"
 * @example $path({ route: "/foo/[bar]", routeParams: { bar: "baz" }, searchParams: { lux: "flux" } }) -> "/foo/baz?lux=flux"
 * @example $path({ route: "/post", searchParams: { date: new Date() }, validator: Route }) -> "/post?date=2024-01-01T00%3A00%3A00.000Z"
 */
export function $path<T extends AllRoutes>(options: PathOptions<T>): string;
export function $path<T extends AllRoutes, V extends DynamicRoute>(
  options: PathOptionsWithValidator<T, V>,
): string;
export function $path(options: {
  route: string;
  searchParams?: Record<string, unknown>;
  routeParams?: Record<string, unknown>;
  validator?: DynamicRoute;
}): string {
  return buildPath(options);
}

export { TypedLink } from "./link";
export type {
  TypedLinkProps,
  TypedLinkPropsWithValidator,
} from "./link";
