import { z } from "zod";

export const Route = {
  routeParams: z.object({
    slug: z.string(),
  }),
};

export type RouteType = typeof Route;
