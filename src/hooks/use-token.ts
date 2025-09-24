"use client";
import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";

export default function useToken() {
  const { instance, accounts } = useMsal();

  useEffect(() => {
    const postToken = async () => {
      try {
        if (!accounts || accounts.length === 0) return;

        // acquire token
        const result = await instance.acquireTokenSilent({
          scopes: ["api://5255649e-e023-43ef-afcb-e60ed3f9a32e/User.Read"],
          account: accounts[0],
        });

        const accessToken = result.accessToken;
        // console.log(accessToken)
        // const accessToken = "1234"

        // post to backend
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accessToken }),
        });
        
        // error handling (must fix later)
        if (!res.ok) {
          console.error("Failed to exchange token:", await res.json());
          instance.logoutRedirect();
          return
        }
      } catch (err) {
        console.error("Silent token acquisition failed:", err);
      }
    };

    postToken();
  }, [accounts, instance]);
}
