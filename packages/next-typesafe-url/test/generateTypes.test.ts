import { describe, expect, test, vi, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  generateTypesFile,
  getExternalRouteFileErrors,
} from "../src/generateTypes";
import type { Paths, RouteInformation } from "../src/cli";

function generate({
  appRoutesInfo,
  pagesRoutesInfo,
  externalRoutes,
  fixtureFiles = {},
}: {
  appRoutesInfo: RouteInformation | null;
  pagesRoutesInfo: RouteInformation | null;
  externalRoutes?: (string | { route: string; routeTypePath: string })[];
  // relative path -> content, created inside the temp dir; entries may
  // reference them via the special <dir> placeholder in routeTypePath
  fixtureFiles?: Record<string, string>;
}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntu-test-"));
  const absoluteOutputPath = path.join(dir, "generated.d.ts");
  const paths: Paths = {
    absoluteAppPath: null,
    absolutePagesPath: null,
    absoluteOutputPath,
    relativePathFromOutputToSrc: "./src",
  };

  for (const [relativePath, content] of Object.entries(fixtureFiles)) {
    const filePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  const resolvedExternalRoutes = externalRoutes?.map((entry) =>
    typeof entry === "string"
      ? entry
      : {
          route: entry.route,
          routeTypePath: entry.routeTypePath.replace("<dir>", dir),
        },
  );

  try {
    generateTypesFile({
      appRoutesInfo,
      pagesRoutesInfo,
      paths,
      filename: "routeType",
      externalRoutes: resolvedExternalRoutes,
    });
    return fs.readFileSync(absoluteOutputPath, "utf8");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("generateTypesFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const emptyRoutes: RouteInformation = { hasRoute: [], doesntHaveRoute: [] };

  test("always emits an ExternalRouter interface", () => {
    const content = generate({
      appRoutesInfo: emptyRoutes,
      pagesRoutesInfo: null,
    });

    expect(content).toContain("interface ExternalRouter {");
  });

  test("emits external routes as StaticRoute entries", () => {
    const content = generate({
      appRoutesInfo: emptyRoutes,
      pagesRoutesInfo: null,
      externalRoutes: ["/admin/index.html", "/legacy/dashboard"],
    });

    expect(content).toContain('"/admin/index.html": StaticRoute;');
    expect(content).toContain('"/legacy/dashboard": StaticRoute;');
  });

  test("external routes do not appear in StaticRouter or DynamicRouter", () => {
    const content = generate({
      appRoutesInfo: { hasRoute: [], doesntHaveRoute: ["/about"] },
      pagesRoutesInfo: null,
      externalRoutes: ["/admin/index.html"],
    });

    const staticRouterBlock = content.slice(
      content.indexOf("interface StaticRouter"),
      content.indexOf("interface ExternalRouter"),
    );
    expect(staticRouterBlock).toContain('"/about": StaticRoute;');
    expect(staticRouterBlock).not.toContain("/admin/index.html");
  });

  test("deduplicates external routes", () => {
    const content = generate({
      appRoutesInfo: emptyRoutes,
      pagesRoutesInfo: null,
      externalRoutes: ["/admin/index.html", "/admin/index.html"],
    });

    const matches = content.match(/"\/admin\/index\.html": StaticRoute;/g);
    expect(matches).toHaveLength(1);
  });

  test("discovered routes take priority over external routes", () => {
    const content = generate({
      appRoutesInfo: { hasRoute: [], doesntHaveRoute: ["/about"] },
      pagesRoutesInfo: null,
      externalRoutes: ["/about"],
    });

    const externalRouterBlock = content.slice(
      content.indexOf("interface ExternalRouter"),
    );
    expect(externalRouterBlock).not.toContain('"/about"');

    const staticRouterBlock = content.slice(
      content.indexOf("interface StaticRouter"),
      content.indexOf("interface ExternalRouter"),
    );
    expect(staticRouterBlock).toContain('"/about": StaticRoute;');
  });

  test("discovered dynamic routes take priority over external routes", () => {
    const content = generate({
      appRoutesInfo: { hasRoute: ["/(group)/foo/[id]"], doesntHaveRoute: [] },
      pagesRoutesInfo: null,
      externalRoutes: ["/foo/[id]"],
    });

    const externalRouterBlock = content.slice(
      content.indexOf("interface ExternalRouter"),
    );
    expect(externalRouterBlock).not.toContain('"/foo/[id]"');
  });

  test("omitting externalRoutes emits an empty ExternalRouter", () => {
    const content = generate({
      appRoutesInfo: emptyRoutes,
      pagesRoutesInfo: null,
    });

    const externalRouterBlock = content.slice(
      content.indexOf("interface ExternalRouter"),
    );
    expect(externalRouterBlock).not.toContain("StaticRoute;");
  });
  test("emits validator-backed external routes as InferRoute entries", () => {
    const content = generate({
      appRoutesInfo: emptyRoutes,
      pagesRoutesInfo: null,
      externalRoutes: [
        {
          route: "/external-blog/[slug]",
          routeTypePath: "<dir>/external/blogRoute.ts",
        },
      ],
      fixtureFiles: {
        "external/blogRoute.ts": "export type RouteType = unknown;",
      },
    });

    expect(content).toContain(
      '"/external-blog/[slug]": InferRoute<import("./external/blogRoute").RouteType>;',
    );
  });

  test("emits relative paths that walk up from the output file", () => {
    const content = generate({
      appRoutesInfo: emptyRoutes,
      pagesRoutesInfo: null,
      externalRoutes: [
        {
          route: "/legacy/[id]",
          routeTypePath: "<dir>/legacyRoute.tsx",
        },
      ],
      fixtureFiles: {
        "legacyRoute.tsx": "export type RouteType = unknown;",
      },
    });

    expect(content).toContain(
      '"/legacy/[id]": InferRoute<import("./legacyRoute").RouteType>;',
    );
  });

  test("getExternalRouteFileErrors flags missing routeType files", () => {
    const errors = getExternalRouteFileErrors([
      "/static-is-ignored",
      {
        route: "/external-blog/[slug]",
        routeTypePath: path.join(os.tmpdir(), "ntu-does-not-exist.ts"),
      },
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("does not exist");
    expect(errors[0]).toContain("/external-blog/[slug]");
  });

  test("getExternalRouteFileErrors flags files without a RouteType export", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntu-test-"));
    const filePath = path.join(dir, "noRouteType.ts");
    fs.writeFileSync(filePath, "export const Route = {};");

    try {
      const errors = getExternalRouteFileErrors([
        { route: "/external-blog/[slug]", routeTypePath: filePath },
      ]);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("does not export a RouteType");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("getExternalRouteFileErrors passes valid routeType files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ntu-test-"));
    const filePath = path.join(dir, "blogRoute.ts");
    fs.writeFileSync(
      filePath,
      "export const Route = {};\nexport type RouteType = typeof Route;",
    );

    try {
      expect(
        getExternalRouteFileErrors([
          { route: "/external-blog/[slug]", routeTypePath: filePath },
        ]),
      ).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("warns when an external route is shadowed by a discovered route", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    generate({
      appRoutesInfo: { hasRoute: [], doesntHaveRoute: ["/about"] },
      pagesRoutesInfo: null,
      externalRoutes: ["/about", "/not-shadowed"],
    });

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("/about");
    expect(warn.mock.calls[0]?.[0]).not.toContain("/not-shadowed");
  });

  test("does not warn when no external routes are shadowed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    generate({
      appRoutesInfo: emptyRoutes,
      pagesRoutesInfo: null,
      externalRoutes: ["/admin/index.html"],
    });

    expect(warn).not.toHaveBeenCalled();
  });
});
