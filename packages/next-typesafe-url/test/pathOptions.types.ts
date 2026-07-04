// Type-level tests for codec detection and the conditionally-required
// $path validator. This file contains no runtime tests- it is enforced by
// `pnpm typecheck`: the Expect helpers fail to compile if an assertion is
// wrong, and tsc reports unused @ts-expect-error directives as errors if an
// expected compile error stops occurring.
import { z } from "zod";
import { $path } from "../src";
import type { DynamicRoute, InferRoute } from "../src/types";
import type { HasCodec, RouteRequiresValidator } from "../src/types";

/* eslint-disable @typescript-eslint/no-unused-vars */

type Expect<T extends true> = T;
type ExpectFalse<T extends false> = T;

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const isoDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (value) => value.toISOString(),
});

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

// ---------------------------------------------------------------------------
// HasCodec: positive cases
// ---------------------------------------------------------------------------

type P1 = Expect<HasCodec<typeof isoDate>>;
type P2 = Expect<HasCodec<z.ZodObject<{ d: typeof isoDate }>>>;
type P3 = Expect<HasCodec<z.ZodObject<{ d: z.ZodOptional<typeof isoDate> }>>>;
type P4 = Expect<HasCodec<z.ZodObject<{ d: z.ZodNullable<typeof isoDate> }>>>;
type P5 = Expect<
  HasCodec<z.ZodObject<{ d: z.ZodDefault<z.ZodOptional<typeof isoDate>> }>>
>;
type P6 = Expect<HasCodec<z.ZodObject<{ d: z.ZodCatch<typeof isoDate> }>>>;
type P7 = Expect<HasCodec<z.ZodObject<{ d: z.ZodArray<typeof latLng> }>>>;
type P8 = Expect<
  HasCodec<z.ZodObject<{ nested: z.ZodObject<{ d: typeof isoDate }> }>>
>;
type P9 = Expect<
  HasCodec<z.ZodObject<{ u: z.ZodUnion<[z.ZodString, typeof isoDate]> }>>
>;
type P10 = Expect<
  HasCodec<z.ZodObject<{ r: z.ZodRecord<z.ZodString, typeof isoDate> }>>
>;
// z.stringbool() is a built-in codec
type P11 = Expect<HasCodec<ReturnType<typeof z.stringbool>>>;
// discriminated unions extend ZodUnion, so the union branch covers them
const discUnion = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("a"), d: isoDate }),
  z.object({ kind: z.literal("b") }),
]);
type P12 = Expect<HasCodec<typeof discUnion>>;
// a codec piped into further validation is still a codec
const pipedCodec = isoDate.pipe(z.date());
type P13 = Expect<HasCodec<typeof pipedCodec>>;

// ---------------------------------------------------------------------------
// HasCodec: negative cases- these MUST stay false
// ---------------------------------------------------------------------------

const plainSchema = z.object({ a: z.string(), b: z.number().optional() });
type N1 = ExpectFalse<HasCodec<typeof plainSchema>>;

// unidirectional .transform() is a ZodPipe, not a codec- z.encode throws on
// it, so it must never make the validator required
const transformSchema = z.object({ n: z.string().transform((s) => s.length) });
type N2 = ExpectFalse<HasCodec<typeof transformSchema>>;

// .default() diverges input/output types without any codec- this is why
// detection walks the schema structure instead of comparing input vs output
const defaultSchema = z.object({ page: z.number().default(1) });
type N3 = ExpectFalse<HasCodec<typeof defaultSchema>>;

const pipedTransform = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string());
type N4 = ExpectFalse<HasCodec<typeof pipedTransform>>;

// ---------------------------------------------------------------------------
// route registry for $path call-site tests
// ---------------------------------------------------------------------------

export const CodecTestRoute = {
  searchParams: z.object({
    from: isoDate.optional(),
    center: latLng.optional(),
  }),
} satisfies DynamicRoute;

export const CodecParamTestRoute = {
  routeParams: z.object({ when: isoDate }),
  searchParams: z.object({ q: z.string().optional() }),
} satisfies DynamicRoute;

export const PlainTestRoute = {
  searchParams: z.object({ q: z.string().optional() }),
} satisfies DynamicRoute;

export const TransformTestRoute = {
  searchParams: z.object({ n: z.string().transform((s) => s.length) }),
} satisfies DynamicRoute;

type R1 = Expect<RouteRequiresValidator<typeof CodecTestRoute>>;
type R2 = Expect<RouteRequiresValidator<typeof CodecParamTestRoute>>;
type R3 = ExpectFalse<RouteRequiresValidator<typeof PlainTestRoute>>;
type R4 = ExpectFalse<RouteRequiresValidator<typeof TransformTestRoute>>;

declare module "@@@next-typesafe-url" {
  interface DynamicRouter {
    "/__type-test/codec": InferRoute<typeof CodecTestRoute>;
    "/__type-test/codec-param/[when]": InferRoute<typeof CodecParamTestRoute>;
    "/__type-test/plain": InferRoute<typeof PlainTestRoute>;
    "/__type-test/transform": InferRoute<typeof TransformTestRoute>;
  }
}

// ---------------------------------------------------------------------------
// $path call sites
// ---------------------------------------------------------------------------

// OK: codec route with validator- params are the codec OUTPUT types
$path({
  route: "/__type-test/codec",
  searchParams: { from: new Date(), center: { lat: 40.7128, lng: -74.006 } },
  validator: CodecTestRoute,
});

// ERROR: codec route without validator- the compile error this feature exists for
// @ts-expect-error validator is required for routes whose schemas contain codecs
$path({ route: "/__type-test/codec", searchParams: { from: new Date() } });

// ERROR: a different route's validator is not assignable
// @ts-expect-error PlainTestRoute does not match the registered RouteType
$path({
  route: "/__type-test/codec",
  searchParams: { from: new Date() },
  validator: PlainTestRoute,
});

// codecs in routeParams require the validator too
$path({
  route: "/__type-test/codec-param/[when]",
  routeParams: { when: new Date() },
  validator: CodecParamTestRoute,
});
// @ts-expect-error validator is required when routeParams contain codecs
$path({
  route: "/__type-test/codec-param/[when]",
  routeParams: { when: new Date() },
});

// OK: plain route without validator- exactly the pre-codec behavior
$path({ route: "/__type-test/plain", searchParams: { q: "hi" } });
$path({ route: "/__type-test/plain" });

// OK: plain route may still opt in to a validator (output-typed params)
$path({
  route: "/__type-test/plain",
  searchParams: { q: "hi" },
  validator: PlainTestRoute,
});

// OK: transform routes must NOT require the validator- z.encode throws on
// unidirectional transforms, and their params stay input-typed
$path({ route: "/__type-test/transform", searchParams: { n: "abc" } });
