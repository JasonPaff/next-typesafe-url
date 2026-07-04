import type { ReactNode } from "react";

// static metadata on the layout- this is what the child page's
// generateMetadata receives through the `parent` argument
export const metadata = {
  title: "Metadata Examples",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
