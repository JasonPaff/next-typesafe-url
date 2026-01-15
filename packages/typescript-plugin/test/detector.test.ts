import { describe, it, expect } from "vitest";
import ts from "typescript";
import { detectRouteString } from "../src/detector";

function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);
}

describe("detectRouteString", () => {
  describe("valid route detection", () => {
    it("detects route string in $path call", () => {
      const code = `$path({ route: "/users/[id]", routeParams: { id: 1 } })`;
      const sourceFile = createSourceFile(code);
      // Position inside the route string value
      const position = 18;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/users/[id]");
    });

    it("detects static route", () => {
      const code = `$path({ route: "/" })`;
      const sourceFile = createSourceFile(code);
      const position = 16;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/");
    });

    it("detects route with multiple segments", () => {
      const code = `$path({ route: "/foo/bar/baz" })`;
      const sourceFile = createSourceFile(code);
      const position = 18;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/foo/bar/baz");
    });

    it("detects catch-all route", () => {
      const code = `$path({ route: "/docs/[...slug]", routeParams: { slug: ["a", "b"] } })`;
      const sourceFile = createSourceFile(code);
      const position = 20;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/docs/[...slug]");
    });

    it("detects optional catch-all route", () => {
      const code = `$path({ route: "/blog/[[...slug]]" })`;
      const sourceFile = createSourceFile(code);
      const position = 20;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/blog/[[...slug]]");
    });

    it("detects route with module prefix", () => {
      const code = `lib.$path({ route: "/users" })`;
      const sourceFile = createSourceFile(code);
      const position = 23;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/users");
    });
  });

  describe("span calculation", () => {
    it("returns correct span for route string", () => {
      const code = `$path({ route: "/users/[id]" })`;
      const sourceFile = createSourceFile(code);
      const position = 18;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      // The span should include the quotes
      const spanText = code.substring(result!.span.start, result!.span.start + result!.span.length);
      expect(spanText).toBe('"/users/[id]"');
    });
  });

  describe("non-route strings", () => {
    it("returns null for non-route strings", () => {
      const code = `const x = "hello world"`;
      const sourceFile = createSourceFile(code);
      const position = 12;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).toBeNull();
    });

    it("returns null for route outside $path call", () => {
      const code = `const route = "/users/[id]"`;
      const sourceFile = createSourceFile(code);
      const position = 18;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).toBeNull();
    });

    it("returns null for non-route property in $path call", () => {
      const code = `$path({ route: "/users", name: "/other" })`;
      const sourceFile = createSourceFile(code);
      // Position inside "/other" string
      const position = 35;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).toBeNull();
    });

    it("returns null for string not starting with /", () => {
      const code = `$path({ route: "users" })`;
      const sourceFile = createSourceFile(code);
      const position = 17;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).toBeNull();
    });

    it("returns null for different function call", () => {
      const code = `otherFunc({ route: "/users" })`;
      const sourceFile = createSourceFile(code);
      const position = 22;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles position at start of string", () => {
      const code = `$path({ route: "/users" })`;
      const sourceFile = createSourceFile(code);
      const position = 15; // At the opening quote

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/users");
    });

    it("handles multiline $path call", () => {
      const code = `$path({
  route: "/users/[id]",
  routeParams: { id: 1 }
})`;
      const sourceFile = createSourceFile(code);
      // Position inside the route string
      const position = code.indexOf("/users/[id]") + 2;

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).not.toBeNull();
      expect(result?.route).toBe("/users/[id]");
    });

    it("returns null for position outside any token", () => {
      const code = `$path({ route: "/users" })`;
      const sourceFile = createSourceFile(code);
      const position = 100; // Past end of code

      const result = detectRouteString(ts, sourceFile, position);

      expect(result).toBeNull();
    });
  });
});
