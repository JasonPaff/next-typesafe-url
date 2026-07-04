// !!! huge credit to yesmeck https://github.com/yesmeck/remix-routes as well as Tanner Linsley https://tanstack.com/router/v1 for the inspiration for this

import { useRouter } from "next/router";
import type { NextRouter } from "next/router";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import {
  buildPath,
  parseObjectFromParamString,
  parseObjectFromStringRecord,
} from "./utils";
import type {
  AllRoutes,
  DynamicRoute,
  PathOptions,
  PathOptionsWithValidator,
  UseParamsResult,
} from "./types";
export { parseServerSideParams } from "./utils";

/**
 * FOR PAGES DIRECTORY ONLY:
 * Parses the current dynamic route params and validates them against the provided zod schema.
 * Should only be used in the top level route component where your Route object is defined.
 * @param validator - The zod schema to validate the params against, should come from your Route object
 *
 * @example
 * const routeParams = useRouteParams(Route.routeParams);
 * const { data, isLoading, isError, error } = routeParams;
 */
export function useRouteParams<T extends z.ZodObject<z.ZodRawShape>>(
  validator: T,
): UseParamsResult<T> {
  const router = useRouter();
  const [isError, setIsError] = useState(false);
  // not used if theres no error, but we need to initialize it so just use a dummy error
  const [error, setError] = useState<z.ZodError>(new z.ZodError([]));
  const [data, setData] = useState<z.output<T> | undefined>(undefined);

  useEffect(() => {
    // next router is not ready while loading, during which query is undefined
    // if so we do nothing
    if (router.isReady) {
      // parse the params to a Record<string, unknown>
      const dynamicParams = parseObjectFromStringRecord(router.query);
      // validate the params against the zod schema
      const validatedDynamicRouteParams = validator.safeParse(dynamicParams);
      // update state based on the validation result
      if (validatedDynamicRouteParams.success) {
        setIsError(false);
        setData(validatedDynamicRouteParams.data);
      } else {
        setIsError(true);
        setError(validatedDynamicRouteParams.error);
      }
    }
    // rerun whenever the router or validator changes
  }, [router, validator]);

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
 * FOR PAGES DIRECTORY ONLY:
 * Parses the current search params and validates them against the provided zod schema.
 * Should only be used in the top level route component where your Route object is defined.
 * @param validator - The zod schema to validate the params against, should come from your Route object
 *
 * @example
 * const searchParams = useSearchParams(Route.searchParams);
 * const { data, isLoading, isError, error } = searchParams;
 */
export function useSearchParams<T extends z.ZodObject<z.ZodRawShape>>(
  searchValidator: T,
): UseParamsResult<T> {
  const router = useRouter();
  const [isError, setIsError] = useState(false);
  // not used if theres no error, but we need to initialize it so just use a dummy error
  const [error, setError] = useState<z.ZodError>(new z.ZodError([]));
  const [data, setData] = useState<z.output<T> | undefined>(undefined);

  useEffect(() => {
    // next router is not ready while loading, during which query is undefined
    // if so we do nothing
    if (router.isReady) {
      // get the search param query string from the router path
      const queryString = router.asPath.split("?")[1] ?? "";
      // parse the query string to a Record<string, unknown>
      const parsedSearchParams = parseObjectFromParamString(queryString);
      // validate the params against the zod schema
      const validatedSearchParams =
        searchValidator.safeParse(parsedSearchParams);

      // update state based on the validation result
      if (validatedSearchParams.success) {
        setData(validatedSearchParams.data);
      } else {
        setIsError(true);
        setError(validatedSearchParams.error);
      }
    }
    // rerun whenever the router or validator changes
  }, [router, searchValidator]);

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

// next/router does not export its option types, so they are derived
// from the NextRouter method signatures instead
type TransitionOptions = NonNullable<Parameters<NextRouter["push"]>[2]>;
type RouterPrefetchOptions = NonNullable<
  Parameters<NextRouter["prefetch"]>[2]
>;

// push/replace take the same options as $path instead of a url,
// including the validator overload for codec routes
// the `as` masking param is intentionally dropped- use the raw router if you need it
interface TypedNavigate {
  <T extends AllRoutes>(
    options: PathOptions<T>,
    transitionOptions?: TransitionOptions,
  ): Promise<boolean>;
  <T extends AllRoutes, V extends DynamicRoute>(
    options: PathOptionsWithValidator<T, V>,
    transitionOptions?: TransitionOptions,
  ): Promise<boolean>;
}

interface TypedPrefetch {
  <T extends AllRoutes>(
    options: PathOptions<T>,
    prefetchOptions?: RouterPrefetchOptions,
  ): Promise<void>;
  <T extends AllRoutes, V extends DynamicRoute>(
    options: PathOptionsWithValidator<T, V>,
    prefetchOptions?: RouterPrefetchOptions,
  ): Promise<void>;
}

type TypedNextRouter = Omit<NextRouter, "push" | "replace" | "prefetch"> & {
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
 * FOR PAGES DIRECTORY ONLY:
 * A typesafe wrapper around `next/router`'s `useRouter`.
 * `push`, `replace`, and `prefetch` take the same options as `$path`
 * instead of a url- `route` autocompletes and the params are typechecked.
 * All other properties are forwarded from the underlying router unchanged.
 *
 * The same `validator` rules as `$path` apply: routes whose schemas contain
 * codecs must pass their `Route` object as `validator`.
 *
 * @example
 * const router = useTypedRouter();
 * void router.push({ route: "/foo/[bar]", routeParams: { bar: "baz" } });
 */
export function useTypedRouter(): TypedNextRouter {
  const router = useRouter();

  return useMemo(
    () => ({
      ...router,
      push: (
        options: UntypedPathOptions,
        transitionOptions?: TransitionOptions,
      ) => router.push(buildPath(options), undefined, transitionOptions),
      replace: (
        options: UntypedPathOptions,
        transitionOptions?: TransitionOptions,
      ) => router.replace(buildPath(options), undefined, transitionOptions),
      prefetch: (
        options: UntypedPathOptions,
        prefetchOptions?: RouterPrefetchOptions,
      ) => router.prefetch(buildPath(options), undefined, prefetchOptions),
    }),
    [router],
  );
}

export type { TypedNextRouter, TypedNavigate, TypedPrefetch };
