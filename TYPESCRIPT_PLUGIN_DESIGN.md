# TypeScript Language Service Plugin Design Document

## next-typesafe-url TypeScript Plugin

**Document Version:** 1.0
**Date:** January 2026
**Status:** Proposed

---

## 1. Executive Summary

This document outlines the design for a TypeScript Language Service Plugin that enhances the developer experience when using the `next-typesafe-url` library. The plugin will provide intelligent navigation features, primarily "Go to Definition" functionality that allows developers to click on route string literals (e.g., `"/foo/[id]"`) and navigate directly to the corresponding `routeType.ts` file.

---

## 2. Background and Motivation

### 2.1 Current State

The `next-typesafe-url` library provides type-safe routing for Next.js applications through:

- A `$path()` function that accepts route string literals with full type inference
- `routeType.ts` files that define Zod validators for route and search parameters
- Generated type declarations that create a type-safe mapping between routes and their parameters

### 2.2 Problem Statement

Currently, when developers use the `$path()` function, they have excellent type safety but limited IDE navigation support:

- Clicking "Go to Definition" on a route string like `"/users/[id]"` does not navigate anywhere meaningful
- Developers must manually locate `routeType.ts` files in the file tree
- No quick way to see what parameters a route expects without finding the file manually
- Renaming or refactoring routes requires manual file searches

### 2.3 Goals

1. **Primary:** Enable "Go to Definition" from route strings to their `routeType.ts` files
2. **Secondary:** Provide "Find All References" for route strings across the codebase
3. **Tertiary:** Surface route parameter information via hover/quick info
4. **Future:** Support rename refactoring across route usages

---

## 3. Technical Architecture

### 3.1 Plugin Type

This will be a **TypeScript Language Service Plugin** (not a full Language Server Protocol implementation). This approach is chosen because:

- Lower complexity than a full LSP implementation
- Direct integration with TypeScript's existing infrastructure
- Works automatically in VS Code, WebStorm, Neovim (with coc.nvim), and other TypeScript-aware editors
- No separate language server process to manage
- Can leverage TypeScript's existing parsing and type information

### 3.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Editor (VS Code, etc.)                  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         TypeScript Server (tsserver)            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Language Service                        │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │          next-typesafe-url Plugin (Proxy)           │  │  │
│  │  │                                                      │  │  │
│  │  │   ┌──────────────────────────────────────────────┐  │  │  │
│  │  │   │  Route String Detection & Resolution Logic   │  │  │  │
│  │  │   └──────────────────────────────────────────────┘  │  │  │
│  │  │                       │                              │  │  │
│  │  │   ┌──────────────────────────────────────────────┐  │  │  │
│  │  │   │      Route Type File Location Cache          │  │  │  │
│  │  │   └──────────────────────────────────────────────┘  │  │  │
│  │  │                                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                           │                                │  │
│  │                           ▼                                │  │
│  │              Original Language Service                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Decorator Pattern

The plugin follows the standard TypeScript plugin decorator pattern:

1. **Initialization:** Plugin receives the `typescript` module and creates a factory
2. **Creation:** Factory's `create` function receives `PluginCreateInfo` containing the original language service
3. **Proxy Setup:** Plugin creates a proxy object that wraps all language service methods
4. **Interception:** Specific methods are overridden to add custom behavior
5. **Delegation:** Non-overridden methods pass through to the original service

### 3.4 Intercepted Methods

The following TypeScript Language Service methods will be intercepted:

| Method | Purpose | Priority |
|--------|---------|----------|
| `getDefinitionAndBoundSpan` | "Go to Definition" - navigate to routeType.ts | P0 |
| `getQuickInfoAtPosition` | Hover information showing route params | P1 |
| `findReferences` | Find all usages of a route | P2 |
| `getReferencesAtPosition` | Find references for route strings | P2 |
| `findRenameLocations` | Support route renaming | P3 |

---

## 4. Core Components

### 4.1 Route String Detector

**Responsibility:** Determine if a given position in a source file is within a route string literal that should trigger plugin behavior.

**Detection Criteria:**
1. Position is within a string literal
2. String literal is a value for the `route` property
3. Parent context is a `$path()` function call OR an object matching `PathOptions<T>`

**Detection Strategy:**
- Use TypeScript's AST to find the node at the cursor position
- Walk up the AST to find the containing call expression or object literal
- Check if the call expression references `$path` from `next-typesafe-url`
- Validate the string matches a known route pattern (starts with `/`, contains valid segments)

