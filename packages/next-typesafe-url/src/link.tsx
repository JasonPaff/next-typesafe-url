import type { ComponentProps, JSX } from "react";
import Link from "next/link";
import { buildPath } from "./utils";
import type {
  AllRoutes,
  PathOptions,
  PathOptionsWithValidator,
  DynamicRoute,
} from "./types";

// every prop Link accepts except href, which TypedLink computes itself
type LinkPropsWithoutHref = Omit<ComponentProps<typeof Link>, "href">;

// the same options $path takes, spread flat into the component props
// alongside the rest of the Link props
type TypedLinkProps<T extends AllRoutes> = PathOptions<T> &
  LinkPropsWithoutHref;

type TypedLinkPropsWithValidator<
  T extends AllRoutes,
  V extends DynamicRoute,
> = PathOptionsWithValidator<T, V> & LinkPropsWithoutHref;

/**
 * A typesafe wrapper around `next/link`. Takes the same options as `$path`
 * spread flat as props- `route` autocompletes to your registered routes and
 * `routeParams`/`searchParams` are typechecked against that route's `Route`
 * object. All other props are forwarded to `Link` unchanged.
 *
 * Renders a plain `Link`, so it works in both server and client components,
 * and in both the app and pages routers.
 *
 * The same `validator` rules as `$path` apply: routes whose schemas contain
 * codecs must pass their `Route` object as `validator`.
 *
 * @throws If a dynamic segment or catch-all segment in the route does not have a corresponding value in routeParams.
 * @throws If any of the passed values are not a non-empty string, number, boolean, array, object, or null.
 * @throws If a validator is passed and the params fail to encode.
 *
 * @example <TypedLink route="/foo/[bar]" routeParams={{ bar: "baz" }}>go</TypedLink>
 * @example <TypedLink route="/foo" searchParams={{ bar: "baz" }} prefetch={false}>go</TypedLink>
 */
export function TypedLink<T extends AllRoutes>(
  props: TypedLinkProps<T>,
): JSX.Element;
export function TypedLink<T extends AllRoutes, V extends DynamicRoute>(
  props: TypedLinkPropsWithValidator<T, V>,
): JSX.Element;
export function TypedLink({
  route,
  searchParams,
  routeParams,
  validator,
  ...linkProps
}: {
  route: string;
  searchParams?: Record<string, unknown>;
  routeParams?: Record<string, unknown>;
  validator?: DynamicRoute;
} & LinkPropsWithoutHref): JSX.Element {
  const href = buildPath({ route, searchParams, routeParams, validator });

  return <Link href={href} {...linkProps} />;
}

export type { TypedLinkProps, TypedLinkPropsWithValidator };
