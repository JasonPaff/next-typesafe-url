import type ts from "typescript/lib/tsserverlibrary";
import type { PluginConfig, ResolvedConfig } from "./types";
import { resolveConfig, detectAppDir } from "./config";
import { detectRouteString } from "./detector";
import { resolveRouteToFile, findRouteTypeWithGroups } from "./resolver";
import { Logger } from "./logger";

/**
 * Creates the TypeScript Language Service Plugin.
 * This follows the standard decorator pattern for TS plugins.
 */
export function createPlugin(typescript: typeof ts) {
  return {
    create(info: ts.server.PluginCreateInfo): ts.LanguageService {
      const config = resolveConfig(info.config as PluginConfig | undefined);
      const logger = new Logger(info, config.debug);

      logger.log("Plugin initializing...");
      logger.log(`Project: ${info.project.getCurrentDirectory()}`);
      logger.info(`Config: ${JSON.stringify(config)}`);

      const projectPath = info.project.getCurrentDirectory();

      // Auto-detect app directory if not configured
      if (!(info.config as PluginConfig | undefined)?.appDir) {
        const detected = detectAppDir(typescript, projectPath);
        if (detected) {
          config.appDir = detected;
          logger.log(`Auto-detected app directory: ${detected}`);
        } else {
          logger.log(`Using default app directory: ${config.appDir}`);
        }
      }

      // Create proxy for the language service
      const proxy = createLanguageServiceProxy(
        typescript,
        info.languageService,
        info,
        config,
        logger
      );

      logger.log("Plugin initialized successfully");
      return proxy;
    },
  };
}

/**
 * Creates a proxy that wraps the original language service.
 * All methods delegate to the original service except those we override.
 */
function createLanguageServiceProxy(
  typescript: typeof ts,
  languageService: ts.LanguageService,
  info: ts.server.PluginCreateInfo,
  config: ResolvedConfig,
  logger: Logger
): ts.LanguageService {
  // Create proxy object that delegates all methods to original service
  const proxy = Object.create(null) as ts.LanguageService;

  // Copy all methods from the original language service
  for (const key of Object.keys(languageService) as (keyof ts.LanguageService)[]) {
    const original = languageService[key];
    if (typeof original === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (proxy as any)[key] = (...args: unknown[]) =>
        (original as (...args: unknown[]) => unknown).apply(languageService, args);
    }
  }

  // Override getDefinitionAndBoundSpan for "Go to Definition"
  proxy.getDefinitionAndBoundSpan = (
    fileName: string,
    position: number
  ): ts.DefinitionInfoAndBoundSpan | undefined => {
    logger.info(`getDefinitionAndBoundSpan: ${fileName}:${position}`);

    try {
      // Try to handle as route string first
      const routeDefinition = getRouteDefinition(
        typescript,
        info,
        config,
        logger,
        fileName,
        position
      );

      if (routeDefinition) {
        logger.info(`Route definition found: ${routeDefinition.definitions?.[0]?.fileName}`);
        return routeDefinition;
      }
    } catch (error) {
      // Log error but don't break normal functionality
      logger.error(`Error in route detection: ${String(error)}`);
    }

    // Fall back to original behavior
    return languageService.getDefinitionAndBoundSpan(fileName, position);
  };

  return proxy;
}

/**
 * Handles Go to Definition for route strings.
 * Returns definition info pointing to the corresponding routeType.ts file.
 */
function getRouteDefinition(
  typescript: typeof ts,
  info: ts.server.PluginCreateInfo,
  config: ResolvedConfig,
  logger: Logger,
  fileName: string,
  position: number
): ts.DefinitionInfoAndBoundSpan | undefined {
  const projectPath = info.project.getCurrentDirectory();

  // Get the source file from the program
  const program = info.languageService.getProgram();
  if (!program) {
    logger.info("No program available");
    return undefined;
  }

  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    logger.info(`Source file not found: ${fileName}`);
    return undefined;
  }

  // Detect if position is on a route string in a $path() call
  const routeInfo = detectRouteString(typescript, sourceFile, position);
  if (!routeInfo) {
    logger.info(`Not a route string at position ${position}`);
    return undefined;
  }

  logger.log(`Detected route: "${routeInfo.route}" at ${fileName}:${position}`);

  // Resolve route to file path
  let resolution = resolveRouteToFile(typescript, routeInfo.route, projectPath, config);
  logger.info(`Direct resolution: ${resolution?.filePath} (exists: ${resolution?.exists})`);

  // If direct resolution failed, try with route groups
  if (!resolution?.exists) {
    logger.info("Trying route group search...");
    const groupPath = findRouteTypeWithGroups(typescript, routeInfo.route, projectPath, config);
    if (groupPath) {
      resolution = { filePath: groupPath, exists: true };
      logger.info(`Found via route groups: ${groupPath}`);
    }
  }

  if (!resolution?.exists) {
    logger.log(`Route file not found for: ${routeInfo.route}`);
    return undefined;
  }

  logger.log(`Navigating to: ${resolution.filePath}`);

  // Find the Route export position in the target file
  const targetPosition = findRouteExportPosition(typescript, program, resolution.filePath);

  // Create definition info
  const definition: ts.DefinitionInfo = {
    fileName: resolution.filePath,
    textSpan: {
      start: targetPosition,
      length: 0,
    },
    kind: typescript.ScriptElementKind.constElement,
    name: "Route",
    containerName: "",
    containerKind: typescript.ScriptElementKind.moduleElement,
  };

  return {
    definitions: [definition],
    textSpan: routeInfo.span,
  };
}

/**
 * Finds the position of the Route export declaration in the target file.
 * Returns the position of the "Route" identifier in "export const Route = ..."
 */
function findRouteExportPosition(
  typescript: typeof ts,
  program: ts.Program,
  filePath: string
): number {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    return 0;
  }

  let position = 0;

  typescript.forEachChild(sourceFile, (node) => {
    if (typescript.isVariableStatement(node)) {
      // Check for export modifier
      const hasExport = node.modifiers?.some(
        (m) => m.kind === typescript.SyntaxKind.ExportKeyword
      );

      if (hasExport) {
        for (const declaration of node.declarationList.declarations) {
          if (
            typescript.isIdentifier(declaration.name) &&
            declaration.name.text === "Route"
          ) {
            position = declaration.name.getStart(sourceFile);
          }
        }
      }
    }
  });

  return position;
}