### 4.2 Route Type File Resolver

**Responsibility:** Map a route string to its corresponding `routeType.ts` file path.

**Resolution Algorithm:**
1. Parse the route string into segments (e.g., `/users/[id]/posts` → `["users", "[id]", "posts"]`)
2. Determine the project's app directory location (via config or convention)
3. Construct the expected file path:
   - For App Router: `{appDir}/{route-segments}/routeType.ts`
   - Handle route groups: `(group-name)` directories
   - Handle parallel routes: `@slot` directories
4. Verify the file exists
5. Return the resolved path or null if not found

**Configuration Awareness:**
- Read from `next-typesafe-url.config.ts` if present
- Fall back to Next.js conventions (`app/` or `src/app/`)
- Support custom `routeType` file name configurations

### 4.3 Route Type Cache

**Responsibility:** Maintain an efficient cache of route-to-file mappings.

**Cache Strategy:**
- Build initial cache by scanning for `routeType.ts` files on plugin initialization
- Listen for file system changes via the language service host
- Invalidate cache entries when files are added/removed/renamed
- Store both the file path and parsed route information

**Cache Structure:**
- Key: Normalized route string (e.g., `/users/[id]`)
- Value: Object containing file path, route params schema, search params schema

### 4.4 Definition Provider

**Responsibility:** Implement the `getDefinitionAndBoundSpan` override to provide navigation.

**Behavior:**
1. Call Route String Detector to check if position is relevant
2. If not a route string, delegate to original language service
3. If a route string:
   - Extract the route value
   - Use Route Type File Resolver to find the target file
   - If file exists, return a definition pointing to:
     - File: The `routeType.ts` file path
     - Position: The `Route` export declaration (or file start)
   - If file doesn't exist, delegate to original service (allows normal string behavior)

**Span Behavior:**
- The `boundSpan` should encompass the entire route string literal (including quotes)
- This ensures the full route is highlighted when navigating

### 4.5 Quick Info Provider

**Responsibility:** Show helpful hover information for route strings.

**Displayed Information:**
- Route path with parameter types
- Search params schema (if defined)
- Route params schema (if defined)
- Link to documentation

---

## 5. Configuration

### 5.1 tsconfig.json Configuration

Users enable the plugin via their `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "next-typesafe-url-plugin",
        "appDir": "./src/app",
        "routeTypeFileName": "routeType.ts"
      }
    ]
  }
}
```

### 5.2 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appDir` | string | Auto-detected | Path to Next.js app directory |
| `pagesDir` | string | Auto-detected | Path to Next.js pages directory |
| `routeTypeFileName` | string | `"routeType.ts"` | Name of route type definition files |
| `enableHoverInfo` | boolean | `true` | Show parameter info on hover |
| `enableGoToDefinition` | boolean | `true` | Enable Go to Definition |
| `enableFindReferences` | boolean | `true` | Enable Find All References |

### 5.3 Configuration Resolution

Priority order for configuration:

1. Plugin options in `tsconfig.json`
2. `next-typesafe-url.config.ts` file
3. Auto-detection based on project structure

---

## 6. VS Code Extension Integration

### 6.1 Optional VS Code Extension

While the TypeScript plugin works standalone, a companion VS Code extension can provide:

- Automatic plugin configuration
- Status bar indicator showing plugin status
- Commands for regenerating route types
- Route tree explorer view

### 6.2 Extension package.json Configuration

The extension would declare the TypeScript plugin via:

```json
{
  "contributes": {
    "typescriptServerPlugins": [
      {
        "name": "next-typesafe-url-plugin",
        "enableForWorkspaceTypeScriptVersions": true
      }
    ]
  }
}
```

### 6.3 Standalone Usage

For non-VS Code editors or users who prefer manual setup:

1. Install the plugin package as a dev dependency
2. Add plugin configuration to `tsconfig.json`
3. Restart the TypeScript language server

---

## 7. Package Structure

### 7.1 New Package Location

