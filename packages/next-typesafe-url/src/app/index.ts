// !!! huge credit to yesmeck https://github.com/yesmeck/remix-routes as well as Tanner Linsley https://tanstack.com/router/v1 for the inspiration for this

import type {
  AllRoutes,
  DynamicRoute,
  PathOptions,
  PathOptionsWithValidator,
  UseParamsResult,
} from "../types";
import {
  useParams,
  useRouter as useNextRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  buildPath,
  parseObjectFromReadonlyURLParams,
  parseObjectFromStringRecord,
} from "../utils";

// todo: this breaks react compiler right?
function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined);
  // Store current value in ref
  useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes
  // Return previous value (happens before update in useEffect above)
  return ref.current;
}

/**
 * FOR APP DIRECTORY ONLY:
 * Parses the current dynamic route params
 * and validates them against the provided zod schema from your `Route` object.
 * Be careful if using this in a component that is used in multiple routes,
 * making sure you pass the correct validator for the current route.
 * @param validator - The zod schema to validate the params against, should come from your `Route` object
 *
 * @example
 * const routeParams = useRouteParams(Route.routeParams);
 * const { data, isLoading, isError, error } = routeParams;
 */
export function useRouteParams<T extends z.ZodObject<z.ZodRawShape>>(
  validator: T,
): UseParamsResult<T> {
  const params = useParams();
  const prev = usePrevious(params);
  // to prevent infinite rerenders, we need to deep compare between renders
  const same = JSON.stringify(prev) === JSON.stringify(params);
  const [isError, setIsError] = useState(false);
  // not used if theres no error, but we need to initialize it so just use a dummy error
  const [error, setError] = useState<z.ZodError>(new z.ZodError([]));
  const [data, setData] = useState<z.output<T> | undefined>(undefined);

  useEffect(() => {
    // parse the params to a Record<string, unknown>
    const parsedRouteParams = parseObjectFromStringRecord(params);
    // validate the params against the zod schema
    const validatedRouteParams = validator.safeParse(parsedRouteParams);

    // update state based on the validation result
    if (validatedRouteParams.success) {
      setData(validatedRouteParams.data);
      setIsError(false);
    } else {
      setData(undefined);
      setIsError(true);
      setError(validatedRouteParams.error);
    }
    // only rerun if the params have changed between renders
  }, [same]);

  if (isError) {
    // if there was an error, return the error
    return {
      data: undefined,
      isError: true,
      error: error,
      isLoading: false,
    };
  } else {
    if (!data) {
      // if there was no error but the data is undefined, we're still loading
      return {
        data: undefined,
        isError: false,
        isLoading: true,
        error: undefined,
      };
    } else {
      // if there was no error and the data is defined, return the data
      return {
        data: data,
        isError: false,
        isLoading: false,
        error: undefined,
      };
    }
  }
}

/**
 * FOR APP DIRECTORY ONLY:
 * Parses the current search params
 * and validates them against the provided zod schema from your `Route` object.
 * Be careful if using this in a component that is used in multiple routes,
 * making sure you pass the correct validator for the current route.
 * @param validator - The zod schema to validate the params against, should come from your `Route` object
 *
 * @example
 * const searchParams = useSearchParams(Route.searchParams);
 * const { data, isLoading, isError, error } = searchParams;
 */
export function useSearchParams<T extends z.ZodObject<z.ZodRawShape>>(
  searchValidator: T,
): UseParamsResult<T> {
  const params = useNextSearchParams();
  const [isError, setIsError] = useState(false);
  // not used if theres no error, but we need to initialize it so just use a dummy error
  const [error, setError] = useState<z.ZodError>(new z.ZodError([]));
  const [data, setData] = useState<z.output<T> | undefined>(undefined);

  useEffect(() => {
    // parse the params to a Record<string, unknown>
    const parsedSearchParams = parseObjectFromReadonlyURLParams(params);
    // validate the params against the zod schema
    const validatedSearchParams = searchValidator.safeParse(parsedSearchParams);

    // update state based on the validation result
    if (validatedSearchParams.success) {
      setData(validatedSearchParams.data);
      setIsError(false);
    } else {
      setData(undefined);
      setIsError(true);
      setError(validatedSearchParams.error);
    }
  }, [params]);

  if (isError) {
    // if there was an error, return the error
    return {
      data: undefined,
      isError: true,
      error: error,
      isLoading: false,
    };
  } else {
    if (!data) {
      // if there was no error but the data is undefined, we're still loading
      return {
        data: undefined,
        isError: false,
        isLoading: true,
        error: undefined,
      };
    } else {
      // if there was no error and the data is defined, return the data
      return {
        data: data,
        isError: false,
        isLoading: false,
        error: undefined,
      };
    }
  }
}

// next/navigation does not export its router instance or option types,
// so they are derived from the useRouter return type instead
type AppRouterInstance = ReturnType<typeof useNextRouter>;
type NavigateOptions = NonNullable<Parameters<AppRouterInstance["push"]>[1]>;
type PrefetchOptions = NonNullable<
  Parameters<AppRouterInstance["prefetch"]>[1]
>;

// push/replace take the same options as $path instead of a string,
// including the validator overload for codec routes
interface TypedNavigate {
  <T extends AllRoutes>(
    options: PathOptions<T>,
    navigateOptions?: NavigateOptions,
  ): void;
  <T extends AllRoutes, V extends DynamicRoute>(
    options: PathOptionsWithValidator<T, V>,
    navigateOptions?: NavigateOptions,
  ): void;
}

interface TypedPrefetch {
  <T extends AllRoutes>(
    options: PathOptions<T>,
    prefetchOptions?: PrefetchOptions,
  ): void;
  <T extends AllRoutes, V extends DynamicRoute>(
    options: PathOptionsWithValidator<T, V>,
    prefetchOptions?: PrefetchOptions,
  ): void;
}

type TypedAppRouterInstance = Omit<
  AppRouterInstance,
  "push" | "replace" | "prefetch"
> & {
  push: TypedNavigate;
  replace: TypedNavigate;
  prefetch: TypedPrefetch;
};

// the loose runtime shape of the typed methods- the interfaces above are the
// public face, this is what the implementations are written against
type UntypedPathOptions = {
  route: string;
  searchParams?: Record<string, unknown>;
  routeParams?: Record<string, unknown>;
  validator?: DynamicRoute;
};

/**
 * FOR APP DIRECTORY ONLY:
 * A typesafe wrapper around `next/navigation`'s `useRouter`.
 * `push`, `replace`, and `prefetch` take the same options as `$path`
 * instead of a string- `route` autocompletes and the params are typechecked.
 * All other properties are forwarded from the underlying router unchanged.
 *
 * The same `validator` rules as `$path` apply: routes whose schemas contain
 * codecs must pass their `Route` object as `validator`.
 *
 * @example
 * const router = useTypedRouter();
 * router.push({ route: "/foo/[bar]", routeParams: { bar: "baz" } });
 */
export function useTypedRouter(): TypedAppRouterInstance {
  const router = useNextRouter();

  return useMemo(
    () => ({
      ...router,
      push: (options: UntypedPathOptions, navigateOptions?: NavigateOptions) =>
        router.push(buildPath(options), navigateOptions),
      replace: (
        options: UntypedPathOptions,
        navigateOptions?: NavigateOptions,
      ) => router.replace(buildPath(options), navigateOptions),
      prefetch: (
        options: UntypedPathOptions,
        prefetchOptions?: PrefetchOptions,
      ) => router.prefetch(buildPath(options), prefetchOptions),
    }),
    [router],
  );
}

export type { TypedAppRouterInstance, TypedNavigate, TypedPrefetch };
