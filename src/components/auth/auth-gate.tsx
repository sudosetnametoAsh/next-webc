"use client";
import { ReactNode, useEffect } from "react";
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
    const roleStr = Array.isArray(role)
      ? role[0] || ""
      : typeof role === "string"
      ? role
      : "";

    if (roleStr.toLowerCase().includes("admin")) {
      router.replace("/admin/dashboard");
    } else if (
      roleStr.toLowerCase().includes("staff") ||
      roleStr.toLowerCase().includes("department")
    ) {
      router.replace("/department/dashboard");
    } else if (
      roleStr.toLowerCase().includes("student") ||
      roleStr.toLowerCase().includes("client")
    ) {
      router.replace("/student");
    } else {
      router.replace("/");
    }
  }, [data, router]);

  if (inProgress !== "none" || isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return null;
}
