"use client";
import { useMsal } from "@azure/msal-react";

export default function SignOutButton() {
  const { instance } = useMsal();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      await instance.logoutRedirect();
    } catch (err) {
      console.error(err);
    }
  };


  return <button onClick={handleLogout}>Sign Out</button>;
};