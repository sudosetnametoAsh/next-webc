"use client";
import { useMsal } from "@azure/msal-react";
import { Button } from "../ui/button";
// import { logoutRequest } from "@/lib/msal/msal-config";

export default function SignOutButton() {
  const { instance } = useMsal();

  const handleLogout = async () => {
    // const logoutRequest = {
    //   account: instance.getActiveAccount(),
    //   postLogoutRedirectUri: "http://localhost:3000"
    // }

    try {
      await fetch("/api/session", { method: "DELETE" });
      await instance.logoutRedirect();
    } catch (err) {
      console.error(err);
    }
  };

  return <Button onClick={handleLogout}>Sign Out</Button>;
}
