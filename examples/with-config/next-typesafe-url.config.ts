import { defineConfig } from "next-typesafe-url";

export default defineConfig({
  // Optional: customize the output path
  outputPath: "./next_safe_routes.d.ts",
  // Optional: customize the src directory
  srcPath: "./src",
  // Optional: customize page extensions
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  // Optional: customize the routeType filename
  filename: "route-type",
  // Optional: register routes the CLI cannot discover by scanning,
  // e.g. static files served from /public or paths handled by rewrites.
  // External routes are only valid as $path inputs- they never appear in
  // RouterInputs/RouterOutputs or the hooks/HOCs.
  // Strings register static external routes; dynamic external routes
  // use the object form and point at a routeType validator file.
  externalRoutes: [
    "/admin/index.html",
    {
      route: "/external-blog/[slug]",
      routeType: "./src/external-routes/externalBlog.ts",
    },
  ],
});
