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

    if (role.includes("Admin")) {
      router.replace("/admin");
    } else if (role.includes("Staff")) {
      router.replace("/department/dashboard");
    } else if (role.includes("Student")) {
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