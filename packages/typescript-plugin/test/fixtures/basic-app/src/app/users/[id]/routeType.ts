import { z } from "zod";

export const Route = {
  routeParams: z.object({
    id: z.number(),
  }),
  searchParams: z.object({
    page: z.number().optional(),
  }),
};

export type RouteType = typeof Route;
