"use client";
import { useMsal } from "@azure/msal-react";
// import { logoutRequest } from "@/lib/msal/msal-config";

export default function SignOutButton() {
  const { instance } = useMsal();

  const handleLogout = async () => {
    // const logoutRequest = {
    //   account: instance.getActiveAccount(),
    //   postLogoutRedirectUri: "http://localhost:3000"
    // }

    try {
      await fetch("/api/validate-token", { method: "DELETE" });
      await instance.logoutRedirect();
    } catch (err) {
      console.error(err);
    }
  };

  return <button onClick={handleLogout}>Sign Out</button>;
}
