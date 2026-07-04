---
"next-typesafe-url": minor
---

Add `externalRoutes` config option and `defineConfig` helper

Routes that are not discoverable by scanning `app`/`pages` (static assets in `/public`, rewrites, etc.) can now be registered in the config file and used with `$path`. Plain strings register static routes; dynamic routes use `{ route, routeType }`, where `routeType` points at a file exporting a `Route` object and `RouteType` type (exactly like a normal routeType.ts), giving full zod-typed route and search params. The CLI errors when the referenced file is missing or lacks a `RouteType` export. External routes are emitted into a separate `ExternalRouter` interface so they are only valid as `$path` inputs and never appear in `RouterInputs`/`RouterOutputs`; if an entry collides with a discovered route, the scanned route wins and the CLI warns. The new `defineConfig` helper provides typed config files.
