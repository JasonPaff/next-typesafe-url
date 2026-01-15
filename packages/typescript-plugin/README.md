# next-typesafe-url-plugin

TypeScript Language Service Plugin for [next-typesafe-url](https://github.com/ethanniser/next-typesafe-url).

Enables "Go to Definition" navigation from route string literals (e.g., `"/users/[id]"`) directly to their corresponding `routeType.ts` files.

## Features

- **Go to Definition**: Ctrl/Cmd+Click on a route string in a `$path()` call to navigate to its `routeType.ts` file
- **Route Group Support**: Handles Next.js route groups like `(auth)`, `(dashboard)`, etc.
- **Auto-detection**: Automatically detects your app directory location

## Installation

```bash
npm install -D next-typesafe-url-plugin
# or
pnpm add -D next-typesafe-url-plugin
# or
yarn add -D next-typesafe-url-plugin
```

## Configuration

Add the plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "next-typesafe-url-plugin"
      }
    ]
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appDir` | string | Auto-detected | Path to Next.js app directory (relative to project root) |
| `routeTypeFileName` | string | `"routeType"` | Name of route type definition files (without extension) |
| `debug` | boolean | `false` | Enable debug logging |

Example with all options:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "next-typesafe-url-plugin",
        "appDir": "./src/app",
        "routeTypeFileName": "routeType",
        "debug": false
      }
    ]
  }
}
```

## VS Code Setup

VS Code uses its own bundled TypeScript version by default. To use the plugin, you need to configure VS Code to use the workspace TypeScript version:

1. Open VS Code settings (Cmd/Ctrl + ,)
2. Search for "typescript.tsdk"
3. Set it to `node_modules/typescript/lib`

Or add to your `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

After configuring, restart the TypeScript server:
- Press Cmd/Ctrl + Shift + P
- Type "TypeScript: Restart TS Server"
- Press Enter

## Usage

Once configured, simply Ctrl/Cmd+Click on any route string in a `$path()` call:

```typescript
import { $path } from "next-typesafe-url";

// Ctrl/Cmd+Click on "/users/[id]" navigates to src/app/users/[id]/routeType.ts
const url = $path({
  route: "/users/[id]",
  routeParams: { id: 123 },
});
```

## Supported Route Patterns

- Static routes: `/users`, `/about`
- Dynamic segments: `/users/[id]`
- Catch-all segments: `/docs/[...slug]`
- Optional catch-all: `/blog/[[...slug]]`
- Route groups: Files in `(group)` directories
- Underscore escaping: `%5F` is converted to `_`

## Troubleshooting

### Plugin not working?

1. Ensure the plugin is installed as a dev dependency
2. Verify the plugin is configured in `tsconfig.json`
3. Make sure VS Code is using the workspace TypeScript version
4. Restart the TypeScript server

### Enable debug logging

Set `"debug": true` in the plugin configuration and check the TypeScript server log:

- VS Code: Output panel → TypeScript
- Or check `.log` files in your temp directory

## License

MIT
