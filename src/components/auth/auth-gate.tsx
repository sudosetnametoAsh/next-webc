"use client";
import { ReactNode, useEffect } from "react";
import { RoleRouter } from "@/modules/auth/domain/role-router";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useValidateToken } from "@/hooks/auth/vaildate-token";

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const { data, isLoading } = useValidateToken({
    enabled: isAuthenticated && inProgress === "none",
  });

  useEffect(() => {
    if (!data) return;

    const { role } = data;

    router.replace(RoleRouter.homePath(RoleRouter.parseRoles(role)));
  }, [data, router]);

  if (inProgress !== "none" || isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return null;
}
