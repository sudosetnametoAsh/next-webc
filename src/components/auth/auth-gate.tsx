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

  const { data } = useValidateToken({
    enabled: !enrollmentRequired && isAuthenticated && inProgress === "none",
  });

  useEffect(() => {
    if (enrollmentRequired || !data) return;

    const { role } = data;

    router.replace(RoleRouter.homePath(RoleRouter.parseRoles(role)));
  }, [data, router, enrollmentRequired]);

  // This screen is public. Render it on the server and while MSAL initializes;
  // verified sessions still redirect through the effect above.
  return <>{children}</>;
}
