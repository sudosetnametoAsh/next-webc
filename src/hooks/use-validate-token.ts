import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function useValidateToken() {
  const { instance, accounts } = useMsal();
  const router = useRouter();

  useEffect(() => {

    const postToken = async () => {
      console.log("Validating token...");

      try {
        // Attempt to acquire the token silently
        const result = await instance.acquireTokenSilent({
          scopes: ["api://5255649e-e023-43ef-afcb-e60ed3f9a32e/User.Read"],
          account: accounts[0],
        });

        // Send the token to the backend for validation
        const res = await fetch("/api/validate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accessToken: result.accessToken }),
        });

        if (!res.ok) {
          console.error("Failed to exchange token:", await res.json());
          instance.logoutRedirect(); // Logout if token validation fails
          return;
        }

        // Token is valid, now determine the user role and redirect accordingly
        const { role } = await res.json();
        console.log(result.accessToken);

        if (role.includes("Admin")) {
          router.replace("/admin");
        } else if (role.includes("Staff")) {
          router.replace("/department");
        } else if (role.includes("Student")) {
          router.replace("/student");
        } else {
          router.replace("/");
        }
      } catch (err) {
        console.error("Token acquisition failed:", err);
      }
    };

    postToken();
  }, [accounts, instance, router]);
}
