"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Theme switcher"
        aria-disabled="true"
        tabIndex={-1}
        className="pointer-events-none flex h-9 w-9 items-center justify-center rounded-lg text-portal-muted opacity-70"
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-portal-muted transition-colors hover:bg-portal-inset hover:text-portal-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-accent"
    >
      {isDark ? <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5" /> : <Moon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
    </button>
  );
}
