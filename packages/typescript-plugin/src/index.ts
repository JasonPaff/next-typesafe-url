import type ts from "typescript/lib/tsserverlibrary";
import { createPlugin } from "./plugin";

/**
 * TypeScript Language Service Plugin Entry Point
 *
 * This is the init function that tsserver calls when loading the plugin.
 * It receives the typescript module and must return a factory object with
 * a create method.
 *
 * Usage in tsconfig.json:
 * {
 *   "compilerOptions": {
 *     "plugins": [
 *       {
 *         "name": "next-typesafe-url-plugin",
 *         "appDir": "./src/app",
 *         "routeTypeFileName": "routeType",
 *         "debug": false
 *       }
 *     ]
 *   }
 * }
 */
function init(modules: { typescript: typeof ts }) {
  return createPlugin(modules.typescript);
}

// Must use CommonJS export syntax for tsserver compatibility
export = init;
