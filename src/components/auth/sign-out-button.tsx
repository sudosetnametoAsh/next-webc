"use client";
import { useMsal } from "@azure/msal-react";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const { instance } = useMsal();

  const handleLogout = async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
      await instance.logoutRedirect();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button className="cursor-pointer" onClick={handleLogout}>
      <LogOut  size={20} color="#ffffff" />
    </button>
  );
}
