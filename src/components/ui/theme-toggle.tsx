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
        disabled
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 opacity-70"
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
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-amber-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
    >
      {isDark ? <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5" /> : <Moon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
    </button>
  );
}
