import { ReactNode, useEffect } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useValidateToken } from "@/hooks/vaildate-token";

type Props = {
  children: ReactNode;
};

export default function AuthGate({ children }: Props) {
  const router = useRouter();
  const { inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const { data, isLoading } = useValidateToken({
    enabled: isAuthenticated && inProgress === "none",
  });

  console.log(data)

  useEffect(() => {
    console.log("in-use-effect")

    if (!data) return;

    const { role } = data;

    if (role.includes("Admin")) {
      router.replace("/admin");
    } else if (role.includes("Staff")) {
      router.replace("/department");
    } else if (role.includes("Student")) {
      router.replace("/student");
    } else {
      router.replace("/");
    }
  }, [data, router]);

  // While MSAL or validation is running, render nothing
  if (inProgress !== "none" || isLoading) {
    return null;
  }

  // Not authenticated → let page show login
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  console.log("in-auth-gate")


  // Authenticated → redirect handled above
  return null;
}
