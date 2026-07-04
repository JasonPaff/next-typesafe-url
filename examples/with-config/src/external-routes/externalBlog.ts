import { type DynamicRoute } from "next-typesafe-url";
import { z } from "zod";

// a routeType file for an external route, written exactly like the
// routeType.ts of a scanned route, but referenced from the config file
// via externalRoutes: [{ route, routeType }]
export const Route = {
  routeParams: z.object({
    slug: z.string(),
  }),
  searchParams: z.object({
    ref: z.string().optional(),
  }),
} satisfies DynamicRoute;

export type RouteType = typeof Route;
