import { describe, expect, test } from "vitest";
import { z } from "zod";
import { $path } from "../src";
import {
  parseServerSideParams,
  parseObjectFromParamString,
} from "../src/utils";
import type { DynamicRoute } from "../src/types";

// $path is typed against the generated route registry which does not exist
// in unit tests, so cast to a permissive signature like path.test.ts does
const $testPath: (args: {
  route: string;
  searchParams?: Record<string, unknown>;
  routeParams?: Record<string, unknown>;
  validator?: DynamicRoute;
}) => string = $path;

const isoDate = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (value) => value.toISOString(),
});

const commaSeparatedNumbers = z.codec(z.string(), z.array(z.number()), {
  decode: (value) => value.split(",").map(Number),
  encode: (value) => value.join(","),
});

type FooHandle = { id: string } | { shortId: number };

const fooHandle = z.codec(
  z.string(),
  z.union([z.object({ id: z.string() }), z.object({ shortId: z.number() })]),
  {
    decode: (value): FooHandle =>
      value.startsWith("id")
        ? { shortId: Number(value.slice(2)) }
        : { id: value },
    encode: (value) => ("id" in value ? value.id : `id${value.shortId}`),
  },
);

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

describe("$path with validator", () => {
  test("encodes Date search params via codec", () => {
    const Route = {
      searchParams: z.object({ from: isoDate }),
    } satisfies DynamicRoute;

    const result = $testPath({
      route: "/report",
      searchParams: { from: new Date("2026-01-01T00:00:00.000Z") },
      validator: Route,
    });

    expect(result).toBe(
      `/report?from=${encodeURIComponent("2026-01-01T00:00:00.000Z")}`,
    );
  });

  test("date round-trips through the server side parser", () => {
    const Route = {
      searchParams: z.object({ from: isoDate }),
    } satisfies DynamicRoute;

    const path = $testPath({
      route: "/report",
      searchParams: { from: new Date("2026-01-01T00:00:00.000Z") },
      validator: Route,
    });

    const paramString = path.split("?")[1] ?? "";
    const rawParams = parseObjectFromParamString(paramString) as Record<
      string,
      string
    >;
    const parsed = parseServerSideParams({
      params: rawParams,
      validator: Route.searchParams,
    });

    expect(parsed.isError).toBe(false);
    expect(parsed.data?.from).toBeInstanceOf(Date);
    expect(parsed.data?.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  test("encodes custom route param formats via codec", () => {
    const Route = {
      routeParams: z.object({ fooHandle }),
    } satisfies DynamicRoute;

    expect(
      $testPath({
        route: "/foos/[fooHandle]",
        routeParams: { fooHandle: { shortId: 42 } },
        validator: Route,
      }),
    ).toBe("/foos/id42");

    expect(
      $testPath({
        route: "/foos/[fooHandle]",
        routeParams: { fooHandle: { id: "523ae1d0" } },
        validator: Route,
      }),
    ).toBe("/foos/523ae1d0");
  });

  test("encodes arrays with custom notation via codec", () => {
    const Route = {
      searchParams: z.object({ ids: commaSeparatedNumbers }),
    } satisfies DynamicRoute;

    const result = $testPath({
      route: "/items",
      searchParams: { ids: [1, 2, 3] },
      validator: Route,
    });

    expect(result).toBe(`/items?ids=${encodeURIComponent("1,2,3")}`);
  });

  test("custom array notation round-trips", () => {
    const Route = {
      searchParams: z.object({ ids: commaSeparatedNumbers }),
    } satisfies DynamicRoute;

    const path = $testPath({
      route: "/items",
      searchParams: { ids: [10, 20] },
      validator: Route,
    });

    const paramString = path.split("?")[1] ?? "";
    const rawParams = parseObjectFromParamString(paramString) as Record<
      string,
      string
    >;
    const parsed = parseServerSideParams({
      params: rawParams,
      validator: Route.searchParams,
    });

    expect(parsed.isError).toBe(false);
    expect(parsed.data?.ids).toEqual([10, 20]);
  });

  test("plain schemas behave identically with and without validator", () => {
    const Route = {
      searchParams: z.object({ q: z.string(), page: z.number() }),
      routeParams: z.object({ slug: z.string() }),
    } satisfies DynamicRoute;

    const withValidator = $testPath({
      route: "/blog/[slug]",
      routeParams: { slug: "hello" },
      searchParams: { q: "abc", page: 2 },
      validator: Route,
    });
    const withoutValidator = $testPath({
      route: "/blog/[slug]",
      routeParams: { slug: "hello" },
      searchParams: { q: "abc", page: 2 },
    });

    expect(withValidator).toBe(withoutValidator);
  });

  test("only encodes the params the validator describes", () => {
    // validator with only searchParams- routeParams pass through untouched
    const Route = {
      searchParams: z.object({ from: isoDate }),
    } satisfies DynamicRoute;

    const result = $testPath({
      route: "/report/[id]",
      routeParams: { id: 7 },
      searchParams: { from: new Date("2026-01-01T00:00:00.000Z") },
      validator: Route,
    });

    expect(result).toBe(
      `/report/7?from=${encodeURIComponent("2026-01-01T00:00:00.000Z")}`,
    );
  });

  test("throws a ZodError when params fail to encode", () => {
    const Route = {
      searchParams: z.object({ from: isoDate }),
    } satisfies DynamicRoute;

    expect(() =>
      $testPath({
        route: "/report",
        searchParams: { from: "not-a-date" },
        validator: Route,
      }),
    ).toThrow(z.ZodError);
  });

  test("optional codec fields can be omitted", () => {
    const Route = {
      searchParams: z.object({ from: isoDate.optional(), q: z.string() }),
    } satisfies DynamicRoute;

    const result = $testPath({
      route: "/report",
      searchParams: { q: "abc" },
      validator: Route,
    });

    expect(result).toBe("/report?q=abc");
  });
  test("encodes structured objects to compact strings via codec", () => {
    const Route = {
      searchParams: z.object({ center: latLng }),
    } satisfies DynamicRoute;

    const result = $testPath({
      route: "/map",
      searchParams: { center: { lat: 40.7128, lng: -74.006 } },
      validator: Route,
    });

    expect(result).toBe(`/map?center=${encodeURIComponent("40.7128,-74.006")}`);
  });

  test("structured object codec round-trips", () => {
    const Route = {
      searchParams: z.object({ center: latLng }),
    } satisfies DynamicRoute;

    const path = $testPath({
      route: "/map",
      searchParams: { center: { lat: -33.8688, lng: 151.2093 } },
      validator: Route,
    });

    const paramString = path.split("?")[1] ?? "";
    const rawParams = parseObjectFromParamString(paramString) as Record<
      string,
      string
    >;
    const parsed = parseServerSideParams({
      params: rawParams,
      validator: Route.searchParams,
    });

    expect(parsed.isError).toBe(false);
    expect(parsed.data?.center).toEqual({ lat: -33.8688, lng: 151.2093 });
  });

  test("malformed compact strings fail validation on decode", () => {
    const Route = {
      searchParams: z.object({ center: latLng }),
    } satisfies DynamicRoute;

    const parsed = parseServerSideParams({
      params: { center: "not-coords" },
      validator: Route.searchParams,
    });

    expect(parsed.isError).toBe(true);
  });
});
