---
title: "Routing"
description: "how to use next-typesafe-url's $path function to generate links"
nextPage:
  text: "Next: Search/Route Params- App"
  link: "en/usage/search-route-params-app"
---

## $path

The `$path` function is the core function of `next-typesafe-url`. It takes one argument, an object containing the route path, and any route or search params.

`$path` combines these inputs and returns string that represents the path for you to pass to the `href` prop of a `Link` component, or to `router.push`.

```tsx
import { $path } from "next-typesafe-url";

<Link
  href={$path({
    route: "/product/[productID]",
    routeParams: { productID: 23 },
    searchParams: { userInfo: { name: "bob", age: 23 } },
  })}
/>;

// this generates the following string:
// "/product/23?userInfo=%7B%22name%22%3A%22bob%22%2C%22age%22%3A23%7D"
```

`$path` is connected to the generated types files, so it will have full typesafety and autocomplete for all of your routes, route params, and search params.

**If the route is not a valid route, or any of the route params or search params are missing or of the wrong type, `$path` will show a type error.**

### CAN THROW

`$path` can throw at runtime if:

- If a dynamic segment or catch-all segment in the route does not have a corresponding value in routeParams.
- If any of the passed values are not a non-empty string (except for search params), number, boolean, array, object, or null.

_Neither should never happen if you are not ignoring the many typescript errors that would be thrown at you._

## Custom serialization with codecs

By default `$path` serializes values with `JSON.stringify`. If you want a param to be a richer type- a `Date`, a custom id format, a comma separated array- define the field with a [zod codec](https://zod.dev/codecs), which describes both directions of the transform:

```ts
// routeType.ts
import { z } from "zod";
import { type DynamicRoute } from "next-typesafe-url";

const isoDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (value) => value.toISOString(),
});

export const Route = {
  searchParams: z.object({
    from: isoDate,
  }),
} satisfies DynamicRoute;
export type RouteType = typeof Route;
```

The decode direction already runs everywhere your params are validated (the hooks, the HOCs, `parseServerSideParams`), so `from` comes out of validation as a real `Date`.

To run the encode direction when building links, pass your `Route` object to `$path` as `validator`:

```tsx
import { Route } from "./routeType";

$path({
  route: "/report",
  searchParams: { from: new Date() }, // typed as Date, not string!
  validator: Route,
});
// -> "/report?from=2026-07-03T00%3A00%3A00.000Z"
```

When `validator` is passed, the params are typed as the validator's **output** types instead of its input types.

If a route's schemas contain a codec, passing `validator` is **required**- omitting it is a compile error:

```tsx
$path({
  route: "/report",
  searchParams: { from: new Date() },
});
// Error: Property 'validator' is missing in type ... but required in type ...
```

This is enforced at the type level because without the runtime schema, `$path` can't run the codec's encode step- the params would silently fall back to plain JSON serialization and produce a URL the decode side can't parse. Routes without codecs are unaffected and never need a `validator`.

Codecs are not limited to simple scalar conversions- the two sides of a codec can have completely different shapes. Here a structured object round-trips through a compact, human readable `lat,lng` string instead of a JSON blob:

```ts
// routeType.ts
const latLng = z.codec(
  z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/),
  z.object({ lat: z.number(), lng: z.number() }),
  {
    decode: (value) => {
      const [lat, lng] = value.split(",").map(Number);
      return { lat: lat ?? 0, lng: lng ?? 0 };
    },
    encode: (value) => `${value.lat},${value.lng}`,
  },
);

export const Route = {
  searchParams: z.object({
    center: latLng,
  }),
} satisfies DynamicRoute;
```

```tsx
$path({
  route: "/map",
  searchParams: { center: { lat: 40.7128, lng: -74.006 } },
  validator: Route,
});
// -> "/map?center=40.7128%2C-74.006"

// without the codec, the default JSON serialization would produce:
// "/map?center=%7B%22lat%22%3A40.7128%2C%22lng%22%3A-74.006%7D"
```

Both directions are validated: the string side must match the regex before `decode` runs, and the object side is checked against the output schema- a malformed `?center=` in the URL fails validation like any other bad param, it never reaches your component half-parsed.

Note: schemas with one-way `.transform()` calls cannot be encoded- use a codec for any field you want to round-trip through `$path`. If encoding fails, `$path` throws a `ZodError`.

### Important Quirks

#### Passing `undefined` for route params

If `undefined` is explictly passed as a **route param** for a dynamic or non-optinal catch-all segment, `$path` will throw at runtime to avoid something like `/foo//bar`. If undefined is passed for an optional catch-all segment, it will be ignored.

```ts
$path({ route: "/foo/[bar]", routeParams: { bar: undefined } });
// THROWS! Cannot pass undefined for a dynamic segment

$path({ route: "/foo/[...bar]", routeParams: { bar: undefined } });
// THROWS! Cannot pass undefined for a catch-all segment

$path({ route: "/foo/[[...bar]]", routeParams: { bar: undefined } });
// "/foo" Optional catch-all segments are ignored if undefined is passed
```

#### Passing `undefined` or `""` for search params

If `undefined` **OR** and empty string is explictly passed as a **search param**, it will be passed to the url without a corresponding value. This is different from leaving it out entirely, which will not include the search param in the url at all.

```ts
$path({ route: "/foo", searchParams: { bar: undefined } });
// "/foo?bar" undefined is passed as a search param without a value

$path({ route: "/foo", searchParams: { bar: "" } });
// "/foo?bar" An empty string is passed as a search param without a value
```

#### Passing data to catch-all segments

Catch all segments can be passed either an array or a value. If an array is passed, the values will be joined with a `/` in the url.

```ts
$path({ route: "/foo/[...bar]", routeParams: { bar: ["a", "b", "c"] } });
// "/foo/a/b/c"

$path({ route: "/foo/[...bar]", routeParams: { bar: "a" } });
// "/foo/a"
```

---

<h4 class="idk-why">Now lets use search and route params in our components!</h4>
<style>
  .idk-why {
    margin-bottom: 40px;
  }
</style>
```
