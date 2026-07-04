---
title: "Running the CLI"
description: "how to run the next-typesafe-url CLI"
nextPage:
  text: "Next: Routing"
  link: "en/usage/routing"
---

## What does the CLI do?

The CLI's purpose is to generate a file that contains a mapping of every possible route to a schema if you defined one.

This is required to be able to define the schemas in a convenient way (wherever the route is), and still have a single type representing all possible routes and their schemas that can be used to generate links.

### src

`next-typesafe-url` requires that you have a `src` directory in your project, and that your `pages` and `app` directories are inside of it.

```
└── src
    └── app
    // or/and
    └── pages
```

It doesn't where `src` is located, but it must exist.

## Running the CLI

```
Usage:
$ npx next-typesafe-url (...options)
```

### Options:

#### --watch / -w

Running the CLI with the `--watch` or `-w` flag will cause the CLI to watch for changes in your `src/app` and `src/pages` directories and automatically regenerate the types file when it detects a change.

#### --srcPath

The path to your `src` directory relative to the cwd the cli is run from. DEFAULT: `"./src"`

#### --outputPath

The path of the generated `.d.ts` file relative to the cwd the cli is run from. DEFAULT: `"./next-typesafe-url_.d.ts"`

#### --filename

Override the default filename for the `routeType.ts` file in the app directory. DEFAULT: `routeType`

#### --help

Show this information

## Configuration file

All CLI options (except `--help`) can also be set in a configuration file. The CLI searches for, in order: `next-typesafe-url.config.ts`, `next-typesafe-url.config.js`, `next-typesafe-url.config.mjs`, `next-typesafe-url.config.cjs`, or a `"next-typesafe-url"` key in `package.json`.

CLI flags take precedence over config file values.

The `defineConfig` helper provides type checking and autocomplete:

```ts
// next-typesafe-url.config.ts
import { defineConfig } from "next-typesafe-url";

export default defineConfig({
  watch: false,
  srcPath: "./src",
  outputPath: "./_next-typesafe-url_.d.ts",
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  filename: "routeType",
  externalRoutes: ["/admin/index.html"],
});
```

### externalRoutes

Some paths are real URLs in your app but are not discoverable by scanning `app` or `pages`- for example static files served from the `public` directory, or paths handled by rewrites.

The `externalRoutes` option registers these paths in the generated types so they are valid inputs for `$path`:

```ts
$path({ route: "/admin/index.html" });
```

A plain string registers a **static** route- no dynamic segments, no params.

To register a **dynamic** external route, use the object form and point `routeType` at a file that exports a `Route` object and `RouteType` type, written exactly like a normal routeType.ts:

```ts
// next-typesafe-url.config.ts
externalRoutes: [
  "/admin/index.html",
  {
    route: "/external-blog/[slug]",
    routeType: "./src/external-routes/externalBlog.ts",
  },
],
```

```ts
// src/external-routes/externalBlog.ts
import { type DynamicRoute } from "next-typesafe-url";
import { z } from "zod";

export const Route = {
  routeParams: z.object({ slug: z.string() }),
  searchParams: z.object({ ref: z.string().optional() }),
} satisfies DynamicRoute;

export type RouteType = typeof Route;
```

`$path` then types the route exactly like a scanned dynamic route, including search params and zod transforms/codecs:

```ts
$path({
  route: "/external-blog/[slug]",
  routeParams: { slug: "hello" },
  searchParams: { ref: "homepage" },
});
```

The `routeType` path is resolved relative to the directory the CLI is run from. The CLI errors if the file does not exist or does not export a `RouteType` type.

External routes are only valid for `$path`- they never appear in `RouterInputs` or `RouterOutputs`. If a route is both discovered by scanning and listed in `externalRoutes`, the scanned route wins and the CLI prints a warning.

`externalRoutes` is config-file only- there is no CLI flag for it.

### Add to your package.json scripts

Add `next-typesafe-url` to your dev and build script in package.json.

This will ensure that the types are generated before the build, and that they are regenerated when you make changes in dev mode.

For dev mode, you can either run it in a seperate shell, or in the same one as `next dev` with the [concurrently](https://www.npmjs.com/package/concurrently) package.

```json
{
  "scripts": {
    "build": "next-typesafe-url && next build",

    "dev": "concurrently  \"next-typesafe-url -w\" \"next dev\"",
    // OR
    "dev:url": "next-typesafe-url -w"
  }
}
```

<h4>Now we're ready to start routing and consuming params!<h4>