```
packages/
├── next-typesafe-url/           # Existing core package
├── typescript-plugin/           # NEW: TypeScript plugin
│   ├── src/
│   │   ├── index.ts            # Plugin entry point (init function)
│   │   ├── plugin.ts           # Main plugin logic (create function)
│   │   ├── detector.ts         # Route string detection
│   │   ├── resolver.ts         # Route-to-file resolution
│   │   ├── cache.ts            # Route cache management
│   │   ├── providers/
│   │   │   ├── definition.ts   # Go to Definition provider
│   │   │   ├── quickinfo.ts    # Hover info provider
│   │   │   ├── references.ts   # Find references provider
│   │   │   └── rename.ts       # Rename provider (future)
│   │   ├── config.ts           # Configuration handling
│   │   └── utils.ts            # Shared utilities
│   ├── test/
│   │   ├── detector.test.ts
│   │   ├── resolver.test.ts
│   │   └── integration/
│   │       └── plugin.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── vscode-extension/            # OPTIONAL: VS Code extension
    ├── src/
    │   └── extension.ts
    ├── package.json
    └── README.md
```

### 7.2 Package Dependencies

**typescript-plugin package:**
- `typescript` (peer dependency) - Must match user's TypeScript version
- No runtime dependencies (plugin runs in tsserver context)

**Dev dependencies:**
- `vitest` - Testing
- `typescript` - For development and testing

### 7.3 Build Output

The plugin must be CommonJS format (not ESM) because tsserver loads plugins via `require()`. Build configuration should:

- Output to `dist/index.js` as CommonJS
- Include source maps for debugging
- Bundle all source files into a single output (no external dependencies)

---

## 8. Implementation Phases

### Phase 1: Foundation (MVP)

**Scope:**
- Basic plugin structure with decorator pattern
- Route string detection in `$path()` calls
- Go to Definition implementation
- Manual testing setup

**Success Criteria:**
- Clicking "Go to Definition" on a route string navigates to the correct `routeType.ts` file
- Plugin loads without errors in VS Code
- Works with both app router routes

### Phase 2: Enhanced Navigation

**Scope:**
- Hover information showing route parameters
- Find All References implementation
- Caching for better performance
- Support for pages router

**Success Criteria:**
- Hover shows parameter types for routes
- "Find All References" lists all usages of a route
- No perceptible delay when using features

### Phase 3: Advanced Features

**Scope:**
- Rename refactoring support
- VS Code extension with tree view
- Diagnostic warnings for invalid routes
- Auto-completion enhancements

**Success Criteria:**
- Can rename a route and have all usages updated
- VS Code extension provides helpful UI
- Invalid routes are highlighted

---

## 9. Testing Strategy

### 9.1 Unit Tests

- Route string detection accuracy
- Route-to-file path resolution
- Cache invalidation behavior
- Configuration parsing

### 9.2 Integration Tests

- Full plugin lifecycle (init → create → intercept)
- Go to Definition returns correct locations
- Multiple files with route usages
- Edge cases (missing files, malformed routes)

### 9.3 Manual Testing

- VS Code with workspace TypeScript version
- WebStorm integration
- Neovim with coc-tsserver
- Various project structures (monorepo, simple, custom config)

### 9.4 Test Fixtures

Create a test fixture project structure:
```
fixtures/
├── basic-app/
│   ├── app/
│   │   ├── users/
│   │   │   └── [id]/
│   │   │       └── routeType.ts
│   │   └── posts/
│   │       └── routeType.ts
│   ├── src/
│   │   └── example.ts          # Contains $path() calls
│   └── tsconfig.json
└── pages-router/
    └── ...
```

---

## 10. Performance Considerations

### 10.1 Startup Performance

- Lazy initialization: Don't scan for route files until first relevant request
- Background indexing: Build cache asynchronously after initial requests
- Minimal memory footprint: Only cache necessary information

### 10.2 Runtime Performance

- Cache all route resolutions
- Use efficient AST traversal (stop early when possible)
- Batch file system operations
- Profile and optimize hot paths

### 10.3 Memory Management

- Limit cache size for very large projects
- Clear stale cache entries
- Use weak references where appropriate

---

## 11. Error Handling

### 11.1 Graceful Degradation

The plugin should never break normal TypeScript functionality:

- If route detection fails, delegate to original service
- If file resolution fails, return no definition (normal string behavior)
- Log errors for debugging but don't throw

### 11.2 Logging

Use TypeScript's built-in logging via `info.project.projectService.logger`:

- Log plugin initialization
- Log cache operations (in verbose mode)
- Log errors with context

### 11.3 User Feedback

- Clear error messages in logs
- Potential: Diagnostic messages for common issues
- Documentation for troubleshooting

---

## 12. Security Considerations

### 12.1 File System Access

- Only read files, never write
- Validate file paths before reading
- Stay within project boundaries

