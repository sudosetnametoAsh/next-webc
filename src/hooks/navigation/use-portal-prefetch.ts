"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

/** Warm the complete dynamic destination before the role menu is opened. */
export function usePortalPrefetch(href: "/clearance" | "/department/dashboard", enabled = true) {
  const router = useRouter();
  const prefetched = useRef<string | null>(null);
  const prefetch = useCallback(() => {
    if (!enabled || prefetched.current === href) return;
    prefetched.current = href;
    router.prefetch(href, {
      kind: PrefetchKind.FULL,
      onInvalidate: () => {
        if (prefetched.current === href) prefetched.current = null;
      },
    });
  }, [enabled, href, router]);

  useEffect(() => {
    if (!enabled) prefetched.current = null;
    prefetch();
  }, [enabled, prefetch]);

  return prefetch;
}
