import type ts from "typescript/lib/tsserverlibrary";
import type { RouteStringInfo } from "./types";

/**
 * Detects if the position is within a route string literal in a $path() call.
 *
 * Detection criteria:
 * 1. Position is within a string literal
 * 2. String literal is the value of a "route" property
 * 3. Parent context is a $path() function call
 * 4. String starts with "/" (valid route format)
 */
export function detectRouteString(
  typescript: typeof ts,
  sourceFile: ts.SourceFile,
  position: number
): RouteStringInfo | null {
  // Find the token at the position
  const token = findTokenAtPosition(typescript, sourceFile, position);
  if (!token) {
    return null;
  }

  // Check if token is a string literal
  if (!typescript.isStringLiteral(token)) {
    return null;
  }

  // Check if this string is the value of a "route" property
  if (!isRoutePropertyValue(typescript, token)) {
    return null;
  }

  // Check if the parent context is a $path() call
  if (!isWithinPathCall(typescript, token)) {
    return null;
  }

  // Validate the route string format (must start with /)
  const routeValue = token.text;
  if (!routeValue.startsWith("/")) {
    return null;
  }

  return {
    route: routeValue,
    start: token.getStart(sourceFile),
    end: token.getEnd(),
    span: {
      start: token.getStart(sourceFile),
      length: token.getEnd() - token.getStart(sourceFile),
    },
  };
}

/**
 * Finds the innermost token at the given position using AST traversal.
 */
function findTokenAtPosition(
  typescript: typeof ts,
  sourceFile: ts.SourceFile,
  position: number
): ts.Node | undefined {
  function find(node: ts.Node): ts.Node | undefined {
    if (position >= node.getStart(sourceFile) && position < node.getEnd()) {
      // Check children first to find the innermost node
      const childResult = typescript.forEachChild(node, find);
      return childResult || node;
    }
    return undefined;
  }
  return find(sourceFile);
}

/**
 * Checks if the string literal is the value of a "route" property.
 */
function isRoutePropertyValue(typescript: typeof ts, node: ts.StringLiteral): boolean {
  const parent = node.parent;

  // Check if parent is a PropertyAssignment with name "route"
  if (typescript.isPropertyAssignment(parent)) {
    const propertyName = parent.name;
    if (typescript.isIdentifier(propertyName) && propertyName.text === "route") {
      return true;
    }
  }

  // Also check for shorthand property (though unlikely for route)
  if (typescript.isShorthandPropertyAssignment(parent)) {
    if (parent.name.text === "route") {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the node is within a $path() function call by walking up the AST.
 */
function isWithinPathCall(typescript: typeof ts, node: ts.Node): boolean {
  let current: ts.Node | undefined = node;

  while (current) {
    if (typescript.isCallExpression(current)) {
      const expression = current.expression;

      // Check for direct $path call: $path({ ... })
      if (typescript.isIdentifier(expression) && expression.text === "$path") {
        return true;
      }

      // Check for qualified access: module.$path({ ... })
      if (typescript.isPropertyAccessExpression(expression)) {
        if (expression.name.text === "$path") {
          return true;
        }
      }
    }
    current = current.parent;
  }

  return false;
}
