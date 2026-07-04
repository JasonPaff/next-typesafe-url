import { describe, expect, it } from "vitest";
import Link from "next/link";
import { z } from "zod";
import { TypedLink } from "../src";
import type { TypedLinkProps, AllRoutes } from "../src";

// TypedLink has no hooks, so calling it as a plain function returns the
// underlying Link element and lets us assert on its props without a DOM
function renderTypedLink(props: Record<string, unknown>) {
  return TypedLink(props as unknown as TypedLinkProps<AllRoutes>);
}

describe("TypedLink", () => {
  it("renders a Link with the computed href", () => {
    const element = renderTypedLink({
      route: "/foo/[bar]",
      routeParams: { bar: "baz" },
      searchParams: { lux: "flux" },
      children: "go",
    });

    expect(element.type).toBe(Link);
    expect(element.props).toMatchObject({
      href: "/foo/baz?lux=flux",
      children: "go",
    });
  });

  it("renders static routes with just the route string", () => {
    const element = renderTypedLink({ route: "/foo", children: "go" });

    expect(element.props).toMatchObject({ href: "/foo" });
  });

  it("forwards all other props to Link", () => {
    const element = renderTypedLink({
      route: "/foo",
      prefetch: false,
      replace: true,
      className: "link",
      children: "go",
    });

    expect(element.props).toMatchObject({
      href: "/foo",
      prefetch: false,
      replace: true,
      className: "link",
    });
  });

  it("does not leak route options into the rendered Link", () => {
    const element = renderTypedLink({
      route: "/foo/[bar]",
      routeParams: { bar: "baz" },
      children: "go",
    });

    expect(element.props).not.toHaveProperty("route");
    expect(element.props).not.toHaveProperty("routeParams");
    expect(element.props).not.toHaveProperty("searchParams");
    expect(element.props).not.toHaveProperty("validator");
  });

  it("encodes params through the validator like $path", () => {
    const isoDate = z.codec(z.iso.datetime(), z.date(), {
      decode: (value) => new Date(value),
      encode: (value) => value.toISOString(),
    });
    const Route = { searchParams: z.object({ from: isoDate }) };
    const from = new Date("2024-01-01T00:00:00.000Z");

    const element = renderTypedLink({
      route: "/post",
      searchParams: { from },
      validator: Route,
      children: "go",
    });

    expect(element.props).toMatchObject({
      href: "/post?from=2024-01-01T00%3A00%3A00.000Z",
    });
  });
});
