// Example file for testing Go to Definition
// Ctrl/Cmd+Click on the route strings should navigate to the corresponding routeType.ts

import { $path } from "next-typesafe-url";

// Test: Go to Definition on "/[slug]" should navigate to src/app/[slug]/routeType.ts
const slugUrl = $path({
  route: "/[slug]",
  routeParams: { slug: "test" },
});

// Test: Go to Definition on "/users/[id]" should navigate to src/app/users/[id]/routeType.ts
const userUrl = $path({
  route: "/users/[id]",
  routeParams: { id: 123 },
  searchParams: { page: 1 },
});

console.log(slugUrl, userUrl);