### 12.2 Code Execution

- Plugin runs in tsserver's sandbox
- No external network calls
- No execution of user code

---

## 13. Distribution

### 13.1 npm Package

Package name options:
- `next-typesafe-url-plugin` (preferred, clear association)
- `@next-typesafe-url/typescript-plugin` (scoped, if using org)

### 13.2 Documentation

- README with quick start guide
- Configuration reference
- Troubleshooting guide
- Integration guides for different editors

### 13.3 Versioning

- Follow semver
- Align major versions with main `next-typesafe-url` package
- Test against multiple TypeScript versions (4.7+, 5.x)

---

## 14. Future Enhancements

### 14.1 Potential Features

1. **Route Validation Diagnostics:** Show errors for routes that don't match any `routeType.ts`
2. **Code Actions:** "Create routeType.ts" quick fix for undefined routes
3. **Route Completions:** Enhanced auto-complete for route strings
4. **Parameter Completions:** Auto-complete for routeParams and searchParams keys
5. **Refactoring:** Rename route segment and update all usages
6. **Route Graph:** VS Code view showing route hierarchy

### 14.2 Integration Opportunities

- Next.js dev server integration for live route validation
- ESLint plugin companion for build-time checks
- Webpack/Turbopack plugin for route manifest generation

---

## 15. References

### Documentation Sources

- [Microsoft TypeScript Wiki - Writing a Language Service Plugin](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)
- [Microsoft TypeScript Wiki - Using the Language Service API](https://github.com/microsoft/TypeScript/wiki/Using-the-Language-Service-API)
- [TypeScript TSServer Plugin Template](https://github.com/orta/TypeScript-TSServer-Plugin-Template)
- [TypeScript tsconfig plugins option](https://www.typescriptlang.org/tsconfig/plugins.html)

### Reference Implementations

- [Svelte TypeScript Plugin](https://github.com/sveltejs/language-tools/tree/master/packages/typescript-plugin)
- [Vue TypeScript Plugin](https://github.com/vuejs/language-tools/tree/master/packages/typescript-plugin)
- [Astro TypeScript Plugin](https://github.com/withastro/language-tools/blob/main/packages/ts-plugin)
- [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)
- [typescript-styled-plugin](https://github.com/styled-components/typescript-styled-plugin)

### VS Code Extension Integration

- [VS Code typescriptServerPlugins contribution point](https://code.visualstudio.com/api/references/contribution-points#contributes.typescriptServerPlugins)
- [TypeScript Language Service Plugins Blog Series](https://blogs.vijayakrishna.dev/blog/typescript-plugin-par1/)

---

## 16. Appendix

### A. TypeScript Language Service Methods Reference

Key methods available for interception:

| Method | Description |
|--------|-------------|
| `getDefinitionAtPosition` | Returns definition locations |
| `getDefinitionAndBoundSpan` | Returns definitions with source span |
| `getTypeDefinitionAtPosition` | Returns type definition locations |
| `getImplementationAtPosition` | Returns implementation locations |
| `findReferences` | Returns all references to a symbol |
| `getReferencesAtPosition` | Returns references at position |
| `findRenameLocations` | Returns locations for rename |
| `getQuickInfoAtPosition` | Returns hover information |
| `getCompletionsAtPosition` | Returns completion items |
| `getCompletionEntryDetails` | Returns details for completion item |
| `getSignatureHelpItems` | Returns signature help |
| `getDocumentHighlights` | Returns highlights for symbol |

### B. Route String Pattern Reference

Valid route patterns the plugin should recognize:

| Pattern | Example | Description |
|---------|---------|-------------|
| Static segment | `/users` | Literal path segment |
| Dynamic segment | `/users/[id]` | Single parameter |
| Catch-all | `/docs/[...slug]` | Multiple parameters |
| Optional catch-all | `/docs/[[...slug]]` | Optional multiple |
| Route group | `/(auth)/login` | Grouping without URL |
| Parallel route | `/@modal/login` | Named slot |
| Intercepted route | `/(.)photo/[id]` | Modal interception |

### C. Glossary

- **Language Service Plugin:** A TypeScript extension that augments editor features
- **tsserver:** TypeScript's language server process
- **Decorator Pattern:** Design pattern where a wrapper adds behavior to an object
- **routeType.ts:** Convention for route parameter definition files in next-typesafe-url
- **AST:** Abstract Syntax Tree - parsed representation of source code
