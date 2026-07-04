import { describe, expect, test } from "vitest";
import { z } from "zod";
import type { ResolvingMetadata } from "next";
import { withMetadataParamValidation } from "../src/app/hoc";
import type { DynamicRoute } from "../src/types";

const parent = {} as ResolvingMetadata;

const Route = {
  routeParams: z.object({
    id: z.number(),
  }),
  searchParams: z.object({
    q: z.string().optional(),
  }),
} satisfies DynamicRoute;

describe("withMetadataParamValidation", () => {
  test("passes validated params to the wrapped function", async () => {
    const generateMetadata = withMetadataParamValidation(async (props) => {
      const routeParams = await props.routeParams;
      const searchParams = await props.searchParams;
      return { title: `post ${routeParams.id} q=${searchParams.q}` };
    }, Route);

    const metadata = await generateMetadata(
      {
        params: Promise.resolve({ id: "5" }),
        searchParams: Promise.resolve({ q: "hello" }),
      },
      parent,
    );

    expect(metadata).toEqual({ title: "post 5 q=hello" });
  });

  test("handles non-promise params for backwards compatibility", async () => {
    const generateMetadata = withMetadataParamValidation(async (props) => {
      const routeParams = await props.routeParams;
      return { title: `post ${routeParams.id}` };
    }, Route);

    const metadata = await generateMetadata(
      {
        // Next 13/14 passed plain objects
        params: { id: "7" } as unknown as Promise<Record<string, string>>,
        searchParams: Promise.resolve({}),
      },
      parent,
    );

    expect(metadata).toEqual({ title: "post 7" });
  });

  test("rejects with a ZodError when route params are invalid", async () => {
    const generateMetadata = withMetadataParamValidation(async (props) => {
      const routeParams = await props.routeParams;
      return { title: String(routeParams.id) };
    }, Route);

    await expect(
      generateMetadata(
        {
          params: Promise.resolve({ id: "not-a-number" }),
          searchParams: Promise.resolve({}),
        },
        parent,
      ),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  test("rejects with a ZodError when search params are invalid", async () => {
    const generateMetadata = withMetadataParamValidation(async (props) => {
      const searchParams = await props.searchParams;
      return { title: searchParams.q ?? "none" };
    }, Route);

    await expect(
      generateMetadata(
        {
          params: Promise.resolve({ id: "1" }),
          searchParams: Promise.resolve({ q: "5" }),
        },
        parent,
      ),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  test("works with a validator that only has routeParams", async () => {
    const RouteParamsOnly = {
      routeParams: z.object({ slug: z.string() }),
    } satisfies DynamicRoute;

    const generateMetadata = withMetadataParamValidation(async (props) => {
      const routeParams = await props.routeParams;
      return { title: routeParams.slug };
    }, RouteParamsOnly);

    const metadata = await generateMetadata(
      {
        params: Promise.resolve({ slug: "hello" }),
        searchParams: Promise.resolve({}),
      },
      parent,
    );

    expect(metadata).toEqual({ title: "hello" });
  });

  test("passes parent through to the wrapped function", async () => {
    const fakeParent = { title: "parent" } as unknown as ResolvingMetadata;

    const generateMetadata = withMetadataParamValidation(
      async (_props, resolvedParent) => {
        expect(resolvedParent).toBe(fakeParent);
        return { title: "child" };
      },
      Route,
    );

    const metadata = await generateMetadata(
      {
        params: Promise.resolve({ id: "1" }),
        searchParams: Promise.resolve({}),
      },
      fakeParent,
    );

    expect(metadata).toEqual({ title: "child" });
  });
});
