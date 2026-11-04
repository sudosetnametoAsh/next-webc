"use client";
import { ReactNode, useEffect } from "react";
import { RoleRouter } from "@/modules/auth/domain/role-router";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useValidateToken } from "@/hooks/auth/vaildate-token";

export default function AuthGate({ children, enrollmentRequired = false }: { children: ReactNode; enrollmentRequired?: boolean }) {
  const router = useRouter();
  const { inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const { data, isLoading } = useValidateToken({
    enabled: !enrollmentRequired && isAuthenticated && inProgress === "none",
  });

  useEffect(() => {
    if (enrollmentRequired || !data) return;

    const { role } = data;

    router.replace(RoleRouter.homePath(RoleRouter.parseRoles(role)));
  }, [data, router, enrollmentRequired]);

  if (enrollmentRequired) return <>{children}</>;

  if (inProgress !== "none" || isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return null;
}
