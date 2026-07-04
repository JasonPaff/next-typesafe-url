import { type DynamicRoute } from "next-typesafe-url";
import { z } from "zod";

// a codec defines both directions: decode (URL -> rich type) runs during
// validation, encode (rich type -> URL) runs when $path is given `validator`
export const isoDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (value) => value.toISOString(),
});

// the two sides of a codec can have completely different shapes-
// here a structured object round-trips through a compact `lat,lng` string
// instead of a JSON blob
export const latLng = z.codec(
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
    from: isoDate.optional(),
    center: latLng.optional(),
  }),
} satisfies DynamicRoute;

export type RouteType = typeof Route;
