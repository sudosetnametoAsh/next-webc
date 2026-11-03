"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const portalRoots = ["/admin", "/department", "/clearance"];

function isPortalPath(pathname: string | null) {
  return portalRoots.some((root) => pathname === root || pathname?.startsWith(`${root}/`));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      forcedTheme={isPortalPath(pathname) ? undefined : "light"}
    >
      {children}
    </NextThemesProvider>
  );
}
