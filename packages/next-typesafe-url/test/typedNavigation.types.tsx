// Type-level tests for TypedLink and useTypedRouter. This file contains no
// runtime tests- it is enforced by `pnpm typecheck`: tsc reports unused
// expect-error directives as errors if an expected compile error stops
// occurring.
import { z } from "zod";
import { TypedLink } from "../src";
import { useTypedRouter as useAppTypedRouter } from "../src/app";
import { useTypedRouter as usePagesTypedRouter } from "../src/pages";
import type { DynamicRoute, InferRoute, StaticRoute } from "../src/types";

/* eslint-disable @typescript-eslint/no-unused-vars */

// ---------------------------------------------------------------------------
// route registry
// ---------------------------------------------------------------------------

const isoDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (value) => value.toISOString(),
});

export const NavProductRoute = {
  routeParams: z.object({ id: z.number() }),
  searchParams: z.object({ tab: z.string().optional() }),
} satisfies DynamicRoute;

export const NavCodecRoute = {
  searchParams: z.object({ from: isoDate.optional() }),
} satisfies DynamicRoute;

declare module "@@@next-typesafe-url" {
  interface DynamicRouter {
    "/__nav-test/product/[id]": InferRoute<typeof NavProductRoute>;
    "/__nav-test/codec": InferRoute<typeof NavCodecRoute>;
  }

  interface StaticRouter {
    "/__nav-test/static": StaticRoute;
  }
}

// ---------------------------------------------------------------------------
// TypedLink
// ---------------------------------------------------------------------------

// OK: static route needs nothing but the route
<TypedLink route="/__nav-test/static">go</TypedLink>;

// OK: dynamic route with required routeParams and optional searchParams
<TypedLink route="/__nav-test/product/[id]" routeParams={{ id: 1 }}>
  go
</TypedLink>;
<TypedLink
  route="/__nav-test/product/[id]"
  routeParams={{ id: 1 }}
  searchParams={{ tab: "reviews" }}
>
  go
</TypedLink>;

// OK: all other Link props are forwarded
<TypedLink
  route="/__nav-test/static"
  prefetch={false}
  replace
  scroll={false}
  className="link"
  onClick={(e) => e.preventDefault()}
>
  go
</TypedLink>;

// ERROR: unknown routes are rejected
// @ts-expect-error "/nope" is not a registered route
<TypedLink route="/nope">go</TypedLink>;

// ERROR: dynamic route without its required routeParams
// @ts-expect-error routeParams is required for this route
<TypedLink route="/__nav-test/product/[id]">go</TypedLink>;

// ERROR: wrong param type
// @ts-expect-error id must be a number
<TypedLink route="/__nav-test/product/[id]" routeParams={{ id: "1" }}>
  go
</TypedLink>;

// ERROR: static routes take no params
// @ts-expect-error static routes have no routeParams
<TypedLink route="/__nav-test/static" routeParams={{ id: 1 }}>
  go
</TypedLink>;

// ERROR: href is computed internally and must not be passed
// @ts-expect-error href is not a TypedLink prop
<TypedLink route="/__nav-test/static" href="/somewhere">
  go
</TypedLink>;

// OK: codec route with its validator- params are the codec OUTPUT types
<TypedLink
  route="/__nav-test/codec"
  searchParams={{ from: new Date() }}
  validator={NavCodecRoute}
>
  go
</TypedLink>;

// ERROR: codec route without validator
// @ts-expect-error validator is required for routes whose schemas contain codecs
<TypedLink route="/__nav-test/codec" searchParams={{ from: new Date() }}>
  go
</TypedLink>;

// ---------------------------------------------------------------------------
// useTypedRouter (app)
// ---------------------------------------------------------------------------

const appRouter = useAppTypedRouter();

// OK: same options as $path, plus the underlying navigate options
appRouter.push({ route: "/__nav-test/static" });
appRouter.push(
  { route: "/__nav-test/product/[id]", routeParams: { id: 1 } },
  { scroll: false },
);
appRouter.replace({
  route: "/__nav-test/product/[id]",
  routeParams: { id: 1 },
  searchParams: { tab: "reviews" },
});
appRouter.prefetch({ route: "/__nav-test/static" });

// OK: codec route with its validator
appRouter.push({
  route: "/__nav-test/codec",
  searchParams: { from: new Date() },
  validator: NavCodecRoute,
});

// OK: non-navigation members are forwarded untouched
appRouter.back();
appRouter.refresh();

// ERROR: unknown routes are rejected
// @ts-expect-error "/nope" is not a registered route
appRouter.push({ route: "/nope" });

// ERROR: dynamic route without its required routeParams
// @ts-expect-error routeParams is required for this route
appRouter.push({ route: "/__nav-test/product/[id]" });

// ERROR: codec route without validator
// @ts-expect-error validator is required for routes whose schemas contain codecs
appRouter.push({ route: "/__nav-test/codec", searchParams: { from: new Date() } });

// ERROR: plain strings are not accepted- that is what useRouter is for
// @ts-expect-error push takes path options, not a string
appRouter.push("/__nav-test/static");

// ---------------------------------------------------------------------------
// useTypedRouter (pages)
// ---------------------------------------------------------------------------

const pagesRouter = usePagesTypedRouter();

// OK: same options as $path, plus the underlying transition options
// pages router navigation resolves to a boolean
const pushResult: Promise<boolean> = pagesRouter.push({
  route: "/__nav-test/product/[id]",
  routeParams: { id: 1 },
});
void pagesRouter.replace({ route: "/__nav-test/static" }, { shallow: true });
const prefetchResult: Promise<void> = pagesRouter.prefetch({
  route: "/__nav-test/static",
});

// OK: non-navigation members are forwarded untouched
void pagesRouter.back();
const currentQuery = pagesRouter.query;

// ERROR: unknown routes are rejected
// @ts-expect-error "/nope" is not a registered route
void pagesRouter.push({ route: "/nope" });

// ERROR: dynamic route without its required routeParams
// @ts-expect-error routeParams is required for this route
void pagesRouter.push({ route: "/__nav-test/product/[id]" });

// ERROR: codec route without validator
// @ts-expect-error validator is required for routes whose schemas contain codecs
void pagesRouter.push({ route: "/__nav-test/codec", searchParams: { from: new Date() } });
