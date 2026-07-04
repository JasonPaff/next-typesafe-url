#!/usr/bin/env node
import meow from "meow";
import path from "path";
import chokidar from "chokidar";
import {
  getPAGESRoutesWithExportedRoute,
  getAPPRoutesWithExportedRoute,
  generateTypesFile,
  getExternalRouteFileErrors,
  type ResolvedExternalRoute,
} from "./generateTypes";
import { loadConfig } from "./loadConfig";
import { defaultConfig, getExternalRouteErrors } from "./config";

const helpText = `
Usage:
$ npx next-typesafe-url (...options)
Scans for routes in your app and pages directories and generates a types file for next-typesafe-url

Configuration:
You can use a next-typesafe-url.config.ts file for fully typesafe configuration.
CLI options will override config file values.

Options:
--watch / -w,  Watch for file changes in src/app and src/pages and regenerate the types file
--srcPath, The path to your src directory relative to the cwd the cli is run from. DEFAULT: "./src"
--outputPath, The path of the generated .d.ts file relative to the cwd the cli is run from. DEFAULT: "./_next-typesafe-url_.d.ts"
--pageExtensions, A comma separated list of file extensions to consider as. DEFAULT: "tsx,ts,jsx,js"
--filename, Override the default name of the RouteType file in the app directory. DEFAULT: "routeType.ts"
--help,  Show this help message

Config-file only options:
externalRoutes, Routes not discoverable by scanning (e.g. static assets in /public). Strings register static routes; dynamic routes use { route, routeType } pointing at a routeType file. Added to the generated types for $path only.
`;

const cli = meow(helpText, {
  flags: {
    watch: {
      type: "boolean",
      alias: "w",
    },
    outputPath: {
      type: "string",
    },
    srcPath: {
      type: "string",
    },
    pageExtensions: {
      type: "string",
    },
    filename: {
      type: "string",
    },
  },
});

export type Paths = {
  absolutePagesPath: string | null;
  absoluteAppPath: string | null;
  absoluteOutputPath: string;
  relativePathFromOutputToSrc: string;
};

export type RouteInformation = {
  hasRoute: string[];
  doesntHaveRoute: string[];
};

function build({
  paths,
  pageExtensions,
  filename,
  externalRoutes,
}: {
  paths: Paths;
  pageExtensions: string[];
  filename: string;
  externalRoutes: ResolvedExternalRoute[];
}) {
  const { absoluteAppPath, absolutePagesPath } = paths;

  const appRoutesInfo = absoluteAppPath
    ? getAPPRoutesWithExportedRoute({
        basePath: absoluteAppPath,
        dir: absoluteAppPath,
        pageExtensions,
        filename,
      })
    : null;
  const pagesRoutesInfo = absolutePagesPath
    ? getPAGESRoutesWithExportedRoute({
        basePath: absolutePagesPath,
        dir: absolutePagesPath,
        pageExtensions,
        filename,
      })
    : null;

  generateTypesFile({
    appRoutesInfo,
    pagesRoutesInfo,
    paths,
    filename,
    externalRoutes,
  });
  console.log(`Generated route types`);
}

function watch({
  paths,
  pageExtensions,
  filename,
  externalRoutes,
}: {
  paths: Paths;
  pageExtensions: string[];
  filename: string;
  externalRoutes: ResolvedExternalRoute[];
}) {
  const { absoluteAppPath, absolutePagesPath } = paths;

  if (absoluteAppPath) {
    chokidar
      .watch([`${absoluteAppPath}/**/*.{${pageExtensions.join(",")}}`])
      .on("change", () => {
        build({ filename, paths, pageExtensions, externalRoutes });
      });
  }
  if (absolutePagesPath) {
    chokidar
      .watch([`${absolutePagesPath}/**/*.{${pageExtensions.join(",")}}`])
      .on("change", () => {
        build({ filename, paths, pageExtensions, externalRoutes });
      });
  }

  console.log(`Watching for route changes`);
}

if (require.main === module) {
  void (async () => {
    // load config from the file
    const fileConfig = await loadConfig();

    // helper function to normalize pageExtensions to an array
    const normalizePageExtensions = (
      extensions: string | string[] | undefined,
    ): string[] => {
      if (!extensions) return defaultConfig.pageExtensions;
      if (typeof extensions === "string") {
        return extensions.split(",").map((ext) => ext.trim());
      }
      return extensions;
    };

    // merge config: CLI flags > config file > defaults
    const mergedConfig = {
      watch: cli.flags.watch ?? fileConfig?.watch ?? defaultConfig.watch,
      srcPath:
        cli.flags.srcPath ?? fileConfig?.srcPath ?? defaultConfig.srcPath,
      outputPath:
        cli.flags.outputPath ??
        fileConfig?.outputPath ??
        defaultConfig.outputPath,
      filename:
        cli.flags.filename ?? fileConfig?.filename ?? defaultConfig.filename,
      pageExtensions: normalizePageExtensions(
        cli.flags.pageExtensions ?? fileConfig?.pageExtensions,
      ),
      externalRoutes:
        fileConfig?.externalRoutes ?? defaultConfig.externalRoutes,
    };

    const { filename, srcPath, outputPath, pageExtensions, externalRoutes } =
      mergedConfig;

    const externalRouteErrors = getExternalRouteErrors(externalRoutes);
    if (externalRouteErrors.length > 0) {
      console.log(
        `Invalid externalRoutes config:\n${externalRouteErrors.join("\n")}`,
      );
      process.exit(1);
    }

    // resolve routeType paths relative to the cwd, like srcPath/outputPath
    const resolvedExternalRoutes: ResolvedExternalRoute[] = externalRoutes.map(
      (entry) =>
        typeof entry === "string"
          ? entry
          : {
              route: entry.route,
              routeTypePath: path.join(process.cwd(), entry.routeType),
            },
    );

    const externalRouteFileErrors = getExternalRouteFileErrors(
      resolvedExternalRoutes,
    );
    if (externalRouteFileErrors.length > 0) {
      console.log(
        `Invalid externalRoutes config:\n${externalRouteFileErrors.join("\n")}`,
      );
      process.exit(1);
    }

    const absoluteSrcPath = path.join(process.cwd(), srcPath);

    if (!directoryExistsSync(absoluteSrcPath)) {
      console.log("srcPath is not a directory or does not exist");
      process.exit(1);
    }

    const absoluteOutputPath = path.join(process.cwd(), outputPath);
    const relativePathFromOutputToSrc = path.relative(
      path.dirname(absoluteOutputPath),
      absoluteSrcPath,
    );

    const appPath = path.join(absoluteSrcPath, "app");
    const pagesPath = path.join(absoluteSrcPath, "pages");

    const absoluteAppPath = directoryExistsSync(appPath) ? appPath : null;
    const absolutePagesPath = directoryExistsSync(pagesPath) ? pagesPath : null;

    const paths = {
      absolutePagesPath,
      absoluteAppPath,
      absoluteOutputPath,
      relativePathFromOutputToSrc,
    };

    if (mergedConfig.watch) {
      build({
        filename,
        paths,
        pageExtensions,
        externalRoutes: resolvedExternalRoutes,
      });
      watch({
        filename,
        paths,
        pageExtensions,
        externalRoutes: resolvedExternalRoutes,
      });
    } else {
      build({
        filename,
        paths,
        pageExtensions,
        externalRoutes: resolvedExternalRoutes,
      });
    }
  })();
}

import fs from "fs";
function directoryExistsSync(path: string): boolean {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
