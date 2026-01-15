import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as ts from "typescript";
import { resolveRouteToFile, findRouteTypeWithGroups } from "../src/resolver";
import type { ResolvedConfig } from "../src/types";

// Cast ts to the expected type for tests (runtime API is compatible)
const typescript = ts as typeof import("typescript/lib/tsserverlibrary");

const mockConfig: ResolvedConfig = {
  appDir: "src/app",
  routeTypeFileName: "routeType",
  debug: false,
};

describe("resolveRouteToFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("path construction", () => {
    it("resolves root route", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/routeType.ts");
      });

      const result = resolveRouteToFile(ts, "/", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("src/app/routeType.ts");
    });

    it("resolves simple static route", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/users/routeType.ts");
      });

      const result = resolveRouteToFile(ts, "/users", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("users/routeType.ts");
    });

    it("resolves dynamic route", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/users/[id]/routeType.ts");
      });

      const result = resolveRouteToFile(ts, "/users/[id]", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("[id]/routeType.ts");
    });

    it("resolves catch-all route", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/docs/[...slug]/routeType.ts");
      });

      const result = resolveRouteToFile(ts, "/docs/[...slug]", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("[...slug]/routeType.ts");
    });

    it("resolves optional catch-all route", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/blog/[[...slug]]/routeType.ts");
      });

      const result = resolveRouteToFile(ts, "/blog/[[...slug]]", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("[[...slug]]/routeType.ts");
    });

    it("resolves nested route", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/foo/[id]/nest/routeType.ts");
      });

      const result = resolveRouteToFile(ts, "/foo/[id]/nest", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("nest/routeType.ts");
    });
  });

  describe("underscore escaping", () => {
    it("handles %5F escaping for underscores", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/_internal/routeType.ts");
      });

      const result = resolveRouteToFile(ts, "/%5Finternal", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("_internal/routeType.ts");
    });

    it("handles double underscore escaping", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/_internal/__very-internal/routeType.ts");
      });

      const result = resolveRouteToFile(
        ts,
        "/%5Finternal/%5F%5Fvery-internal",
        "/project",
        mockConfig
      );

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("__very-internal/routeType.ts");
    });
  });

  describe("file extension handling", () => {
    it("finds .ts file", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path === "/project/src/app/users/routeType.ts";
      });

      const result = resolveRouteToFile(ts, "/users", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toMatch(/\.ts$/);
    });

    it("finds .tsx file as fallback", () => {
      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path === "/project/src/app/users/routeType.tsx";
      });

      const result = resolveRouteToFile(ts, "/users", "/project", mockConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toMatch(/\.tsx$/);
    });
  });

  describe("non-existent routes", () => {
    it("returns exists: false for non-existent route", () => {
      vi.spyOn(typescript.sys, "fileExists").mockReturnValue(false);

      const result = resolveRouteToFile(ts, "/nonexistent", "/project", mockConfig);

      expect(result?.exists).toBe(false);
      expect(result?.filePath).toBeDefined();
    });
  });

  describe("custom configuration", () => {
    it("respects custom appDir", () => {
      const customConfig: ResolvedConfig = {
        ...mockConfig,
        appDir: "app",
      };

      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("app/users/routeType.ts") && !path.includes("src/app");
      });

      const result = resolveRouteToFile(ts, "/users", "/project", customConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("app/users/routeType.ts");
      expect(result?.filePath).not.toContain("src/app");
    });

    it("respects custom routeTypeFileName", () => {
      const customConfig: ResolvedConfig = {
        ...mockConfig,
        routeTypeFileName: "route",
      };

      vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
        return path.includes("src/app/users/route.ts");
      });

      const result = resolveRouteToFile(ts, "/users", "/project", customConfig);

      expect(result?.exists).toBe(true);
      expect(result?.filePath).toContain("route.ts");
    });
  });
});

describe("findRouteTypeWithGroups", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("finds route in direct path", () => {
    vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
      return path === "/project/src/app/users/routeType.ts";
    });
    vi.spyOn(typescript.sys, "directoryExists").mockReturnValue(true);
    vi.spyOn(typescript.sys, "readDirectory").mockReturnValue([]);

    const result = findRouteTypeWithGroups(ts, "/users", "/project", mockConfig);

    expect(result).toBe("/project/src/app/users/routeType.ts");
  });

  it("finds route inside route group", () => {
    vi.spyOn(typescript.sys, "fileExists").mockImplementation((path) => {
      return path === "/project/src/app/(auth)/login/routeType.ts";
    });
    vi.spyOn(typescript.sys, "directoryExists").mockImplementation((path) => {
      // Direct path at root doesn't exist, but path inside route group does
      if (path === "/project/src/app/login") return false;
      if (path === "/project/src/app/(auth)/login") return true;
      return true;
    });
    vi.spyOn(typescript.sys, "readDirectory").mockReturnValue(["(auth)/"]);

    const result = findRouteTypeWithGroups(ts, "/login", "/project", mockConfig);

    expect(result).toBe("/project/src/app/(auth)/login/routeType.ts");
  });

  it("returns null when route not found", () => {
    vi.spyOn(typescript.sys, "fileExists").mockReturnValue(false);
    vi.spyOn(typescript.sys, "directoryExists").mockReturnValue(false);
    vi.spyOn(typescript.sys, "readDirectory").mockReturnValue([]);

    const result = findRouteTypeWithGroups(ts, "/nonexistent", "/project", mockConfig);

    expect(result).toBeNull();
  });
});
